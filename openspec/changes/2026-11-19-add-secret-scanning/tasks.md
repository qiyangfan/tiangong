# 任务清单：2026-11-19-add-secret-scanning

## 1. 实现

- [x] 1.1 新增 `.gitleaks.toml`：extend 默认规则集 + 路径级 allowlist（`tests?/fixtures`、docs 的
      md/png/jpg）；验证：干净树 `gitleaks detect --source . --redact --verbose --exit-code 1` exit 0
      （22 commits scanned，no leaks found）
- [x] 1.2 新增 `.pre-commit-config.yaml`（gitleaks v8.30.1；Node 仓二选一取 pre-commit，不引入
      husky 依赖）；验证：`uvx pre-commit validate-config` exit 0
- [x] 1.3 新增 `.github/workflows/security.yml` 的 `secrets` job（checkout@v7 + `fetch-depth: 0`
      全量历史扫描，gitleaks 8.30.1）；验证：`actionlint` exit 0
- [x] 1.4 存量 `ci.yml` 的 `actions/checkout@v5` 对齐 handoff §5.0 的 `@v7`；验证：`actionlint` exit 0、
      全仓无 `checkout@v5` 残留

## 2. CI 落点

- [x] 2.1 `security.yml` 独立触发（push main + pull_request，无 `paths` 过滤），不并入按路径裁剪的
      `ci.yml`；验证：workflow 无路径过滤、actionlint 通过
- [x] 2.2 提交前钩子语义验证：暂存植入探针后执行钩子同款命令
      `gitleaks git --pre-commit --redact --staged --verbose --exit-code 1` exit 1；撤销暂存并删除后
      exit 0（索引无残留）

## 3. 负向验收

- [x] 3.1 干净树：CI 等价命令 exit 0
- [x] 3.2 植入一次违规后 CI 等价命令必须非 0：`gitleaks detect` 仅扫 git 历史，未跟踪文件不会命中
      （实测 exit 0），故在 scratch 仓以同款 `.gitleaks.toml` 提交探针后验证——exit 1，命中
      `aws-access-token`（探针改用 base32 合规合成 key；handoff 模板的 `AKIAIOSFODNN7EXAMPLE`
      被 gitleaks 8.30 默认配置忽略，实测不触发）
- [x] 3.3 移除违规提交后恢复 exit 0
- [x] 3.4 既有门禁无回归：`pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿
      （纯 workflow/工具配置改动，无源码触碰；集成与 e2e 未重跑）

## 4. 分支保护 required

- [ ] 4.1 GitHub 侧将 `security.yml` 的 `secrets` job 设为 main 分支保护 required check——依赖
      owner 提交推送后执行（当前 Actions 仍 startup_failure 未解锁；本批不提交、不推送）

## Workflow follow-up

- 分支保护落定且 CI 实跑绿后，`openspec archive 2026-11-19-add-secret-scanning`。
