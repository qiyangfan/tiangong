# CI/CD 建设计划（待实施）

实现时至少包含：依赖锁定与缓存、lint、typecheck、unit、MySQL service integration、API e2e、Web build、微信小程序 build、依赖漏洞检查、迁移干净部署校验、容器 build。CI 不能记录密钥，PR 权限需最小化。生产发布需要独立环境参数、审核与回滚策略。

**本规范包没有真正的 CI workflow，也不能宣称 CI 已通过。** 请由 Agent 在 M0/M4 阶段实现 `.github/workflows/ci.yml` 并在真实 CI 环境验证。
