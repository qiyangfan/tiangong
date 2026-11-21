# 任务清单：2026-11-21-add-platform-ai-governance

## 1. 契约与工具注册

- [ ] 1.1 `@AiTool` 装饰器与 OpenAPI 扩展 `x-ai-tool`（description/risk/maxBatch/hidden），
      未标注沿用默认分级；重复注册与非法 risk 在启动/测试期失败
- [ ] 1.2 `packages/contracts` 增策略配置、计划、step-up 的 schema（响应类 `strictObject`）与错误码
      （`AI_POLICY_REJECTED` / `AI_STEP_UP_REQUIRED` / `AI_PLAN_TOO_LARGE` / `AI_PLAN_PARTIAL_FAILURE`）
- [ ] 1.3 业务仓接入说明：工具 = 业务路由 + `@AiTool`，平台不承载业务语义

## 2. 数据与权限

- [ ] 2.1 迁移：`ai_plan`、`ai_plan_item`、step-up 凭证存储；`ai_action` 增可空 `planId`
- [ ] 2.2 种子权限点：`ai:admin-policy`（策略配置）；策略页路由与菜单按权限过滤
- [ ] 2.3 授权矩阵自动覆盖新增端点；策略页权限负例（无权限 403）

## 3. 策略引擎与 step-up

- [ ] 3.1 `AiPolicyService`：风险分级（read/write/destructive/bulk）→ 确认/step-up/批量上限；
      存系统参数并 zod 校验，写时失效缓存
- [ ] 3.2 执行器强制：单动作影响行数、单计划动作数、单会话写操作数上限；超限返回稳定错误码
- [ ] 3.3 `POST /auth/step-up`：密码重认证签发短时单次凭证（TTL 5 分钟），绑定用户与动作/计划哈希；
      失败计入锁定与审计；凭证不落日志
- [ ] 3.4 高风险确认同时校验确认票据与 step-up 凭证；缺一拒绝

## 4. 多步计划

- [ ] 4.1 计划生成与确认：一次确认整份计划，票据绑定计划 payload hash；默认 ≤ 10 动作，超限拒
- [ ] 4.2 串行执行与失败语义：任一步失败停止，返回已完成/未执行清单；计划级与步骤级幂等键
- [ ] 4.3 计划状态持久化与回放；取消计划不影响已完成动作

## 5. 漂移治理与可观测

- [ ] 5.1 工具目录一致性测试：工具 ⊆ OpenAPI；权限点 ⊆ 种子目录；`hidden` 不出现；risk 值域合法
- [ ] 5.2 指标：`ai_messages_total{outcome}`、`ai_tool_executions_total{risk,outcome}`、
      `ai_tokens_total{type}`、`ai_confirmations_total{result}`；标签不携带参数/用户
- [ ] 5.3 日志审计口径：会话/动作 id、toolName、requestId、错误码；不写提示词与工具结果正文

## 6. 多端入口

- [ ] 6.1 消息端点支持 `stream=false` 轮询模式；服务端策略与确认语义不变
- [ ] 6.2 miniapp AI 入口页：会话、动作卡片、确认/取消；`ai:chat` 控制可见，服务端强校验
- [ ] 6.3 H5/真机走查：轮询模式下确认流、错误态与断网恢复

## 7. 评测与门禁

- [ ] 7.1 确定性评测场景文件：风险分级、批量超限、step-up 缺失、多步部分失败、注入回归；
      `pnpm test:ai-eval` 无网络运行并接入 `pnpm test`
- [ ] 7.2 策略/工具规则变更必须同步评测场景（测试同步原则），漏加由评审拦截
- [ ] 7.3 全量门禁：lint / typecheck / test:coverage / build / size:check / e2e / spec:validate 全绿；
      覆盖率阈值按实测回填

## 8. 文档与收尾

- [ ] 8.1 ADR 增补（或 ADR-0010）：策略模型、step-up、多步计划、多端一致性与回滚
- [ ] 8.2 `API_CONTRACT` / `FUNCTION_MATRIX` / `BUILD_PLAN` / `UI_STYLEGUIDE`（策略页与计划确认 UI）同步
- [ ] 8.3 `openspec validate --strict` 通过；遗留风险与未验证项写入 DELIVERY_REPORT
