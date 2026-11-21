# 变更提案：质量门禁批次 3（类型感知覆盖 / a11y / 文档 / schema / 容器 / e2e 覆盖率）

## Why

批次 1（结构规则 + Prettier）与批次 2（覆盖率 / 构建 / 依赖 / 样式 / 重复度 / workflow 自检）之后，
按「本地可推进但未落地」口径复查仍有 8 个缺口，其中两处是「配了不生效」的假绿风险：

- typescript-eslint 类型感知规则只挂 `**/*.ts`，`.vue` 的 `<script setup lang="ts">` 只剩 vue-tsc
  类型检查，`no-floating-promises`、`no-misused-promises` 等行为类规则在 Web/小程序脚本块完全失效；
- actionlint 只在装了 shellcheck 时才分析 `run:` 块内联 shell，CI 只装了 actionlint，
  本机因 Homebrew 带 shellcheck 而「本地绿、CI 盲」；
- web 端覆盖率口径只含 `src/utils`，store/router/api/views 只有 e2e 兜底且 e2e 不插桩，
  这部分没有任何覆盖率数字；
- Prisma schema 无任何门禁：格式漂移、非法 schema、schema 与 migrations 不一致都无人检查；
- Dockerfile 不 lint；api 与 web 运行时均以 root 运行；
- 镜像构建后不扫 CVE；
- 无 a11y 检查（Vue UI 项目标配）；
- 文档（docs/、openspec/、根 md）无结构检查，Prettier 只管排版。

## What Changes

- **`.vue` 类型感知**：`recommendedTypeChecked` 扩展到 `**/*.{ts,vue}`，显式还原 vue-eslint-parser 作入口、
  tseslint.parser 解 script 块并启用 `projectService`；存量 6 处 uni API 浮动 Promise 以 `void` 显式豁免。
- **actionlint + shellcheck**：`security.yml` 的 `workflows` job 先装 shellcheck 0.11.0，`run:` 块内联
  shell 纳入分析。
- **Prisma 门禁**：新增 `schema:validate`、`schema:format:check`（临时副本格式化后逐字节比对，不改工作树）、
  `schema:drift`（`migrate diff --from-migrations` + 影子库），进 CI quality job；schema 本身按
  `prisma format` 归一（纯空白对齐）。
- **Dockerfile**：新增 `.hadolint.yaml`（failure-threshold: warning）与 `lint:docker`，进 CI images job；
  api 运行时 `USER 1000:1000`；web 改 `nginxinc/nginx-unprivileged` 镜像监听 8080（宿主端口仍 8080）。
- **镜像 CVE**：trivy 扫描 api/web 镜像（HIGH/CRITICAL、ignore-unfixed、exit-code 1），进 CI images job。
- **a11y**：`eslint-plugin-vuejs-accessibility` flat recommended 接入 ESLint；仪表盘快捷入口由可点击 div
  改为 `router-link`（键盘可达、语义正确）。
- **markdownlint**：markdownlint-cli2 默认规则集（仅关闭 MD013 行宽，排版交给 Prettier），
  归档变更目录冻结不检；`lint:md` 进 CI。
- **e2e 覆盖率**：web 端 `vite-plugin-istanbul` 按 `VITE_COVERAGE=1` 按需插桩，Playwright fixture 逐用例
  回收 `__coverage__`，nyc 合并出 web 全 src 覆盖率并设阈值；`test:e2e:coverage` 进 CI。
- 不改产品行为与服务契约（`skip_specs: true`）；无 API 契约与 DB migration 变更（schema 仅空白归一）。

## Impact

- CI 新增必过项：`lint:md`、`schema:validate`、`schema:format:check`、`schema:drift`、
  `hadolint`、`trivy`、e2e 覆盖率阈值；`lint` 的检查面扩展到 `.vue` 脚本块。
- web 容器内部端口 80 → 8080（宿主映射不变，外部访问方式不变）；运行时降为非 root。
- 本地需要 shellcheck / hadolint / trivy 才能完全等价 CI（缺失时对应脚本报 command not found）。
- 已接受边界：e2e 覆盖率只统计浏览器实际执行到的 web src，api/miniapp 不插桩。
