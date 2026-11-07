# Coding Agent 主任务：从零实现通用全栈后台脚手架

你是技术负责人和实现者。当前仓库包含**需求规范包，而非已实现应用**。请从零构建跨行业复用的通用后台脚手架，**禁止出现 DUDUYU、绘本、借阅、课程、学员、商家等行业实体或页面**。

## 先读后写

按顺序阅读 `AGENTS.md`、`CONSTITUTION.md`、`docs/requirements/FUNCTION_MATRIX.md`、`docs/requirements/ACCEPTANCE.md`、`docs/requirements/DELIVERY_PHASES.md`、`docs/adr/`、`openspec/`。这些文件是实施要求，不是现成功能的证据。

## RuoYi 参考是硬要求

参考 RuoYi-Vue 官方功能清单和后台体验，逐项对照用户/角色/菜单/API按钮权限、部门/岗位、字典、参数、公告、操作/登录日志、在线用户、定时任务、代码生成、API文档、服务/缓存监控、可视化构建器、连接池监控等功能。依 `FUNCTION_MATRIX.md` 的 P0/P1/P2/X 分级交付。**仅参考功能与体验，不移植源码、SQL 或资源。** 不得因“AI 可生成代码”而取消权限、日志、代码生成等 P0 能力。

## 栈与工程边界

Node.js 适用稳定 LTS + TypeScript strict + NestJS + Prisma + MySQL 8.4 LTS + Vue3/Vite/Element Plus + uni-app(Vue3/TS) + pnpm workspace + REST/OpenAPI + Docker Compose。单体模块化。先核实实际版本及兼容矩阵，锁定依赖、提交 lockfile。不得自行改 React/Taro、RuoYi、微服务、多租户。

## 做事方法

1. 阅读现状与约束，生成实施计划，按 M0-M4 分阶段完成；初始化官方 OpenSpec，不要伪造工具安装。
2. 建立真实工程；优先实现 auth/users/roles/permissions/menus 的闭环和 Web 管理 UI。
3. 补完字典、参数、操作日志、登录日志、文件管理、代码生成器及示范 SampleRecord。
4. uni-app 至少支持登录、我的、导航和 SampleRecord 真实读写；不强制在小程序复制整套 PC 后台。
5. 接上统一 API DTO、错误码、OpenAPI、请求追踪、环境校验、健康检查、数据库迁移、Docker Compose。
6. 对每项能力实现测试与负例（尤其服务端 RBAC、敏感数据、文件上传、生成器不可覆盖）。
7. 执行 lint/typecheck/unit/integration/e2e/build、空库迁移、真 DB 全链路。构建通过不等于业务完成。
8. 更新 README、OpenSpec specs 与 ADR/部署手册，输出逐项验收矩阵和失败项。

## 不允许

- 不要只创建目录、演示 Mock 或一堆 TODO，却宣称已实现。
- 不要将 Prisma Entity 直接暴露为 API DTO。
- 不要仅凭前端路由/按钮权限控制 API。
- 不要用 admin/admin123 等静态生产默认账号。
- 不要为“未来可能用”先加 Redis、MQ、K8s、微服务、多租户。
- 不要复制 RuoYi 代码及受保护素材。

## 最终交付报告（必须）

- 本次实现的 P0 项目列表（每项附实际源码和测试入口）；P1/P2 未实施列表。
- `pnpm` / Docker / 小程序构建命令与原始结果。
- 数据库迁移/种子、API 文档、默认初始化、安全操作说明。
- 未通过的检查、风险、安全限制、剩余任务。
- 不得把本规范包本身当成已完成脚手架。

请直接实施，不要停留在建议。限制条件不满足时，应说明阻碍并优先完成不受阻部分。
