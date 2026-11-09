# 通用 API 与平台运行 — Implemented baseline specification

> 已实现并通过验收（Stage 2-6，2026-11-07；基础运行指标补口 2026-11-09）：验收证据见 docs/quality/DELIVERY_REPORT.md 与测试套件（单元 + 真库集成 28 例）。

## Purpose

定义平台级 API 契约与运行基线：/api/v1 统一响应与分页验证、live/ready 可用性探针、Prometheus 文本基础运行指标、DTO 契约隔离，以及 Web 与小程序跨端共享契约的构建约束。

## Requirements

### Requirement: 统一 API 契约

系统 SHALL 以 /api/v1 提供正确 HTTP 状态码、统一业务响应、分页和请求验证。

#### Scenario: 统一 API 契约验收

- **GIVEN** 非法分页参数
- **WHEN** 请求列表
- **THEN** 返回结构化 400 错误。

### Requirement: 可用性探针

系统 SHALL 提供 live/ready 健康检查且数据库不可用时 ready 返回不可用。

#### Scenario: 可用性探针验收

- **GIVEN** MySQL 不可达
- **WHEN** 请求 ready
- **THEN** 健康探针失败而 live 可独立反映进程状态。

### Requirement: 契约隔离

系统 MUST 以明确的 DTO 输出对外响应，防止泄露哈希和内部字段。

#### Scenario: 契约隔离验收

- **GIVEN** 查询用户资料
- **WHEN** API 返回
- **THEN** 不含 passwordHash。

### Requirement: 跨端构建

系统 SHALL 使 Web 与微信小程序消费同一套版本化 API 契约并通过构建检查。

#### Scenario: 跨端构建验收

- **GIVEN** DTO 字段发生不兼容变化
- **WHEN** 运行 typecheck
- **THEN** 报告受影响客户端。

### Requirement: 基础运行指标

系统 SHALL 暴露 Prometheus 文本格式的指标端点（`GET /api/v1/metrics`），包含 Node 进程默认
指标（CPU/内存/GC/事件循环）与 HTTP 请求指标（次数按 method/route/状态码、耗时直方图）；
route 标签 SHALL 只使用路由模板，不携带查询串与路径参数实际值；端点 SHALL 可通过
`METRICS_ENABLED=false` 关闭。

#### Scenario: 指标端点公开可达验收

- **WHEN** 未认证请求 `GET /api/v1/metrics`
- **THEN** 返回 200 与 text/plain 的 Prometheus 暴露文本，含进程指标与 `http_requests_total`
  指标族。

#### Scenario: 标签基数可控验收

- **WHEN** 携带任意查询串请求 API 后抓取指标
- **THEN** 指标文本不含查询串内容，route 标签为路由模板（未匹配路由记为 unmatched）。

#### Scenario: 端点可关闭验收

- **GIVEN** `METRICS_ENABLED=false`
- **WHEN** 请求 `GET /api/v1/metrics`
- **THEN** 返回 404，且不再记录 HTTP 请求指标。
