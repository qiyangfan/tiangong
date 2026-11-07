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

/** 审计序列化：敏感字段置为 [MASKED]，超长截断。 */
function serialize(value: unknown, limit: number): string | null {
  try {
    const masked = JSON.stringify(value, (k, v) => (SENSITIVE_KEY.test(k) ? '[MASKED]' : v));
    if (masked === undefined) {
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
    const req = http.getRequest<Request>();
    const startedAt = Date.now();
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.write(options, req, className, handlerName, startedAt, 'ok', data, null);
        },
        error: (err: Error & { code?: string }) => {
          this.write(options, req, className, handlerName, startedAt, 'error', null, err);
        },
      }),
    );
  }

  private write(
    options: AuditOptions,
    req: Request,
    className: string,
    handlerName: string,
    startedAt: number,
    status: 'ok' | 'error',
    data: unknown,
    err: (Error & { code?: string }) | null,
  ): void {
    const ctx = getRequestContext();
    this.audit.recordOper({
      title: options.title,
      businessType: options.businessType,
      method: `${className}.${handlerName}`,
      requestMethod: req.method,
      requestPath: req.originalUrl.split('?')[0] ?? req.path,
      userId: ctx?.userId ?? null,
      username: ctx?.username ?? 'anonymous',
      client: ctx?.client ?? '-',
      ip: req.ip ?? '',
      params: serialize({ body: req.body, query: req.query }, MAX_PARAM_LENGTH),
      result: status === 'ok' ? serialize(data, MAX_RESULT_LENGTH) : null,
      status,
      errorMsg: err ? `${err.code ?? 'INTERNAL_ERROR'}: ${err.message}`.slice(0, 2000) : null,
      costMs: Date.now() - startedAt,
      requestId: getRequestId(),
    });
  }
}
