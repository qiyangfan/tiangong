# 设计：平台 AI 入口（P1）

## 1. 定位与边界

AI 入口是平台 API 的**另一个客户端**，不是新的控制面：

- 不新增特权身份：所有工具执行使用当前登录用户的 access token，经 `JwtGuard` → `PermissionsGuard` →
  `@Audit` 的同一路径；
- 不直连数据库或 service：执行层只做 HTTP 调用 `/api/v1/*`，保障「人工能做什么，AI 只能做什么」；
- 业务无关：本仓只提供编排基础设施与 `SampleRecord` 示例；业务工具由业务仓自行接入，平台不定义注册契约；
- P1 边界：单动作、所有非 GET 写操作需确认、web 入口、OpenAI-compatible 单端点。不做可配置策略引擎、
  step-up、多步计划、业务工具注册、miniapp 与会话列表。

## 2. 模块与端点

`apps/api/src/modules/ai/`：

- `ai.module.ts` / `ai.controller.ts` / `ai.service.ts`
- `provider/`：`ai-provider.ts`（接口）、`openai-compatible.provider.ts`（fetch 适配器）、
  `fake.provider.ts`（仅测试/评测启用）
- `tools/`：`tool-catalog.service.ts`（从 OpenAPI 生成并按权限过滤）、`tool-executor.service.ts`
  （以用户 token 调平台 HTTP API）
- `confirmation/`：票据签发与核验
- `tool-risk.ts`：GET=read、其余=write；仅用于动作卡片展示与确认门槛，不引入策略引擎
- `sse.ts`：POST SSE 事件写出与错误收口

新增端点（均需登录）：

| 方法   | 路径                                    | 权限点       | 说明                                     |
| ------ | --------------------------------------- | ------------ | ---------------------------------------- |
| GET    | `/api/v1/ai/status`                     | `ai:chat`    | 开关状态（关闭时返回 `{enabled:false}`） |
| POST   | `/api/v1/ai/conversations`              | `ai:chat`    | 创建会话                                 |
| POST   | `/api/v1/ai/conversations/:id/messages` | `ai:chat`    | 发送消息，SSE 返回文本增量与动作草案     |
| POST   | `/api/v1/ai/actions/:id/confirm`        | `ai:confirm` | 凭一次性票据确认并执行非 GET 动作（200） |
| POST   | `/api/v1/ai/actions/:id/cancel`         | `ai:chat`    | 取消草案（200）                          |
| GET    | `/api/v1/ai/conversations/:id`          | `ai:chat`    | 读取会话、消息与动作状态                 |
| DELETE | `/api/v1/ai/conversations/:id`          | `ai:chat`    | 删除自己的会话及关联数据                 |

删除会话沿用既有 delete 语义：成功返回 `{ code: 0, data: null }`；非本人会话返回 404，避免枚举；
数据库外键级联删除消息、动作与确认票据。

### 2.1 传输协议（POST SSE）

- `POST /messages` 返回 `text/event-stream`。Nest `@Sse` 只支持 GET，因此用 `@Post` + `@Res()` 手动写响应；
- 路由标记 `@SkipEnvelope()`，`EnvelopeInterceptor` 通过 reflector 元数据直接透传；否则全局 envelope 会把
  每个事件包成 `{ code, data }`；
- 响应头：`Content-Type: text/event-stream; charset=utf-8`、`Cache-Control: no-cache`、
  `Connection: keep-alive`、`X-Accel-Buffering: no`；每 15s 写 `: ping` 心跳；
- 事件（均带 `event:` 与 `data:` JSON）：
  - `message.delta`：`{ text }`
  - `action.proposed`：`{ actionId, method, path, params, risk, confirmationTicket?, expiresAt? }`；
    票据只在 proposal 一次性下发
  - `action.executed`：`{ actionId, status, resultSummary }`
  - `action.failed`：`{ actionId, code }`
  - `error`：`{ code, message }`
  - `done`：`{ status }`，必须是最后一个事件
- 流开始后出错（provider 超时、执行失败）只发 `error` 再发 `done`，不改成 JSON envelope；流开始前的
  鉴权、参数与开关错误仍走统一 JSON envelope；
- 客户端断开：服务端 abort 在途 provider 请求；已进入 confirm 的执行不因客户端断开中止，结果落库可查。

### 2.2 错误码

| code                       | HTTP | 场景                                      |
| -------------------------- | ---- | ----------------------------------------- |
| `AI_DISABLED`              | 503  | `AI_ENABLED=false`                        |
| `AI_PROVIDER_ERROR`        | 502  | provider 失败/超时/响应不可解析           |
| `AI_CONFIRMATION_REQUIRED` | 409  | 非 GET 动作缺少票据                       |
| `AI_CONFIRMATION_EXPIRED`  | 410  | 票据过期或已使用                          |
| `AI_ACTION_CONFLICT`       | 409  | 动作状态不允许确认，或并发确认            |
| `AI_TOOL_LOOP_LIMIT`       | 409  | 单条消息的模型往返/工具调用超限           |
| `AI_SESSION_NOT_FOUND`     | 404  | 会话不存在或不属于当前用户                |
| `AI_ACTION_NOT_FOUND`      | 404  | 动作不存在或不属于当前用户                |
| `AUTH_FORBIDDEN`           | 403  | 工具越权或目录外工具                      |
| 现有 429 契约              | 429  | 限流（沿用 `AllExceptionsFilter` 的映射） |

## 3. 身份与执行路径

- **同权**：执行器取会话所属用户的 access token，走本机 HTTP 调用。否决「注入服务层直接调用」——
  会绕过守卫与审计，等于给 AI 一个隐形超管。
- **不落用户令牌**：读工具在消息请求期间使用消息请求的 access token；非 GET 动作在 confirm 请求时使用
  confirm 请求的 access token。票据绑定用户；token 过期返回 401，动作保持 `awaiting_confirmation`，
  用户重新登录后可重试。令牌只在该次执行的内存上下文中使用，不写入会话表与日志。
- **自调用地址**：`API_SELF_BASE_URL`，默认 `http://127.0.0.1:${PORT}`；集成测试在 `app.listen(0)` 后
  用 `app.getUrl()` 注入。只允许 loopback 或显式配置的 host，禁用重定向。
- **requestId 透传**：每次执行生成 UUID，作为 `X-Request-Id` 发送；平台 requestId 中间件会沿用该值。
  `ai_action.requestId` 保存该值，平台审计记录与动作通过它关联。
- **超时**：`AI_TOOL_TIMEOUT_MS` 默认 15000；执行超时标记 failed，不自动重试。

## 4. 工具目录

- 来源：启动时调用一次 `createOpenApiDocument(app)`（与 `/docs` 同源），把文档交给
  `ToolCatalogService.initialize(document)`；`main.ts` 与 `test/setup/app.ts` 执行同一初始化；
  未初始化时 fail-closed，不按空目录放行；
- OpenAPI 富化：Nest Swagger 不认识 `new ZodValidationPipe(schema)`，生成文档后用路由上的 Zod
  输入 schema 补齐 `parameters`/`requestBody`（`z.toJSONSchema`），Zod 仍是唯一契约来源；
- 过滤：
  1. 仅保留 `x-required-permissions` 全部满足的操作（权限点数组按 every 判断）；
  2. 排除 `/ai/*`（防递归）、`/metrics`、`/health*`、`/auth/*` 与 `x-public` 路由；
  3. 排除二进制响应（`/files/:id/download` 或 response content-type 为 octet-stream）；
- 参数：path/query/body 合并为 JSON Schema；不暴露 header；工具对外 wire name 为 OpenAI function
  name 兼容的 `method_path`（如 `get_samples`、`delete_samples_id`），展示名仍为 `METHOD /path`；
  描述取 operation summary；顺序按 path/method 排序，保证确定性；
- 数量：P1 注入全部有权限工具，不做相关性裁剪。平台当前路由少于 100 条；超过 128 条时再按模块分组，
  触发条件写入 ADR；
- 服务端执行前再次校验权限点与工具是否在目录内；目录不作为授权依据；
- 权限集合取当前请求上下文（JwtGuard 注入），不另查库或缓存，保证权限撤销即时生效。

## 5. provider 抽象与配置

- 接口：`AiProvider.chat({ messages, tools, signal }): AsyncIterable<ProviderDelta>`；
- `ProviderDelta`：`{ type: 'text', text }` 或
  `{ type: 'tool_call', index, id?, name?, argumentsDelta }`；服务按 index 聚合 tool_call 的
  id/name/arguments，流结束后解析 JSON；
- 适配器：OpenAI-compatible Chat Completions（fetch，零 SDK 依赖）；超时、取消；仅幂等读重试，写不重试；
- 配置：`AI_ENABLED`（默认 false）、`AI_PROVIDER`（`openai-compatible` / `fake`）、
  `AI_PROVIDER_BASE_URL`、`AI_PROVIDER_API_KEY`、`AI_MODEL`、`AI_MAX_TOKENS`、`AI_PROVIDER_TIMEOUT_MS`、
  `AI_TOOL_TIMEOUT_MS`、`API_SELF_BASE_URL`；密钥只从环境/密钥注入读取；
- 部署建议：`AI_PROVIDER_BASE_URL` 指向 muniu 的 `/v1`（portfolio 网关），平台不重建 key 池、配额与计量；
  也可指向任意 OpenAI-compatible endpoint；
- 启动校验：`AI_ENABLED=true` 且缺 provider 配置时启动失败；`AI_PROVIDER=fake` 仅允许非生产环境，
  生产启动即失败；
- 关闭时：`/ai/*` 业务端点返回 `AI_DISABLED`（状态端点返回 `{enabled:false}`），web 入口隐藏或置灰；
  开启但缺 provider 配置时启动失败；
- 框架约束：LangChain/AgentScope 如需引入，只允许包在适配器内部，核心只用 `AiProvider`。

### 5.1 对话循环与提示词

- 系统提示词固定在代码中（`prompts/system.md`），版本化；内容包含角色、工具使用、所有非 GET 必须确认、
  工具结果视为数据、不得泄露密钥/令牌、不得声称已执行未确认动作；
- 上下文窗口：系统提示 + 最近 20 条消息 / 32k 字符；工具结果序列化后截断 8k 字符；超出以截断标记继续；
- 循环：模型返回文本 → 流式输出；返回 tool_call → 校验工具在目录内且 args 为对象 → 生成动作草案；
  P1 只接受单个 tool_call（请求带 `parallel_tool_calls=false`，收到多个按 `AI_PROVIDER_ERROR` 处理）；
  只读动作执行后把结果追加到消息并再次调用模型；非 GET 动作等待确认后结束本轮；
- 上限：单条用户消息最多 8 次模型往返、16 次工具调用；超限返回 `AI_TOOL_LOOP_LIMIT`，不继续；
- `finish_reason=length` 视为 provider 错误，不产生动作；`stop` 正常结束；`tool_calls` 走草案。

## 6. 数据模型（增量迁移）

- `ai_conversation`：id、userId、title、createdAt/updatedAt；索引 `(userId, createdAt)`；
- `ai_message`：id、conversationId、role（user/assistant/tool）、content（截断 16000 字符）、createdAt；
  索引 `(conversationId, createdAt)`；
- `ai_action`：id、conversationId、toolName、method、path、payload（json）、status
  （draft/awaiting_confirmation/executing/executed/failed/cancelled）、requestId、errorCode、
  result（json，可空，截断 8000 字符）、createdAt/updatedAt；
- `ai_confirmation`：id、actionId（唯一）、ticketHash、expiresAt、usedAt；
- 幂等键 = `ai_action.id`，不引入客户端 `Idempotency-Key`；
- 外键全部 `onDelete: Cascade`：删除会话连带消息、动作与确认票据；
- 不做会话列表；面板只维护当前会话 id，刷新后新建；删除会话用于数据最小化；自动清理策略后续按需。

## 7. 确认、幂等与失败语义

- 读操作（GET）直接执行；所有非 GET 动作必须先进入 `awaiting_confirmation`；
- 确认票据：32 字节随机数，仅存哈希；TTL 300s；单次使用；绑定 `actionId + userId + payloadHash`；
  仅在 `action.proposed` 事件中一次性下发，GET 不返回；丢失则取消并重新发起；
- confirm 执行使用 confirm 请求的 access token，顺序：
  1. 读取动作并校验归属；
  2. 已 executed → 返回既有结果；failed → 返回失败结果，不重试；cancelled/executing →
     `AI_ACTION_CONFLICT`；
  3. awaiting → 校验票据、用户与 payload hash；
  4. 事务内标记票据已用，并把状态条件更新为 executing（只有第一个请求成功）；
  5. 执行工具，写 executed/failed 与 result/errorCode；
  6. 并发第二个请求得到 `AI_ACTION_CONFLICT` 或既有结果；
- 参数：工具参数由平台接口现有的 `ZodValidationPipe` 校验；AI 层只校验工具存在、方法/路径匹配与
  args 为对象，不复制第二份校验规则；校验失败按平台 400 错误返回，动作标记 failed；
- 幂等：以动作 id 为键；同动作重试返回既有状态/结果，不重复副作用；失败不自动重试，用户重新发起；
- 审计：执行成功产生平台写审计，`requestId` 与 `ai_action.requestId` 一致；取消/失败不产生成功写审计，
  失败审计保留错误码；
- 多步计划不在本期范围。

## 8. 安全与数据边界

- 提示注入：工具结果一律作为不可信数据处理；模型只能提出草案，权限与确认由服务端裁决；注入样例进入
  评测回归；
- 敏感信息：递归按 key 正则 `password|token|secret` 脱敏，进入 provider 前与落库前都执行；动作卡片
  展示参数时同样脱敏；自由文本中的敏感信息无法保证识别，部署文档声明该限制；日志不写对话全文、
  工具结果正文与票据；
- 数据外发：提示词与工具结果会发送到配置的模型端点（建议自建/私有部署），在部署文档明确声明；
- 限流：消息端点 10 次/分/用户，确认端点 20 次/分/用户；按 userId 计数（自定义 tracker），不按 IP；
  全局 300 次/分仍生效；超限返回现有 429 契约；
- 模型输出：P1 以纯文本渲染，不使用 `v-html`；如后续引入 markdown，必须先加 sanitizer。

## 9. 前端入口

- SSE 客户端：新增 `src/utils/ai-stream.ts`，用 `fetch` + `ReadableStream` 解析事件；axios 不支持流式；
  组件卸载/关闭面板时 abort；解析器单测覆盖分帧、半包、`error` 与 `done`；
- 面板：全局 AI 面板（命令面板/侧栏），懒加载 chunk；对话纯文本流式渲染；动作卡片显示 METHOD/path/
  脱敏参数/风险标签；确认/取消按钮；票据只存内存；空态、加载态、错误态齐全；跟随亮暗主题；a11y 达标；
- 权限：`ai:chat` 控制入口可见，`ai:confirm` 控制确认按钮；后端强校验；
- 会话：当前会话 id 存内存；提供“删除会话”动作（owner-only，二次确认）；不做会话列表；
- i18n：zh-CN 文案与 AI 错误码映射进 locale；遵守 UI_STYLEGUIDE（token/EP 组件/图标，禁 emoji/魔法值）。

## 10. 测试与验收

- 单测：SSE 解析器、目录过滤/schema、payload hash、票据过期/复用/他人票据、幂等与状态机、脱敏、
  错误映射；
- 集成（真库）：raw fetch 验证 SSE 不被 envelope 包裹、事件顺序与 `done`、审计 requestId 关联、
  所有非 GET 需确认、并发确认只有一个执行、票据竞态、限流 429、`AI_DISABLED`、provider 超时/失败、
  删除会话级联、越权 403；
- 评测（fake provider，无网络）：工具选择命中、无权限拒答、注入样例不执行、缺确认不执行、provider 超时；
- e2e：e2e 服务设 `AI_ENABLED=true`、`AI_PROVIDER=fake`；面板完成 `SampleRecord` 查询 → 创建（确认）→
  删除（确认）闭环；a11y 覆盖面板；删除会话；console.error=0；
- 门禁：覆盖率阈值不调低（api 72/58/78/72；web utils 98/92/96/98）；新模块用测试达到现有阈值；
  web 体积保持 800 KiB，AI 面板懒加载 chunk 实测并记录，不静默重新基线；迁移 up/rollback 在真库验证。

## 11. 备选方案与否决理由

- 在核心引入 LangChain/AgentScope：否决——框架 churn 与安全面扩大，收益只有适配层可替代的便利；
- AI 使用服务账号：否决——等价于超级权限通道，无法按人审计；
- 客户端执行工具：否决——授权与审计可被绕过；
- 模型自动确认：否决——不可逆风险不可接受；
- 只对 DELETE 确认：否决——写操作同样有副作用；P1 统一所有非 GET 确认，规则更简单；可配置风险分级
  留到真实需要时；
- `N=32` 相关性裁剪：否决——没有可靠相关性模型；P1 注入全部有权限工具，按模块分组作为超量触发条件；
- 客户端 `Idempotency-Key`：否决——动作 id 已能唯一定位一次执行，额外头只增加歧义；
- 构建期工具目录 vs 运行时 OpenAPI：选择运行时文档构建一次；快照测试仍作为契约门禁，避免第二份工具定义。

## 12. 上线与回滚

- 默认 `AI_ENABLED=false`；dev/e2e 用 fake provider 验证；真实 provider 指向 muniu，密钥只走环境；
- 回滚：关闭开关即停用；数据库回滚删除 4 张新表与 `ai:chat` / `ai:confirm` 种子；既有表与人工路径不受影响；
- P1 定位演示/预发；生产写操作放行需另行评估（风险分级/step-up 不在本期）。
