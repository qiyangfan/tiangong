# API 契约

- 基础路由 `/api/v1`；请求输入和响应输出是 API DTO，不能直接等同 ORM model。
- 成功统一 `{ "code": 0, "data": ... }`；错误由正确 HTTP 状态码与 `{ "code": "AUTH_FORBIDDEN", "message": "...", "data": null, "requestId": "..." }` 表达。
- 分页统一 `page>=1`、`pageSize` 白名单上限（默认 20、最高 100），结果 `items,total,page,pageSize`。
- 日期统一 ISO 8601 UTC 传输；时间展示按用户时区。精度/金额使用明确约定。
- Web/miniapp 复用 `packages/contracts` 中 DTO 与独立平台的 API 请求层；Zod 或等价 schema 负责运行时校验。
- NestJS DTO 桥接需选择**唯一**契约生成路径（例如 Zod-first + OpenAPI）；不得同时维护两个不同事实来源。
- 生产 API 文档需访问控制，不应暴露内部测试接口。
- GET 只读；写操作：POST 新建、**PUT 更新（部分合并语义：只提交变更字段，省略字段不变更——对齐 RuoYi 约定；选 PUT 而非 PATCH 是因微信 request 不支持 PATCH method，三端统一原生可用动词）**、DELETE 删除；敏感操作要审计；幂等重试设计按实际场景确定。
- 运维端点不套 envelope：`GET /api/v1/health/live|ready`（探针）；`GET /api/v1/metrics`（Prometheus 文本：进程默认指标 + HTTP RED，route 标签仅路由模板，`METRICS_ENABLED=false` 关闭）。
- 非兼容变更先以 OpenSpec 评审，新增 v2 或提供迁移窗口；不得静默删除字段。

## AI 入口（P1）

- 端点：`GET /ai/status`（开关状态）、`POST /ai/conversations`、`GET|DELETE /ai/conversations/:id`、`POST /ai/conversations/:id/messages`、`POST /ai/actions/:id/confirm`、`POST /ai/actions/:id/cancel`；权限点为 `ai:chat` / `ai:confirm`，后端默认拒绝。
- 消息端点返回 `text/event-stream`，不套 envelope；事件为 `message.delta`、`action.proposed`、`action.executed`、`action.failed`、`error`、`done`，`done` 必为最后一个；15s 心跳；流开始前的鉴权/开关/参数错误仍走 JSON envelope。
- GET 直接执行；所有非 GET 必须先进入 `awaiting_confirmation`。确认票据由服务端签发、只存哈希、TTL 300s、单次使用，绑定动作/用户/参数摘要；票据只在 `action.proposed` 一次性下发，读取会话不返回。
- 动作以 id 为幂等键；重复确认返回既有结果，失败不自动重试。删除会话返回 `{code:0,data:null}`，非本人返回 404，级联删除消息/动作/确认记录。
- 错误码：`AI_DISABLED` 503、`AI_PROVIDER_ERROR` 502、`AI_CONFIRMATION_REQUIRED` 409、`AI_CONFIRMATION_EXPIRED` 410、`AI_ACTION_CONFLICT` 409、`AI_TOOL_LOOP_LIMIT` 409、`AI_SESSION_NOT_FOUND` 404、`AI_ACTION_NOT_FOUND` 404；工具越权返回 `AUTH_FORBIDDEN`。
- 限流：消息 10 次/分/用户，确认 20 次/分/用户；全局 300 次/分仍生效。工具执行以调用者 token 自调用 `/api/v1/*`，`X-Request-Id` 与平台审计关联。
