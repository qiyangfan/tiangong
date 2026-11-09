# 基础运行指标 — ADDED

## ADDED Requirements

### Requirement: 基础运行指标

系统 SHALL 暴露 Prometheus 文本格式的指标端点（`GET /api/v1/metrics`），包含 Node 进程默认
指标（CPU/内存/GC/事件循环）与 HTTP 请求指标（次数按 method/route/状态码、耗时直方图）；
route 标签 SHALL 只使用路由模板，不携带查询串与路径参数实际值；端点 SHALL 可通过
`METRICS_ENABLED=false` 关闭。

#### Scenario: 指标端点公开可达

- **WHEN** 未认证请求 `GET /api/v1/metrics`
- **THEN** 返回 200 与 text/plain 的 Prometheus 暴露文本，含进程指标与 `http_requests_total`
  指标族。

#### Scenario: 标签基数可控

- **WHEN** 携带任意查询串请求 API 后抓取指标
- **THEN** 指标文本不含查询串内容，route 标签为路由模板（未匹配路由记为 unmatched）。

#### Scenario: 端点可关闭

- **GIVEN** `METRICS_ENABLED=false`
- **WHEN** 请求 `GET /api/v1/metrics`
- **THEN** 返回 404，且不再记录 HTTP 请求指标。
