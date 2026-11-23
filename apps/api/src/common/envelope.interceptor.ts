import { SUCCESS_CODE } from '@tiangong/contracts';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request, type Response } from 'express';
import { type Observable, map } from 'rxjs';
import { SKIP_ENVELOPE_METADATA } from './skip-envelope.decorator';

/**
 * 成功响应统一包装为 { code: 0, data }（API_CONTRACT）。
 * 探针、指标、文档路径与显式 @SkipEnvelope 路由直接透传原始结构。
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const skip = this.reflector.getAllAndOverride<boolean | undefined>(SKIP_ENVELOPE_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    const passthrough =
      skip === true ||
      req.path.startsWith('/api/v1/health') ||
      req.path.startsWith('/api/v1/metrics') ||
      req.path.startsWith('/health') ||
      res.statusCode >= 400;
    if (passthrough) {
      return next.handle();
    }
    return next.handle().pipe(map((data: unknown) => ({ code: SUCCESS_CODE, data: data ?? null })));
  }
}
