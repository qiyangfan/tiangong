# 变更提案：质量门禁缺口收口（SAST / 供应链 / 文档 / 小程序）

## Why

门禁盘点后本仓仍缺 CodeQL、osv-scanner、文档相对链接检查；miniapp 未继承严格 tsconfig，
且不在 knip 范围内；compose 仅靠镜像构建隐式校验。需要把这些缺口一次补齐。

## What Changes

1. **SAST**：新增 `codeql.yml`（javascript-typescript，周排程，v4 actions 钉 SHA）。
2. **供应链**：security.yml 增 osv-scanner（2.7.1），与 pnpm audit/license/SBOM 并存。
3. **文档**：零网络相对链接/锚点检查脚本接入 CI（74 文件 0 broken）。
4. **miniapp**：tsconfig 继承 `packages/config/tsconfig.base.json`，类型检查通过；knip
   因 uni 配置加载限制暂排除（在 tasks 中登记）。
5. **compose**：现有 images 作业的 `docker compose build/up` 已覆盖配置解析，不再单设 lint。

## Non-goals

- 不改业务语义与对外 API。
- e2e 覆盖率阈值保持关闭，待真实链路稳定后另立变更启用（NOT VERIFIED）。

## Impact

- 门禁与配置；miniapp 仅类型约束与少量类型修正。
