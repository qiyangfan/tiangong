import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';
import { MetricsService } from './metrics.service';

/** HTTP 指标中间件：挂在路由匹配层，res finish 时按路由模板记录，天然覆盖 404 与异常短路路径。 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.metrics.enabled) {
      next();
      return;
    }
    const startedAtNanos = process.hrtime.bigint();
    res.on('finish', () => this.metrics.observeRequest(req, res, startedAtNanos));
    next();
  }
}
