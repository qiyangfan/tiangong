# 变更提案：P0-1 Secret scanning（gitleaks）

## Why

跨仓质量门禁 P0-1（`../QUALITY-GATES-HANDOFF.md` §2）要求六仓先落机密扫描：本仓现有门禁（eslint / typecheck / 单测 / 集成 / e2e / build）不覆盖机密泄露，JWT secret、数据库口令、云凭据一旦进入 git 历史即不可逆。同时本仓无任何提交前或 PR 阶段的机密检测，靠人工审查不可靠。

## What Changes

- 新增 `.gitleaks.toml`：extend 默认规则集；allowlist 仅按路径（测试夹具、docs 下的文档与图片），不按规则名全局放行。
- 新增 `.pre-commit-config.yaml`：gitleaks v8.30.1 提交前钩子（Node 仓二选一取 pre-commit，不引入 husky 依赖）。
- 新增 `.github/workflows/security.yml`：`secrets` job 全量历史扫描（`fetch-depth: 0`），独立于按路径裁剪的 `ci.yml`，避免路径过滤跳过安全作业。
- 顺带按 handoff §5.0 把存量 `ci.yml` 的 `actions/checkout@v5` 对齐到 `@v7`。
- 不改产品行为，不新增或修改任何产品规格（`skip_specs: true`）；无 API、DB migration、依赖变更。

## Impact

- 新增 CI 必过检查 `secrets`（分支保护 required 需 owner 在 GitHub 侧设置，见 tasks §4）。
- 开发者本地提交前多一次 gitleaks 扫描；未安装 `pre-commit` 的机器不受影响（CI 仍是执法点）。
- 误报处置顺序：先改假值，再考虑路径级 allowlist；禁止规则级豁免。
