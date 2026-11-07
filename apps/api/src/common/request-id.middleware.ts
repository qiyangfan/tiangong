import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { requestContextStorage } from './request-context';

/** 请求 id 中间件：沿用上游 X-Request-Id 或生成 uuid，写入响应头并挂入 AsyncLocalStorage。 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.length <= 64 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  requestContextStorage.run({ requestId }, () => next());
}
