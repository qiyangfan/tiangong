# ADR-0009: 平台 AI 入口 — 同权 API 客户端 + 服务端确认

状态：Accepted | 日期：2026-11-23 | 关联 OpenSpec：`2026-11-21-add-platform-ai`

## 背景与问题

平台需要在 Web 管理端提供自然语言入口，让用户用对话完成既有 API 能做的事。核心问题不是「接哪个模型」，
而是**授权与副作用**：AI 不能成为绕过 RBAC、跳过审计的隐形超管；模型提出的写操作不能在用户不知情时
执行；模型与 provider 必须可整体关断，且不影响人工路径。

本仓是通用后台脚手架，AI 入口必须保持业务无关：只提供编排基础设施与 `SampleRecord` 示例，业务工具由
业务仓按既有 API 自然接入，平台不定义第二套工具注册契约。

## 约束与可核验事实

- 全局守卫顺序为 `ThrottlerGuard` → `JwtGuard` → `PermissionsGuard`；权限实时查库，撤销即时生效。
- 统一成功 envelope 为 `{ code: 0, data }`；`EnvelopeInterceptor` 只对 health/metrics 透传，SSE 必须显式跳过。
- 写审计由 `@Audit` + `AuditInterceptor` 记录，`requestId` 来自 `X-Request-Id` 中间件；自调用沿用同一请求头即可关联。
- Nest `@Sse` 只支持 GET；消息端点需要 POST + `text/event-stream`，必须手动写响应。
- 当前 OpenAPI 文档只包含路由、method、summary 与 `x-required-permissions`，**不包含 Zod 校验产生的
  query/body schema**；直接据此生成工具会得到无参数定义的函数。
- OpenAI-compatible 的 function name 只允许字母、数字、下划线与短横线，`GET /samples` 这类含空格与斜杠的
  名称不可直接作为 wire name。
- 真实 provider 端点（muniu `/v1` 或 DashScope 兼容模式）均可用同一 OpenAI-compatible 适配器，平台不内置
  key 池、配额与计量。

## 候选方案（含现状）

1. **AI 在进程内直呼 service**：实现最短，但绕过守卫、权限与审计，等价于隐形超管。否决。
2. **AI 使用服务账号**：无法按人审计，权限收敛困难。否决。
3. **客户端执行工具**：授权与副作用均可被绕过。否决。
4. **引入 LangChain/AgentScope 作为核心**：框架 churn 与安全面扩大，收益只在适配层，可被一个
   `AiProvider` 接口替代。否决；如未来需要，只允许包在适配器内部。
5. **AI 作为普通 API 客户端，以调用者 access token 自调用 `/api/v1/*`**：与人工操作同权同审计；
   写操作由服务端一次性票据确认；provider 单端点且可关断。采纳。

## 决策及理由

### 身份与执行路径

- 所有工具执行使用当前登录用户的 access token，经 `JwtGuard` → `PermissionsGuard` → `@Audit` 原路径；
  不注入特权身份，不直连数据库或 service。
- 执行器用 `API_SELF_BASE_URL`（默认 `http://127.0.0.1:${PORT}`）发起本机 HTTP 调用，只允许 loopback
  或显式配置的 host，禁用重定向；每次执行生成 `X-Request-Id`，写入 `ai_action.requestId` 供审计关联。
- 令牌只在该次执行的内存上下文中使用，不落库、不写日志。

### 工具目录

- 启动时由 `createOpenApiDocument(app)` 生成一次文档并注入 `ToolCatalogService`；`main.ts` 与测试装配
  走同一入口；未初始化时 fail-closed。
- OpenAPI 在生成后由 Zod 路由元数据富化：从 `@Body/@Query/@Param(new ZodValidationPipe(schema))`
  读取输入 schema，用 `z.toJSONSchema` 补齐 parameters 与 requestBody。Zod 仍是唯一契约来源，
  不新增第二份工具注册表；富化失败时保留原文档，不阻断启动。
- 仅保留 `x-required-permissions` 全部满足的操作；排除 `/ai/*`、`/auth/*`、`/metrics`、`/health*`、
  `x-public` 与二进制响应；权限集合取当前请求上下文，不缓存。
- 工具 wire name 采用 `method_path` 的安全形式（如 `get_samples`、`delete_samples_id`），
  内部保留 `METHOD /path` 映射；这是 OpenAI function name 约束下的必要偏离。
- P1 注入全部有权限工具，不做相关性裁剪；路由超过 128 条时再按模块分组。

### 确认与副作用

- GET 直接执行；所有非 GET 必须进入 `awaiting_confirmation`。
- 确认票据 32 字节随机数，仅存哈希；哈希绑定 `actionId + userId + 参数摘要`；TTL 300s、单次使用；
  只在 `action.proposed` 事件一次性下发，读取会话不返回。
- confirm 使用 confirm 请求的 access token；事务内条件更新到 `executing`，并发只有一个成功；
  已 executed/failed 返回既有结果；执行失败不自动重试；令牌过期回到 `awaiting_confirmation`。

### 传输与 provider

- 消息端点用 POST + `@Res()` 手写 SSE，路由标记 `@SkipEnvelope()`；事件固定为
  `message.delta` / `action.proposed` / `action.executed` / `action.failed` / `error` / `done`；
  `done` 必须最后；15s 心跳；流开始前的鉴权/参数/开关错误仍走 JSON envelope。
- SSE 401 与 axios 共用单飞刷新，成功后以新 token 重试一次；最终 401 才进入终局重登。
- Web 面板关闭只隐藏抽屉，不销毁当前会话、动作与票据；确认/取消/删除请求期间互斥。
- provider 抽象为 `AiProvider.chat({ messages, tools, signal })`，只接受单端点 OpenAI-compatible 流；
  单条消息最多 8 次模型往返、16 次工具调用；单个 tool_call；`finish_reason=length` 视为 provider 错误。
- `AI_PROVIDER=fake` 仅用于测试/评测，生产启用即拒绝启动；真实 provider 建议指向 muniu `/v1`，
  也可指向任意兼容端点；密钥只从环境/密钥注入读取。

### 关闭与回滚

- `AI_ENABLED` 默认 false；关闭时 `/ai/*` 返回 `AI_DISABLED`，入口隐藏，人工路径零影响。
- 开启但缺 provider 配置时启动失败；不进入半可用状态。
- 回滚：关闭开关即停用；数据库回滚删除 4 张 AI 表与 `ai:chat` / `ai:confirm` 种子；既有表不变。

## 复杂度、性能、兼容、测试、迁移与运维影响

- 新增 4 张表、1 个模块、6 个端点；无既有表结构变更，无既有 API 语义变更。
- 工具执行多一次本机 HTTP 往返（毫秒级）；模型延迟由 provider 决定，流式输出不阻塞人工路径。
- OpenAPI 富化会补充既有路由的参数/body schema，属于文档契约增强，不改变运行时校验。
- 测试：单测覆盖 SSE 解析、目录过滤、票据与状态机；真库集成覆盖 SSE、确认、并发、级联与限流；
  e2e 用 fake provider 完成 `SampleRecord` 查询 → 创建 → 删除闭环。
- 运维：provider 故障只影响 AI 入口；日志不写对话全文、工具结果正文与票据。
- 限流：P1 采用单实例进程内固定窗口（消息 10 次/分、确认 20 次/分，按 userId），全局
  300 次/分仍生效；工具自调用从 loopback 计入全局桶。按单用户满负载 10 条/分 × 最多 16 次
  工具调用估算约 160 次/分，loopback 桶仅适合低并发演示/预发；多用户或多副本由网关或共享
  存储承担，不在 P1 引入 Redis/DB 热行计数。

## 风险及撤销条件

- **提示注入**：工具结果一律视为不可信数据；模型只能提出草案，权限与确认由服务端裁决；注入样例进入评测。
- **数据外发**：提示词与工具结果会发送到配置的模型端点；部署文档必须声明，建议自建/私有部署。
- **写操作误执行**：所有非 GET 强制确认；P1 只用于演示/预发，生产写操作放行需另行评估。
- **模型端点不稳定**：超时/失败只使本次动作失败，不产生部分写入；关闭开关可整体回退。
- 撤销条件：引入跨服务策略引擎、需要 step-up 或多步计划的真实需求出现时，重新评估；届时优先扩展
  `AiProvider` 与确认层，不把策略逻辑塞进控制器。

## 参考

- `openspec/specs/platform-ai/spec.md`
- `openspec/changes/archive/2026-11-21-add-platform-ai/design.md`
- `docs/architecture/API_CONTRACT.md`
- `docs/adr/0004-auth-rbac.md`
- `docs/adr/0003-contracts.md`
