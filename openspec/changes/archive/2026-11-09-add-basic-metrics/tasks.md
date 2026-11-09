# 任务清单：add-basic-metrics

- [x] 1. `MetricsModule`：`MetricsService`（单例 Registry + prom-client 默认指标 +
      `http_requests_total`/`http_request_duration_seconds`，route 标签仅路由模板）、
      `HttpMetricsMiddleware`（res finish 记录，disabled 短路）、`MetricsController`
      （@Public 文本端点，disabled 404）
- [x] 2. 接线：AppModule 实现 `NestModule`（`forRoutes('*')`）、EnvelopeInterceptor 透传
      `/api/v1/metrics`、pino autoLogging 忽略该前缀；`METRICS_ENABLED` env 契约
      （字面 true/false，不用 coerce.boolean 以免 `'false'` 误判为 true）+ `.env.example`
- [x] 3. 集成测试 2 例：未认证公开可达（Prometheus 文本含进程与 HTTP 指标族，不套 envelope）；
      查询串不入指标标签
- [x] 4. 门禁：`pnpm lint` 0 / typecheck 4 包 / 单测 72 / 集成 28 / build / e2e 5 全绿
- [x] 5. 文档：API_CONTRACT 运维端点行、DELIVERY_REPORT 验证记录、BUILD_PLAN §7.1 在途标注、
      FUNCTION_MATRIX 补「登录人机验证」取舍行（X，消除矩阵悬案）
