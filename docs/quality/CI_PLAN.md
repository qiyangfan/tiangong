# CI/CD 建设计划（待实施）

实现时至少包含：依赖锁定与缓存、lint、typecheck、unit、MySQL service integration、API e2e、Web build、微信小程序 build、依赖漏洞检查、迁移干净部署校验、容器 build。CI 不能记录密钥，PR 权限需最小化。生产发布需要独立环境参数、审核与回滚策略。

**本规范包没有真正的 CI workflow，也不能宣称 CI 已通过。** 请由 Agent 在 M0/M4 阶段实现 `.github/workflows/ci.yml` 并在真实 CI 环境验证。

## 现状（2026-11-19 更新）

- `.github/workflows/ci.yml` 已实现（lint/typecheck/单测/真库集成/e2e/build，MySQL 8.4 service），但 Actions 实跑被账号账单锁阻塞（`The job was not started because your account is locked due to a billing issue`，见 `docs/quality/DELIVERY_REPORT.md` NOT VERIFIED）。
- `.github/workflows/security.yml` 已落地 P0-1 `secrets` job（gitleaks 8.30.1，全量历史扫描；本地 ubuntu:24.04 容器等价复跑通过，GitHub 实跑待账单修复）；P0-2 依赖漏洞、P0-3 CodeQL、P0-4 SBOM+license 按 `../QUALITY-GATES-HANDOFF.md` §5 批次推进，未落地前不建下一批 change。
