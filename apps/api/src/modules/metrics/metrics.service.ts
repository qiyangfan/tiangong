import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Request, type Response } from 'express';
import { Counter, Histogram, collectDefaultMetrics, Registry } from 'prom-client';

/**
 * 基础运行指标（FUNCTION_MATRIX P0「系统基础运行指标」的 metrics 部分）：
 * 单例 Registry 承载 Node 进程默认指标（CPU/内存/GC/事件循环）与 HTTP RED 指标。
 * route 标签只取路由模板（如 /api/v1/users/:id），查询串与路径参数实际值永不入标签，
 * 避免标签基数爆炸与敏感信息经指标泄露。
 */
@Injectable()
export class MetricsService {
  readonly enabled: boolean;
  private readonly registry = new Registry();
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;

  constructor(config: ConfigService) {
    this.enabled = config.get<boolean>('METRICS_ENABLED') ?? true;
    // prom-client v15 的采集器无公开 stop API；定时器随进程生命周期结束，与生产部署语义一致
    collectDefaultMetrics({ register: this.registry });
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests by method, route template and status code.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds by method and route template.',
      labelNames: ['method', 'route'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
  }

  /** 记录一次已完成请求：res finish 后调用，耗时按单调时钟计算。 */
  observeRequest(req: Request, res: Response, startedAtNanos: bigint): void {
    const route =
      typeof req.route?.path === 'string' ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    const labels = { method: req.method, route };
    this.httpRequestsTotal.inc({ ...labels, status_code: String(res.statusCode) });
    this.httpRequestDuration.observe(
      labels,
      Number(process.hrtime.bigint() - startedAtNanos) / 1e9,
    );
  }

  /** 渲染 Prometheus 文本暴露格式及其 Content-Type。 */
  async render(): Promise<{ text: string; contentType: string }> {
    return { text: await this.registry.metrics(), contentType: this.registry.contentType };
  }
}
