# 任务清单：2026-11-21-add-platform-ai

## 1. 决策与契约

- [x] 1.1 新增 `docs/adr/0009-platform-ai.md`：身份（按调用者、同权同审计）、执行路径（`API_SELF_BASE_URL` + `X-Request-Id`）、确认机制（所有非 GET 动作、服务端一次性票据）、传输（POST SSE +
      `@SkipEnvelope`）、provider 边界（单端点、fake 仅测试）、关闭与回滚策略
- [x] 1.2 `packages/contracts` 新增 AI 会话/消息/动作/确认的请求响应 schema（响应类 `strictObject`）、
      SSE 事件 schema（`message.delta` / `action.proposed` / `action.executed` / `action.failed` /
      `error` / `done`）与错误码：`AI_DISABLED` 503、`AI_PROVIDER_ERROR` 502、
      `AI_CONFIRMATION_REQUIRED` 409、`AI_CONFIRMATION_EXPIRED` 410、`AI_ACTION_CONFLICT` 409、
      `AI_TOOL_LOOP_LIMIT` 409、`AI_SESSION_NOT_FOUND` 404、`AI_ACTION_NOT_FOUND` 404；
      web i18n 错误码映射同步
- [x] 1.3 `env.ts` 增加 `AI_ENABLED`（默认 false）、`AI_PROVIDER`、`AI_PROVIDER_BASE_URL`、
      `AI_PROVIDER_API_KEY`、`AI_MODEL`、`AI_MAX_TOKENS`、`AI_PROVIDER_TIMEOUT_MS`、
      `AI_TOOL_TIMEOUT_MS`、`API_SELF_BASE_URL`；开启而缺 provider 配置时启动失败；
      `AI_PROVIDER=fake` 仅允许非生产环境
- [x] 1.4 OpenAPI 快照与授权矩阵纳入 `/ai/*`；不引入第二份工具注册表

## 2. 数据与权限

- [x] 2.1 Prisma 增量迁移：`ai_conversation` / `ai_message` / `ai_action` / `ai_confirmation`；
      含 `ai_confirmation.actionId` 唯一约束、`(userId, createdAt)` 与 `(conversationId, createdAt)` 索引；
      外键 `onDelete: Cascade`；`ai_action.result` 可空并截断；幂等键 = 动作 id，不新增客户端幂等列
- [x] 2.2 种子权限点：`ai:chat`、`ai:confirm`；不新增菜单页，入口由前端 `v-permission` 控制
- [x] 2.3 授权矩阵测试自动覆盖 `/ai/*`（权限点须在种子目录登记）；补越权与目录外工具负例
- [x] 2.4 迁移 up 与回滚（删除 4 张新表）在测试库验证；种子重复执行保持幂等

## 3. provider 与工具目录

- [x] 3.1 `AiProvider` 接口 + `ProviderDelta`（text / tool_call）+ OpenAI-compatible 流式适配器；
      按 index 聚合 tool_call 的 id/name/arguments；超时、取消与错误归一；写操作不重试
- [x] 3.2 `FakeProvider`：仅测试/评测启用，按脚本确定性返回文本与 tool_call；生产环境启动失败
- [x] 3.3 `ToolCatalogService`：启动时由 `createOpenApiDocument(app)` 生成一次文档并 `initialize`
      （`main.ts` 与 `test/setup/app.ts` 同一入口）；
      过滤 `/ai/*`、`/metrics`、`/health*`、`/auth/*`、`x-public` 与二进制响应；按
      `x-required-permissions` every 过滤；path/query/body 合并为 JSON Schema；工具名 `METHOD path`；
      顺序确定；P1 注入全部有权限工具，不做相关性裁剪；未初始化时 fail-closed；
      权限集合取当前请求上下文（JwtGuard 注入）
- [x] 3.4 `ToolExecutorService`：以调用者 token 调 `API_SELF_BASE_URL`（只允许 loopback/显式配置 host）；
      透传 `X-Request-Id`；禁止重定向；confirm 用 confirm 请求 token；超时 `AI_TOOL_TIMEOUT_MS`；
      映射统一 envelope 与稳定错误码；禁止进程内直呼 service
- [x] 3.5 部署文档注明 `AI_PROVIDER_BASE_URL` 可指向 muniu `/v1`；平台不重建 key 池、配额与计量
- [x] 3.6 系统提示词：`prompts/system.md` 固定角色与安全约束；上下文窗口 20 条/32k 字符、
      工具结果 8k 截断；提示词变更必须同步评测场景

## 4. 会话、确认与执行

- [x] 4.1 `AiService`：会话创建、消息追加、POST SSE 事件流（delta/proposed/executed/failed/error/done）、
      `@SkipEnvelope`、`text/event-stream` 响应头、15s 心跳、`done` 最后；客户端断开取消在途 provider 请求
- [x] 4.2 动作生命周期：GET 直接执行；所有非 GET 进入 `awaiting_confirmation`；
      事务内条件更新到 `executing`，并发确认只有一个成功；第二个请求返回冲突或既有结果；
      confirm 执行不因客户端断开中止，结果落库可查
- [x] 4.3 确认票据：32 字节随机数仅存哈希、TTL 300s、单次使用、绑定 `actionId + userId + payloadHash`；
      仅在 `action.proposed` 一次性下发，GET 不返回；丢失则取消并重新发起
- [x] 4.4 幂等与失败：以动作 id 为幂等键；同动作重试返回既有结果；failed 不自动重试；
      不引入客户端 `Idempotency-Key`
- [x] 4.5 限流：消息端点 10 次/分/用户，确认端点 20 次/分/用户；按 userId 计数（自定义 tracker），
      不按 IP；全局 300 次/分仍生效；超限返回现有 429 契约
- [x] 4.6 脱敏与保留：递归按 `password|token|secret` key 脱敏；动作卡片参数同样脱敏；
      日志只写会话 id、动作摘要与 requestId，不写对话全文、工具结果正文或票据
- [x] 4.7 对话循环：单个 tool_call（请求带 `parallel_tool_calls=false`）；单条消息最多 8 次模型往返、
      16 次工具调用，超限返回 `AI_TOOL_LOOP_LIMIT`；`finish_reason=length` 视为 provider 错误；
      工具参数交给平台 `ZodValidationPipe` 校验，AI 层不复制规则

## 5. Web 入口

- [x] 5.1 新增 `src/utils/ai-stream.ts`：`fetch` + `ReadableStream` 解析 SSE；组件卸载/关闭面板 abort；
      单测覆盖分帧、半包、`error` 与 `done`；SSE 不使用 axios
- [x] 5.2 全局 AI 面板（懒加载）：纯文本流式渲染、动作卡片（METHOD/path/脱敏参数/风险标签）、
      确认/取消按钮、票据只存内存、空态/加载态/错误态、亮暗主题、a11y；遵守 UI_STYLEGUIDE，
      zh-CN 文案进 i18n；不使用 `v-html`
- [x] 5.3 `ai:chat` 控制入口可见、`ai:confirm` 控制确认按钮；`AI_ENABLED=false` 时入口隐藏或置灰
- [x] 5.4 会话删除（owner-only、二次确认）与 `SampleRecord` 示例闭环：
      查询 → 创建（确认）→ 删除（确认）全流程可操作

## 6. 测试与门禁

- [x] 6.1 单测：SSE 解析器、目录过滤/schema、payload hash、票据过期/复用/他人票据、幂等与状态机、
      脱敏、错误码映射
- [x] 6.2 集成（真库）：raw fetch 验证 SSE 不被 envelope 包裹、事件顺序与 `done`、审计 requestId 关联、
      所有非 GET 需确认、并发确认只有一个执行、票据竞态、限流 429、`AI_DISABLED`、provider 超时/失败、
      删除会话级联、越权 403、工具循环超限
- [x] 6.3 确定性评测（fake provider，无网络）：工具选择命中、无权限拒答、提示注入样例不执行、
      缺确认不执行、provider 超时；接入 `pnpm test`
- [x] 6.4 e2e：测试服务设 `AI_ENABLED=true`、`AI_PROVIDER=fake`；面板完成 SampleRecord 闭环；
      a11y 扫描覆盖面板；删除会话；console.error=0
- [x] 6.5 门禁：覆盖率阈值不调低（api 72/58/78/72；web utils 98/92/96/98）；web 体积保持 800 KiB，
      AI 面板懒加载 chunk 实测并记录，不静默重新基线；迁移 up/rollback 在真库验证

## 7. 文档

- [x] 7.1 `docs/architecture/API_CONTRACT.md` 增 AI 端点、SSE 事件、错误码与删除语义；
      `docs/requirements/FUNCTION_MATRIX.md` 增「AI 编排入口」行与 P1 最低交付要求
- [x] 7.2 `docs/BUILD_PLAN.md` §7.1/§8 记录开关、provider 配置（muniu 选项）、数据外发声明、
      关闭/回滚步骤与「演示/预发，生产写操作另行评估」定位
- [x] 7.3 `docs/quality/DELIVERY_REPORT.md` 记录验证证据与 NOT VERIFIED 项（真实 provider/CI）

## 8. 收尾

- [x] 8.1 全量门禁：lint / typecheck / test:coverage / build / size:check / e2e / spec:validate 全绿
- [x] 8.2 `openspec validate --strict` 通过；归档前确认未提交项与遗留风险已登记

## 实现备注

- OpenAPI 在生成后用路由上的 Zod 输入 schema 富化 parameters/requestBody；工具 wire name 采用
  OpenAI 兼容的 `method_path`，展示名仍为 `METHOD /path`；新增 `GET /ai/status` 供 Web 入口隐藏。
- 确定性评测场景（工具选择、无权限拒答、注入不执行、缺确认不执行、provider 超时/循环超限）
  由 `ai-session.test.ts` / `ai-safety.test.ts` 以 fake provider 覆盖。
- 门禁实测：API 单测 29 + 集成 78（覆盖率 76.45/63.18/84.39/76.04）；Web 单测 35
  （utils 100/95/100/100）；e2e 17/17；web gzip 724.0 KiB，AI 面板 chunk 12.69 kB；
  迁移 up/down/up 与种子双跑通过；真实 provider DashScope qwen-plus 文本流冒烟通过。
- 遗留：真实 provider 未在 muniu/CI/生产复跑；生产写操作放行未演练；GitHub Actions 仍受账单锁。
