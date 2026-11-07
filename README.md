# Universal TS Admin Starter — 通用全栈后台脚手架建设规范包

> **当前状态：建设规范与 Agent 执行材料（Specification Pack），不是已实现或测试通过的可运行框架。**
> 不包含任何行业/客户业务模块，不复制 RuoYi 源码；目标是指导 Coding Agent 从零交付通用脚手架。

## 目标

打造可直接复用的管理型应用底座，面向通用中后台/企业业务系统；首个业务项目通过插件式业务模块扩展，不改变平台核心。**明确参考 RuoYi 的基础功能覆盖与产品体验，但重新实现为现代 TypeScript 技术栈；参考产品能力而非拷贝实现。**

技术决策：Node.js 当前适用 LTS、TypeScript strict、NestJS、Prisma、MySQL 8.4 LTS、Vue 3/Vite/Element Plus、uni-app(Vue3)、pnpm workspace、REST+OpenAPI、Docker Compose。版本锁定和兼容性必须在实施时核验。单体模块化优先，不采用微服务。

## 从哪里开始

1. 阅读 `AGENTS.md` → `CONSTITUTION.md` → `docs/requirements/FUNCTION_MATRIX.md` → `docs/requirements/ACCEPTANCE.md`。
2. 将 `agent-prompts/BUILD_STARTER.md` 原文交给你的 Coding Agent，在**新仓库**执行。
3. 先 `openspec init`（按官方最新 CLI），再将 `openspec/specs/` 中的能力规范对齐到初始化后的仓库；不要手工伪造已初始化命令/skills。
4. 按 `docs/requirements/DELIVERY_PHASES.md` 分阶段实现，逐项验证；所有未通过项目明确标记。
5. 创建具体业务应用时，增加业务模块与独立 OpenSpec 变更；不要修改平台模块承载业务规则。

## 本包内容

- `AGENTS.md`：Agent 工作方式、可执行质量门槛、任务范围
- `CONSTITUTION.md`：稳定工程宪法、优先级与治理程序
- `docs/adr/`：有依据的架构决策记录；包含候选方案取舍
- `docs/requirements/FUNCTION_MATRIX.md`：RuoYi 能力对照 + P0/P1/P2 + 非目标
- `docs/requirements/ACCEPTANCE.md`：完成定义、端到端验收
- `docs/requirements/DELIVERY_PHASES.md`：实现顺序与里程碑
- `docs/architecture/`：架构、数据模型边界、契约/安全约定
- `docs/quality/`：测试、安全、可运维性检查
- `openspec/specs/`：正式能力规范（要求与场景）；`openspec/changes/` 用官方流程生成
- `agent-prompts/BUILD_STARTER.md`：Agent 一次性任务入口
- `.github/`：PR 模板与 CI 建设说明，不假装 CI 已经存在

## 完成的定义

仅当后台和小程序真实登录、RBAC 服务端鉴权、可审计 CRUD、数据迁移、文件上传、代码生成示例、自动化测试及 Docker 部署均通过验收，才可宣称“生产可用基础脚手架”。单纯有页面/目录/Mock 不算完成。

## 参考资料

- RuoYi 官方仓库（能力参考）：https://github.com/yangzongzhuan/RuoYi-Vue
- RuoYi 官方文档：https://doc.ruoyi.vip/
- OpenSpec 官方：https://github.com/Fission-AI/OpenSpec

## 授权

本包为原创的架构和需求文字，不包含第三方工程源码。正式脚手架使用的依赖与可复制模板需逐项检查许可、归属和商用限制。
