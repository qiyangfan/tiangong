# 任务清单：2026-11-19-add-quality-gates-batch2

## 1. 覆盖率门禁（jacoco 对应物）

- [x] 1.1 四包接入 `@vitest/coverage-v8`，阈值取 2026-11-19 实测基线略下方：
      api 70/80/68/70（实测 72.21/83.13/70.76）、web 60/88/72/60（utils 口径，实测 63.01/91.04/76.47）、
      miniapp 78/88/80/78（实测 80.80/91.83/84.61）、contracts 98/95/60/98（实测 99.46/100/66.66）
- [x] 1.2 api 的 `test:coverage` 口径含单元 + 集成（service 层由集成覆盖；单跑单元只有 20.78% 无意义）；
      web 只统计 `src/utils`（store/router/api 由 e2e 覆盖且 e2e 不插桩）
- [x] 1.3 根 `test:coverage` 进入 CI，替换原 `pnpm test`
- [x] 1.4 负向：`--coverage.thresholds.lines=99` → exit 1（实测 63.25% 低于阈值 99%）；去掉探针参数后 exit 0

## 2. 构建覆盖与冷启动

- [x] 2.1 `apps/miniapp` 增加 `build`（`build:h5 && build:mp-weixin`），根 `pnpm -r build` 真正编译小程序；
      实测 exit 0，产物 `dist/build/h5` 与 `dist/build/mp-weixin` 均生成
- [x] 2.2 `apps/api` 增加 `postinstall: prisma generate`：pnpm 安装后不再出现
      `@prisma/client did not initialize yet`（实测 install 后 generate 自动执行）
- [x] 2.3 负向：改前 `pnpm --filter @tiangong/miniapp run build` → `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`；
      改后 exit 0

## 3. 依赖漏洞与更新

- [x] 3.1 `security.yml` 新增 `dependencies` job：`pnpm audit --prod --audit-level=high`
- [x] 3.2 `pnpm-workspace.yaml` 的 `overrides` 修复可修项：multer 2.5.0、adm-zip 0.6.1、postcss 8.5.18、
      source-map-js 1.2.2、jpeg-js 0.4.4、@intlify/core-base 9.1.11、@intlify/message-resolver 9.1.11、
      @vue/server-renderer 3.5.42、deepmerge-ts 8.x、vite 5.x→5.4.21（版本限定，不动 web 的 vite 8）
- [x] 3.3 两条不可修项经逐条裁决写入 `auditConfig.ignoreGhsas`（vite 需 ≥6.4.4 与 uni 钉 5.x 冲突；
      @intlify 原型污染上游无修复版本、本仓消息为静态资源），理由同文件内注释
- [x] 3.4 新增 `.github/dependabot.yml`（npm + github-actions 周更，uni 工具链排除批量升级）
- [x] 3.5 负向：临时删除 `auditConfig` → exit 1（3 high）；恢复后 exit 0（`3 ignored: 3 high`）
- [x] 3.6 覆盖后验收：miniapp 双端构建 exit 0、小程序单测 31/31、web 的 vue-i18n 仍解析 11.4.18
      （中途发现全局覆盖会把 intlify 降级到 9.x，已改为版本限定选择器）

## 4. 容器构建

- [x] 4.1 `ci.yml` 新增独立 `images` job：`docker compose -f deploy/compose.yaml build`（compose 解析期
      插值必填 `JWT_ACCESS_SECRET`，job 内给哑值）
- [x] 4.2 本地等价验证：`podman build --network=host` 构建 api（471 MB）与 web（53.6 MB）镜像成功；
      默认网络下 corepack 拉取 pnpm 二进制偶发失败（宿主 podman 网络，容器内手工复跑可成功），
      CI 用 GitHub runner 原生 docker compose，不存在该问题

## 5. 样式门禁

- [x] 5.1 `.stylelintrc.json` 最小规则集：`color-no-hex`、重复声明/选择器、空块、未知属性/伪元素；
      `.vue` 用 postcss-html、`.scss` 用 postcss-scss；仅 `apps/web/src/styles/index.css` 与
      `apps/miniapp/src/uni.scss`（token 单源）允许 hex
- [x] 5.2 修复 `index.css` 中注释内含 `*/` 导致的解析错误（stylelint parseError）
- [x] 5.3 `pnpm lint:style` 进 CI（`pnpm lint` 之后）
- [x] 5.4 负向：临时 `.vue` 植入 `color: #fff` → exit 2（命中 `color-no-hex`）；删除后 exit 0

## 6. 重复度与死代码

- [x] 6.1 jscpd 基线：67 处克隆 / 723 行 / 3.62%；阈值 4% 进 CI 阻断
- [x] 6.2 knip：`ignoreWorkspaces: apps/miniapp`（uni 页面为 pages.json 动态注册，静态分析不可达），
      api/web/contracts/e2e 只报告不阻断（Vue SFC、动态注册存在已知误报）
- [x] 6.3 按 knip 报告删除 3 个死导出：`apiGetSample`、`apiGetUser`、`validateUserForm`
- [x] 6.4 负向：复制 `index.css` 为探针 → 4.7% > 4% exit 1；删除后 exit 0

## 7. workflow 自检

- [x] 7.1 `security.yml` 新增 `workflows` job：actionlint 1.7.12（与 gitleaks 同型 curl 安装）
- [x] 7.2 负向：植入非法 step key 的临时 workflow → exit 1 并给出位置；删除后 exit 0

## 8. 全量验证

- [x] 8.1 全量门禁（2026-11-19 实测）：`lint` 0 / `lint:style` 0 / `dup:check` 0（3.62% < 4%）/
      `format:check` 0 / `build` 0（含小程序 h5 + mp-weixin）/ `typecheck` 0 / `test:coverage` 0
      （contracts 17 + miniapp 31 + web 17 + api 45）/ `test:e2e` 5/5 / `audit` 0（1 ignored high）/
      actionlint 0
- [x] 8.2 文档同步（DELIVERY_REPORT 批次 2 记录与旧表述修正、CI_PLAN 现状）；
      `openspec validate 2026-11-19-add-quality-gates-batch2 --strict` valid
