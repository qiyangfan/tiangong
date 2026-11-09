# 变更提案：基础运行指标端点（add-basic-metrics）

## 为什么变

1. **P0 字面缺口**：`docs/requirements/FUNCTION_MATRIX.md`「系统基础运行指标」行（P0）要求
   `/health/live`、`/health/ready`、结构化错误及**基础 metrics**；当前仅有探针与结构化日志，
   无任何指标端点，是全仓唯一 P0 字面未达标项。
2. **可观测性只有事后文本**：审计/日志是逐请求文本，无聚合面；进程健康（CPU/内存/GC/事件
   循环）与流量面（请求数/耗时/状态分布）没有机器可读出口，接标准监控系统无入口。

## 范围与定级

- `GET /api/v1/metrics`：Prometheus 文本暴露格式（prom-client 15，Node 生态事实标准，等价
  Spring Boot Actuator/Micrometer 的角色）：进程默认指标 + HTTP RED 指标。**P0 契约补口**。
- 方案取舍：否决手写 JSON 指标端点——非标准格式无法被 Prometheus 直接抓取，GC/事件循环
  指标需手拼 `perf_hooks` 易错，自维护计数器在异常短路路径漏计；prom-client 即最小结构解。
- HTTP 指标挂载于路由匹配层中间件（AppModule `configure` + `forRoutes('*')`），在 `res`
  finish 时记录，天然覆盖 404 与异常短路路径；route 标签只取路由模板，查询串与路径参数
  实际值不入标签（防标签基数爆炸与敏感信息经指标泄露）。
- `METRICS_ENABLED`（默认 `true`）：`false` 时端点 404 且不再记录 HTTP 指标，作为生产无法
  在网关层限制抓取来源时的代码级关断开关。
- prom-client v15 的默认指标采集器无公开 stop API，采集定时器随进程生命周期结束，与生产
  部署及集成测试的实际退出语义一致（已实测不阻塞 vitest 退出）。

## 契约与安全影响

- **新增公开只读端点**：与 `/docs`（Swagger 公开）同一先例；指标含路由模板但不含任何业务
  数据、查询串或用户标识；生产建议在网关层限制抓取来源，无法限制时置 `false` 关闭。
- **零既有行为变更**：纯增量——envelope 透传路径白名单追加 `/api/v1/metrics`，pino 自动
  日志忽略该前缀（与 health 同口径），其余代码零触碰。
- 无 DB schema、DTO、错误码变更；`pnpm-lock.yaml` 新增 prom-client 一个运行时依赖。
