# CI/CD 建设计划（待实施）

实现时至少包含：依赖锁定与缓存、lint、typecheck、unit、MySQL service integration、API e2e、Web build、微信小程序 build、依赖漏洞检查、迁移干净部署校验、容器 build。CI 不能记录密钥，PR 权限需最小化。生产发布需要独立环境参数、审核与回滚策略。

**本规范包没有真正的 CI workflow，也不能宣称 CI 已通过。** 请由 Agent 在 M0/M4 阶段实现 `.github/workflows/ci.yml` 并在真实 CI 环境验证。

## 现状（2026-11-19 更新）

- `.github/workflows/ci.yml`：Prisma schema 三项门禁（validate / format 幂等 / migrations 漂移）→
  lint（.vue 脚本块类型感知 + strictTypeChecked + a11y 静态规则）/ lint:arch（dependency-cruiser 分层）/
  lint:style / lint:md / dup:check / knip（阻断；miniapp 因 uni easycom/自动导入误报排除）/
  format:check / build（含小程序 h5 + mp-weixin）/ size:check（web 产物 gzip 与微信小程序
  主包体积预算）/ typecheck（exactOptionalPropertyTypes +
  noPropertyAccessFromIndexSignature）/ test:coverage（含 OpenAPI 快照、strictObject 响应契约巡检
  〔多余字段同样失败〕与覆盖率阈值）/
  e2e（按菜单遍历全页 axe a11y + 系统模块 UI 闭环 + 覆盖率阈值）/
  镜像 job（hadolint → compose build → trivy → 全栈冒烟与安全响应头），MySQL 8.4 service。
  Actions 实跑仍被账号账单锁阻塞（`The job was not started because your account is locked due to a billing issue`，
  见 `docs/quality/DELIVERY_REPORT.md` NOT VERIFIED）。
- `.github/workflows/security.yml`：`secrets`（gitleaks 全量历史）、`dependencies`（`pnpm audit --audit-level=high`
  全量依赖含 dev 工具链 + `license:check` + `sbom:generate` 与 artifact，豁免逐条裁决在
  `pnpm-workspace.yaml` 的 `auditConfig`）、
  `workflows`（shellcheck 0.11.0 + actionlint 1.7.12，run 块内联 shell 一并分析）。
- 依赖更新：`.github/dependabot.yml`（npm + github-actions，周更；uni 工具链排除批量升级）。
- 仍待排期：P0-3 CodeQL、P0-4 SBOM+license（需账单修复后建批次）、分支保护 required check。
