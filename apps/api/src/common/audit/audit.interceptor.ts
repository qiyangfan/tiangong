import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { type Observable, tap } from 'rxjs';
import { getRequestId, getRequestContext } from '../request-context';
import { AuditService } from './audit.service';
import { AUDIT_METADATA, type AuditOptions } from './audit.decorator';

const MAX_PARAM_LENGTH = 3800;
const MAX_RESULT_LENGTH = 2000;
const SENSITIVE_KEY = /password|token|secret/i;

interface AuditWriteInput {
  options: AuditOptions;
  req: Request;
  methodName: string;
  startedAt: number;
  status: 'ok' | 'error';
  data: unknown;
  err: (Error & { code?: string }) | null;
}

/** 审计序列化：敏感字段置为 [MASKED]，超长截断。 */
function serialize(value: unknown, limit: number): string | null {
  try {
    const masked: unknown = JSON.stringify(value, (key: string, item: unknown) =>
      SENSITIVE_KEY.test(key) ? '[MASKED]' : item,
    );
    if (typeof masked !== 'string') {
      return null;
    }
    return masked.length > limit ? `${masked.slice(0, limit)}…` : masked;
  } catch {
    return null;
  }
}

/** 写操作审计拦截器：仅处理带 @Audit 元数据的路由。 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditOptions | undefined>(
      AUDIT_METADATA,
      context.getHandler(),
    );
    if (!options) {
      return next.handle();
    }
    const http = context.switchToHttp();
    const writeInput = {
      options,
      req: http.getRequest<Request>(),
      methodName: `${context.getClass().name}.${context.getHandler().name}`,
      startedAt: Date.now(),
    };

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.write({ ...writeInput, status: 'ok', data, err: null });
        },
        error: (err: Error & { code?: string }) => {
          this.write({ ...writeInput, status: 'error', data: null, err });
        },
      }),
    );
  }

  private write(input: AuditWriteInput): void {
    const { options, req, methodName, startedAt, status, data, err } = input;
    const ctx = getRequestContext();
    const body: unknown = req.body;
    const query: unknown = req.query;
    this.audit.recordOper({
      title: options.title,
      businessType: options.businessType,
      method: methodName,
      requestMethod: req.method,
      requestPath: req.originalUrl.split('?')[0] ?? req.path,
      userId: ctx?.userId ?? null,
      username: ctx?.username ?? 'anonymous',
      client: ctx?.client ?? '-',
      ip: req.ip ?? '',
      params: serialize({ body, query }, MAX_PARAM_LENGTH),
      result: status === 'ok' ? serialize(data, MAX_RESULT_LENGTH) : null,
      status,
      errorMsg: err ? `${err.code ?? 'INTERNAL_ERROR'}: ${err.message}`.slice(0, 2000) : null,
      costMs: Date.now() - startedAt,
      requestId: getRequestId(),
    });
  }
}
