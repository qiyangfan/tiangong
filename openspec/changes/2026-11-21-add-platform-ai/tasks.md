# 任务清单：2026-11-21-add-platform-ai

## 1. 决策与契约

- [ ] 1.1 新增 `docs/adr/0009-platform-ai.md`：身份（按调用者、同权同审计）、执行路径（HTTP 自调用）、
      确认机制（服务端一次性票据）、provider 边界（框架只在适配层）、关闭与回滚策略
- [ ] 1.2 `packages/contracts` 新增 AI 会话/消息/动作/确认的请求响应 schema（响应类 `strictObject`），
      错误码 `AI_DISABLED` / `AI_PROVIDER_ERROR` / `AI_CONFIRMATION_REQUIRED` / `AI_CONFIRMATION_EXPIRED` /
      `AI_ACTION_CONFLICT` 登记到契约错误码表
- [ ] 1.3 `env.ts` 增加 `AI_ENABLED`（默认 false）与 provider 连接参数校验：开启而缺 provider 配置时启动失败；
      密钥只读环境，不进系统参数与日志

## 2. 数据与权限

- [ ] 2.1 Prisma 增量迁移：`ai_conversation` / `ai_message` / `ai_action` / `ai_confirmation`，
      含 `(conversationId, idempotencyKey)` 唯一约束与 `(userId, createdAt)` 索引
- [ ] 2.2 种子权限点：`ai:chat`、`ai:confirm`；菜单不新增页面，入口权限由前端 `v-permission` 控制
- [ ] 2.3 授权矩阵测试自动覆盖新增路由（权限点须在种子目录登记），并补自助白名单外的负例

## 3. provider 与工具目录

- [ ] 3.1 `AiProvider` 接口 + OpenAI-compatible 适配器（fetch，超时/取消/错误归一）+
      `FakeProvider`（仅测试环境按脚本返回，禁止在生产启用）
- [ ] 3.2 `ToolCatalogService`：从 `createOpenApiDocument` 生成工具，按用户权限过滤，排除
      `/ai/*`、`/metrics`、`/health/*`、`/auth/*`、二进制响应与 `@Public` 路由；单次注入上限 32
- [ ] 3.3 `ToolExecutorService`：以调用者 token 调 `/api/v1/*`，透传 requestId，映射统一 envelope 与
      稳定错误码；禁止进程内直呼 service

## 4. 会话、确认与执行

- [ ] 4.1 `AiService`：会话创建、消息追加、SSE 事件流（delta/proposed/executed/failed/done）、客户端断开取消
- [ ] 4.2 动作生命周期：draft → awaiting_confirmation → executed/failed/cancelled；
      DELETE 必须确认，读写操作按默认分级
- [ ] 4.3 确认票据：32 字节随机数仅存哈希、TTL 300s、单次使用、绑定用户/动作/payload hash
- [ ] 4.4 幂等：`Idempotency-Key` 同键返回既有结果；失败动作可重试且不重复副作用
- [ ] 4.5 限流：消息端点按用户 10 次/分，确认端点单独限流；会话内工具执行次数上限
- [ ] 4.6 脱敏与保留：口令/令牌/密钥字段进 provider 前与落库前脱敏；日志只写会话 id 与动作摘要

## 5. Web 入口

- [ ] 5.1 全局 AI 面板（懒加载）：对话流式渲染、动作卡片（METHOD/path/参数）、确认/取消按钮、
      空态/加载态/错误态；跟随亮暗主题；面板 a11y 达标
- [ ] 5.2 `ai:chat` 控制入口可见、`ai:confirm` 控制确认按钮；`AI_ENABLED=false` 时入口置灰并提示
- [ ] 5.3 `SampleRecord` 示例闭环：查询 → 创建 → 删除（确认）全流程可操作

## 6. 测试与门禁

- [ ] 6.1 单测：目录过滤、票据过期/复用、payload hash、幂等键、错误码映射
- [ ] 6.2 集成（真库）：越权工具 403、确认成功/拒绝、幂等重试、provider 失败无半执行、`AI_DISABLED` 行为
- [ ] 6.3 确定性评测（fake provider，无网络）：工具选择命中、无权限拒答、提示注入样例不执行、
      缺确认不执行；接入 `pnpm test`
- [ ] 6.4 e2e：AI 面板完成 SampleRecord 闭环；a11y 扫描覆盖面板
- [ ] 6.5 覆盖率阈值按实测回填（api/web），不压低既有阈值；`size:check` 重新基线并在预算内

## 7. 文档

- [ ] 7.1 `docs/architecture/API_CONTRACT.md` 增 AI 端点与错误码；`docs/requirements/FUNCTION_MATRIX.md`
      增「AI 编排入口」行与最低交付要求
- [ ] 7.2 `docs/BUILD_PLAN.md` §7.1/§8 记录开关、provider 配置、数据外发声明与回滚步骤
- [ ] 7.3 `docs/quality/DELIVERY_REPORT.md` 记录验证证据与 NOT VERIFIED 项

## 8. 收尾

- [ ] 8.1 全量门禁：lint / typecheck / test:coverage / build / size:check / e2e / spec:validate 全绿
- [ ] 8.2 `openspec validate --strict` 通过；归档前确认未提交项与遗留风险已登记
