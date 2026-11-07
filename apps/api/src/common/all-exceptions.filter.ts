import { errorMeta, type ApiError } from '@tiangong/contracts';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { AppError } from './app-error';
import { getRequestId } from './request-context';

interface PrismaLikeError {
  code?: string;
  message?: string;
}

/** HTTP 状态 → 契约错误码（未知状态回落 INTERNAL_ERROR）。 */
function statusToCode(status: number): string {
  if (status === HttpStatus.BAD_REQUEST) {
    return 'VALIDATION_ERROR';
  }
  if (status === HttpStatus.UNAUTHORIZED) {
    return 'AUTH_UNAUTHENTICATED';
  }
  if (status === HttpStatus.FORBIDDEN) {
    return 'AUTH_FORBIDDEN';
  }
  if (status === HttpStatus.NOT_FOUND) {
    return 'NOT_FOUND';
  }
  if (status === HttpStatus.CONFLICT) {
    return 'CONFLICT';
  }
  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return 'AUTH_RATE_LIMITED';
  }
  return 'INTERNAL_ERROR';
}

/** 把任意异常映射为契约错误 envelope：{ code, message, data: null, requestId } + 正确 HTTP 状态码。 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{
      status: (code: number) => void;
      json: (body: ApiError) => void;
    }>();
    const requestId = getRequestId();

    const { status, code, message } = this.classify(exception);
    if (status >= 500) {
      this.logger.error(
        `requestId=${requestId} code=${code} message=${String((exception as Error)?.message ?? exception)}`,
        (exception as Error)?.stack,
      );
    }
    res.status(status);
    res.json({ code, message, data: null, requestId });
  }

  private classify(exception: unknown): { status: number; code: string; message: string } {
    if (exception instanceof AppError) {
      const meta = errorMeta(exception.code);
      return { status: meta.status, code: exception.code, message: exception.message };
    }
    if (exception instanceof ZodError) {
      const meta = errorMeta('VALIDATION_ERROR');
      const detail = exception.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      return {
        status: meta.status,
        code: 'VALIDATION_ERROR',
        message: `${meta.message}: ${detail}`,
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const code = statusToCode(status);
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      const text = Array.isArray(message) ? message.join('; ') : String(message);
      return { status, code, message: text };
    }
    // multer 的 fileSize 截断错误（FileInterceptor limits）→ 契约 413
    if ((exception as { code?: string })?.code === 'LIMIT_FILE_SIZE') {
      const meta = errorMeta('FILE_TOO_LARGE');
      return { status: meta.status, code: 'FILE_TOO_LARGE', message: meta.message };
    }
    const prisma = exception as PrismaLikeError;
    if (prisma?.code === 'P2002') {
      const meta = errorMeta('CONFLICT');
      return { status: meta.status, code: 'CONFLICT', message: meta.message };
    }
    if (prisma?.code === 'P2025') {
      const meta = errorMeta('NOT_FOUND');
      return { status: meta.status, code: 'NOT_FOUND', message: meta.message };
    }
    const meta = errorMeta('INTERNAL_ERROR');
    return { status: meta.status, code: 'INTERNAL_ERROR', message: meta.message };
  }
}
