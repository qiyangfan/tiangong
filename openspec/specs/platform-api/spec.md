# 通用 API 与平台运行 — Target baseline specification

> TARGET / 尚待实现；验收后归档为已实现规范。

## Requirement: 统一 API 契约

系统 SHALL 以 /api/v1 提供正确 HTTP 状态码、统一业务响应、分页和请求验证。

### Scenario: 统一 API 契约验收

- **GIVEN** 非法分页参数
- **WHEN** 请求列表
- **THEN** 返回结构化 400 错误。

## Requirement: 可用性探针

系统 SHALL 提供 live/ready 健康检查且数据库不可用时 ready 返回不可用。

### Scenario: 可用性探针验收

- **GIVEN** MySQL 不可达
- **WHEN** 请求 ready
- **THEN** 健康探针失败而 live 可独立反映进程状态。

## Requirement: 契约隔离

系统 MUST 以明确的 DTO 输出对外响应，防止泄露哈希和内部字段。

### Scenario: 契约隔离验收

- **GIVEN** 查询用户资料
- **WHEN** API 返回
- **THEN** 不含 passwordHash。

## Requirement: 跨端构建

系统 SHALL 使 Web 与微信小程序消费同一套版本化 API 契约并通过构建检查。

### Scenario: 跨端构建验收

- **GIVEN** DTO 字段发生不兼容变化
- **WHEN** 运行 typecheck
- **THEN** 报告受影响客户端。
