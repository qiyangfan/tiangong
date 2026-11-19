# 任务清单：2026-11-19-add-quality-gates-batch3

## 1. `.vue` 类型感知规则

- [x] 1.1 `eslint.config.js`：`recommendedTypeChecked` 扩到 `**/*.{ts,vue}`，`projectService` +
      `extraFileExtensions: ['.vue']`；显式还原 `vue-eslint-parser` 入口、script 块交 `tseslint.parser`
      （`vue-eslint-parser` 增为根 devDependency）
- [x] 1.2 存量 6 处 uni API 浮动 Promise 以 `void` 显式豁免（miniapp 登录 2 处、示例页 4 处）
- [x] 1.3 负向：`.vue` 探针内浮动 Promise → `no-floating-promises` 报错（修复前该规则对 `.vue` 完全不生效）
- [x] 1.4 `pnpm lint` exit 0；同时屏蔽 `eslint-import-resolver-typescript` 的多 tsconfig 警告

## 2. actionlint + shellcheck

- [x] 2.1 `security.yml` 的 `workflows` job 先装 shellcheck 0.11.0，再跑 actionlint 1.7.12
      （actionlint 仅在检测到 shellcheck 时分析 `run:` 块，此前 CI 整块静默跳过）
- [x] 2.2 负向：含 `for f in $(ls apps)` 的探针 workflow → exit 1（`SC2086`，actionlint 报出）
- [x] 2.3 本地 actionlint（带 shellcheck）对现有 workflow exit 0

## 3. Prisma schema 门禁

- [x] 3.1 `schema:validate`（`prisma validate`）
- [x] 3.2 `schema:format:check`：`scripts/prisma-format-check.mjs` 在临时副本上 `prisma format` 后逐字节比对，
      不改工作树；CLI 经 `createRequire` 解析，不依赖 PATH
- [x] 3.3 `schema:drift`：`prisma migrate diff --from-migrations … --to-schema-datamodel … --shadow-database-url … --exit-code`
- [x] 3.4 schema 按 `prisma format` 归一（38 行纯空白对齐）
- [x] 3.5 CI quality job：validate / format / 创建影子库（root 建库并授权 ci 用户）/ drift 四步
- [x] 3.6 负向：临时加 `probeDriftField` → drift exit 1（输出 `Added column probeDriftField`），回滚后
      exit 0（`No difference detected`）；格式化前 format 检查如实报未格式化，归一后通过

## 4. Dockerfile lint 与非 root

- [x] 4.1 `.hadolint.yaml`（failure-threshold: warning，trustedRegistries: docker.io）+ `lint:docker`，进 CI images job
- [x] 4.2 api 运行时 `USER 1000:1000`；web 改 `nginxinc/nginx-unprivileged:1.31-alpine`、监听 8080，
      compose 宿主端口仍 8080:8080
- [x] 4.3 负向：探针 Dockerfile（`apt-get install` 未钉版本）→ exit 1（DL3008）
- [x] 4.4 冒烟：api 容器 `uid=1000(node)`、`/api/v1/health/live` 200、迁移+seed+启动成功；
      web 容器 `uid=101(nginx)`、静态页 200、`/api/v1/health/live` 反代 200

## 5. 镜像 CVE 扫描

- [x] 5.1 `ci.yml` images job：构建后 trivy 0.76.2 扫 api/web（HIGH/CRITICAL、ignore-unfixed、exit-code 1）
- [x] 5.2 首扫 api 命中 6 HIGH——全部位于 Node 镜像自带 npm 的传递依赖；运行时不再需要 npm/corepack，
      改为移除并把迁移改 `node node_modules/prisma/build/index.js migrate deploy`；复扫 exit 0
- [x] 5.3 web 首扫 68 项（nginx-unprivileged 1.27 基于 alpine 3.21）；升 1.31（alpine 3.24）后余 13 项
      apk 包滞后，构建期 `apk upgrade --no-cache`（root→101 还原非 root）后 exit 0
- [x] 5.4 初始 exit 1 即负向证据（真实 CVE 被拦）；两镜像复扫均 exit 0

## 6. a11y

- [x] 6.1 `eslint-plugin-vuejs-accessibility` flat recommended 接入
- [x] 6.2 修复仪表盘快捷入口：可点击 `div` → `router-link`（键盘可达、无静态元素交互告警）
- [x] 6.3 负向：上条即为真实违规拦截（`click-events-have-key-events` / `no-static-element-interactions`），
      修复后 `pnpm lint` exit 0

## 7. markdownlint

- [x] 7.1 `.markdownlint-cli2.jsonc`：默认规则集，仅关闭 MD013（行宽归 Prettier）；忽略
      node_modules / uni_modules / unpackage / 归档变更
- [x] 7.2 `--fix` 自动修复 11 项，人工修 3 项（PR 模板补 H1、两处代码块补语言）
- [x] 7.3 `lint:md` 进 CI；50 个文件 0 告警
- [x] 7.4 负向：首跑 14 项结构违规 exit 1（裸 URL ×8、代码块无语言 ×2 等）即为拦截证据

## 8. e2e 覆盖率插桩

- [x] 8.1 web：`vite-plugin-istanbul` 仅在 `VITE_COVERAGE=1` 时插桩（dev/build 产物不含探针）
- [x] 8.2 e2e：`tests/fixtures.ts` 每用例结束后回收 `__coverage__` 落 `.nyc_output`；三个 spec 改用该 fixture
- [x] 8.3 nyc 以 `cwd=../web` 合并统计 web 全 src（含 .vue）；实测 82.96 / 55.05 / 75.47 / 83.05，
      阈值 78 / 50 / 70 / 78；`test:e2e:coverage` 进 CI 替代普通 e2e 步骤
- [x] 8.4 负向：阈值抬到 lines 99 → exit 1；配置阈值 → exit 0
- [x] 8.5 5/5 用例通过，`rm -rf .nyc_output` 前置清空，产物进 .gitignore

## 9. 收尾

- [x] 9.1 openspec validate --strict 通过（skip_specs: true，无契约/迁移变化）
- [x] 9.2 DELIVERY_REPORT / CI_PLAN 更新；全量门禁与负向证据回填
- [x] 9.3 全量门禁：lint / lint:style / lint:md / dup / format / build / typecheck / test:coverage /
      e2e 覆盖率 / audit / actionlint / hadolint / trivy
