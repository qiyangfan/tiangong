# API 契约

- 基础路由 `/api/v1`；请求输入和响应输出是 API DTO，不能直接等同 ORM model。
- 成功统一 `{ "code": 0, "data": ... }`；错误由正确 HTTP 状态码与 `{ "code": "AUTH_FORBIDDEN", "message": "...", "data": null, "requestId": "..." }` 表达。
- 分页统一 `page>=1`、`pageSize` 白名单上限（默认 20、最高 100），结果 `items,total,page,pageSize`。
- 日期统一 ISO 8601 UTC 传输；时间展示按用户时区。精度/金额使用明确约定。
- Web/miniapp 复用 `packages/contracts` 中 DTO 与独立平台的 API 请求层；Zod 或等价 schema 负责运行时校验。
- NestJS DTO 桥接需选择**唯一**契约生成路径（例如 Zod-first + OpenAPI）；不得同时维护两个不同事实来源。
- 生产 API 文档需访问控制，不应暴露内部测试接口。
- GET 只读；写操作使用适当 POST/PATCH/DELETE，敏感操作要审计；幂等重试设计按实际场景确定。
- 非兼容变更先以 OpenSpec 评审，新增 v2 或提供迁移窗口；不得静默删除字段。
