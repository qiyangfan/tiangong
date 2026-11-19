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

interface ErrorEnvelope {
  status: number;
  code: string;
  message: string;
}

const STATUS_CODE_MAP: ReadonlyMap<number, string> = new Map([
  [HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR'],
  [HttpStatus.UNAUTHORIZED, 'AUTH_UNAUTHENTICATED'],
  [HttpStatus.FORBIDDEN, 'AUTH_FORBIDDEN'],
  [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
  [HttpStatus.CONFLICT, 'CONFLICT'],
  [HttpStatus.TOO_MANY_REQUESTS, 'AUTH_RATE_LIMITED'],
]);

/** HTTP 状态 → 契约错误码（未知状态回落 INTERNAL_ERROR）。 */
function statusToCode(status: number): string {
  return STATUS_CODE_MAP.get(status) ?? 'INTERNAL_ERROR';
}

function classifyAppError(exception: unknown): ErrorEnvelope | null {
  if (!(exception instanceof AppError)) {
    return null;
  }
  const meta = errorMeta(exception.code);
  return { status: meta.status, code: exception.code, message: exception.message };
}

function classifyZodError(exception: unknown): ErrorEnvelope | null {
  if (!(exception instanceof ZodError)) {
    return null;
  }
  const meta = errorMeta('VALIDATION_ERROR');
  const detail = exception.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return { status: meta.status, code: 'VALIDATION_ERROR', message: `${meta.message}: ${detail}` };
}

function httpMessageText(body: unknown, fallback: string): string {
  const message =
    typeof body === 'string'
      ? body
      : ((body as { message?: string | string[] }).message ?? fallback);
  return Array.isArray(message) ? message.join('; ') : message;
}

function classifyHttpException(exception: unknown): ErrorEnvelope | null {
  if (!(exception instanceof HttpException)) {
    return null;
  }
  const status = exception.getStatus();
  return {
    status,
    code: statusToCode(status),
    message: httpMessageText(exception.getResponse(), exception.message),
  };
}

function classifyFileSizeError(exception: unknown): ErrorEnvelope | null {
  if ((exception as { code?: string } | null)?.code !== 'LIMIT_FILE_SIZE') {
    return null;
  }
  const meta = errorMeta('FILE_TOO_LARGE');
  return { status: meta.status, code: 'FILE_TOO_LARGE', message: meta.message };
}

function classifyPrismaError(exception: unknown): ErrorEnvelope | null {
  const prisma = exception as PrismaLikeError | null;
  const codeByPrismaCode: Readonly<Record<string, string>> = {
    P2002: 'CONFLICT',
    P2025: 'NOT_FOUND',
  };
  const code = prisma?.code === undefined ? undefined : codeByPrismaCode[prisma.code];
  if (!code) {
    return null;
  }
  const meta = errorMeta(code);
  return { status: meta.status, code, message: meta.message };
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
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      const errorStack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`requestId=${requestId} code=${code} message=${errorMessage}`, errorStack);
    }
    res.status(status);
    res.json({ code, message, data: null, requestId });
  }

  private classify(exception: unknown): ErrorEnvelope {
    return (
      classifyAppError(exception) ??
      classifyZodError(exception) ??
      classifyHttpException(exception) ??
      classifyFileSizeError(exception) ??
      classifyPrismaError(exception) ??
      (() => {
        const meta = errorMeta('INTERNAL_ERROR');
        return { status: meta.status, code: 'INTERNAL_ERROR', message: meta.message };
      })()
    );
  }
}
