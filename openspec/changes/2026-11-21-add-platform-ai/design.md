# 设计：平台 AI 入口（P1）

## 1. 定位与边界

AI 入口是平台 API 的**另一个客户端**，不是新的控制面：

- 不新增特权身份：所有工具执行使用当前登录用户的 access token，经 `JwtGuard` → `PermissionsGuard` →
  `@Audit` 的同一路径；
- 不直连数据库或 service：执行层只做 HTTP 调用 `/api/v1/*`，保障「人工能做什么，AI 只能做什么」；
- 业务无关：本仓只提供编排基础设施与 `SampleRecord` 示例；订单等业务工具由业务仓在 P2 注册。

## 2. 模块与端点

`apps/api/src/modules/ai/`：

- `ai.module.ts` / `ai.controller.ts` / `ai.service.ts`
- `provider/`：`ai-provider.ts`（接口）、`openai-compatible.provider.ts`（fetch 适配器）、
  `fake.provider.ts`（评测用，仅测试环境启用）
- `tools/`：`tool-catalog.service.ts`（从 OpenAPI 生成并按权限过滤）、`tool-executor.service.ts`
  （以用户 token 调平台 HTTP API）
- `confirmation/`：票据签发与核验
- `policy/`：P1 只做默认分级（GET=read、POST/PUT=write、DELETE=destructive），策略引擎在 P2 扩展

新增端点（均需登录）：

| 方法 | 路径                                    | 权限点       | 说明                                 |
| ---- | --------------------------------------- | ------------ | ------------------------------------ |
| POST | `/api/v1/ai/conversations`              | `ai:chat`    | 创建会话                             |
| POST | `/api/v1/ai/conversations/:id/messages` | `ai:chat`    | 发送消息，SSE 返回文本增量与动作草案 |
| POST | `/api/v1/ai/actions/:id/confirm`        | `ai:confirm` | 凭一次性票据确认并执行               |
| POST | `/api/v1/ai/actions/:id/cancel`         | `ai:chat`    | 取消草案                             |
| GET  | `/api/v1/ai/conversations/:id`          | `ai:chat`    | 读取会话与动作状态                   |

SSE 事件：`message.delta` / `action.proposed` / `action.executed` / `action.failed` / `done`。
`done` 之前不关闭连接；客户端断开即取消在途 provider 请求。

## 3. 身份与执行路径（关键决策）

- **同权**：执行器取会话所属用户的 access token，走本机 HTTP 调用。否决「注入服务层直接调用」——
  会绕过守卫与审计，等于给 AI 一个隐形超管。
- **不落用户令牌**：执行所需令牌由消息请求的 Authorization 头带入，仅在该次执行的内存上下文中使用，
  不写入会话表与日志。
- **requestId 透传**：AI 发起的外部调用生成独立 requestId，与 `ai_action.request_id` 和平台审计记录
  相互关联；确认票据绑定 `action_id + 用户 id + payload hash`。

## 4. 工具目录

- 来源：运行时生成的 OpenAPI 文档（与 `/docs` 同一 `createOpenApiDocument`），读取
  `x-required-permissions` 与请求体 schema；
- 过滤：
  1. 仅保留当前用户权限集合覆盖的操作（超管按全量）；
  2. 排除 `/ai/*`（防递归）、`/metrics`、`/health/*`、`/auth/*`（避免 AI 自管会话）；
  3. 排除二进制响应（文件下载）与 `@Public` 路由；
- 工具名 = `METHOD path` 的稳定 slug；参数 schema 直接取自 OpenAPI，避免第二份定义漂移；
- 服务端执行前再次校验权限点（目录不作为授权依据）。
- 数量控制：单次请求最多注入 N 个工具（按相关性裁剪，默认 N=32），超出只暴露当前计划所需子集。

## 5. provider 抽象与配置

- 接口：`AiProvider.chat({ messages, tools, signal }): AsyncIterable<Delta>`；
- 适配器：OpenAI-compatible Chat Completions（fetch，零 SDK 依赖）；超时、重试（仅幂等读）、取消；
- 配置：`AI_ENABLED`（默认 false）、`AI_PROVIDER_BASE_URL`、`AI_PROVIDER_API_KEY`（密钥只从环境/密钥
  注入读取）、`AI_MODEL`、`AI_MAX_TOKENS`；非敏感参数可进系统参数（P2）；
- 未配置或关闭时：`/ai/*` 返回稳定错误码 `AI_DISABLED`，web 入口隐藏或置灰；
- 框架约束：LangChain/AgentScope 如需引入，只允许包在适配器内部，核心只用 `AiProvider`。

## 6. 数据模型（增量迁移）

- `ai_conversation`：id、userId、title、createdAt/updatedAt
- `ai_message`：id、conversationId、role（user/assistant/tool）、content（截断上限）、createdAt
- `ai_action`：id、conversationId、toolName、method、path、payload（json）、status
  （draft/awaiting_confirmation/executed/failed/cancelled）、idempotencyKey、requestId、errorCode、createdAt/updatedAt
- `ai_confirmation`：id、actionId、ticketHash、expiresAt、usedAt
- 唯一约束：`(conversationId, idempotencyKey)`；索引：`(userId, createdAt)`
- 保留：用户可删除会话；自动清理策略在 P2。

## 7. 确认、幂等与失败语义

- 确认票据：32 字节随机数，仅存哈希；TTL 300s；单次使用；核验用户、动作与 payload hash 一致；
- 无票据、票据过期/复用、payload 变动 → 拒绝执行，返回稳定错误码；
- 幂等：客户端每次执行携带 `Idempotency-Key`；同键重复请求返回既有动作结果，不重复产生副作用；
- 破坏性动作（DELETE）执行前必须 `awaiting_confirmation`；读操作可直接执行；
- 失败不半执行：单个动作要么完整成功要么标记 failed；多步计划的部分失败语义在 P2 定义；
- 审计：执行动作产生的平台审计记录与 `ai_action` 互链，取消/失败不产生写审计。

## 8. 安全与数据边界

- 提示注入：工具结果一律作为不可信数据处理；模型只能提出草案，权限与确认由服务端裁决；注入样例进入
  评测回归；
- 敏感信息：口令、令牌、密钥字段在进入 provider 前与落库前脱敏；日志不写对话全文，只写会话 id 与
  动作摘要；
- 数据外发：提示词与工具结果会发送到配置的模型端点（建议自建/私有部署），在部署文档明确声明；
- 限流：`/ai/messages` 按用户令牌键限流（默认 10 次/分），确认端点单独限流；工具执行次数受单会话上限约束。

## 9. 前端入口

- web：全局 AI 面板（命令面板/侧栏），懒加载 chunk；对话流式渲染、动作卡片（显示 METHOD/path/参数）、
  「确认执行 / 取消」按钮；空态、加载态、错误态齐全；跟随亮暗主题；
- 权限：`ai:chat` 控制入口可见（仅展示层），`ai:confirm` 控制确认按钮；后端强校验；
- 与既有页面无耦合：面板调用平台 API，不修改页面状态；页面内操作与 AI 操作可并存。

## 10. 测试与验收

- 单测：工具目录过滤、payload hash、票据过期/复用、幂等键、错误映射；
- 集成（真库）：越权工具 403、确认流成功/拒绝、幂等重试、provider 失败状态；
- 评测（fake provider，无网络）：工具选择命中、无权限拒答、注入样例不执行、确认缺失不执行；
- e2e：面板完成 `SampleRecord` 查询 → 创建 → 删除确认闭环；a11y 覆盖面板；
- 门禁口径不变：lint / typecheck / test:coverage / build / size:check / e2e 全绿；新增用例计入
  覆盖率阈值（阈值按实测回填，不预先压低）。

## 11. 备选方案与否决理由

- 在核心引入 LangChain：否决——框架 churn 与安全面扩大，收益只有适配层可替代的便利；
- AI 使用服务账号：否决——等价于超级权限通道，无法按人审计；
- 客户端执行工具：否决——授权与审计可被绕过；
- 模型自动确认破坏性操作：否决——不可逆风险不可接受。
