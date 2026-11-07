import { SUCCESS_CODE } from '@tiangong/contracts';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { type Observable, map } from 'rxjs';

/**
 * 成功响应统一包装为 { code: 0, data }（API_CONTRACT）。
 * 探针与文档路径直接透传原始结构。
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const passthrough =
      req.path.startsWith('/api/v1/health') ||
      req.path.startsWith('/health') ||
      res.statusCode >= 400;
    if (passthrough) {
      return next.handle();
    }
    return next.handle().pipe(map((data) => ({ code: SUCCESS_CODE, data: data ?? null })));
  }
}
