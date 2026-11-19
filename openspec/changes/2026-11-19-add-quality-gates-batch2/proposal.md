# 变更提案：质量门禁批次 2（覆盖率 / 构建 / 依赖 / 样式 / 重复度）

## Why

批次 1（结构类规则 + Prettier）解决的是「代码写法」，但门禁仍有三类盲区：
测试覆盖率无人得知、小程序从未被 CI 编译过、依赖漏洞与镜像腐化没有任何检查点。逐项实测确认：

- `apps/miniapp` 没有 `build` 脚本，`pnpm -r build` 静默跳过，CI 从未编译小程序/H5；
- 全仓无覆盖率工具，78 个单测的实际覆盖范围未知；
- `pnpm audit --prod` 报 17 个 high，无任何门禁与依赖更新机器人；
- `apps/api/Dockerfile`、`apps/web/Dockerfile` 存在但 CI 不构建；
- stylelint 缺失，UI_STYLEGUIDE 的「禁裸色值」纪律无人执法；
- 无重复代码（CPD）与未用依赖/导出检测；
- `.github/actionlint.yaml` 存在，但 workflow 自身从未被 lint。

## What Changes

- **覆盖率（jacoco 对应物）**：四包接入 `@vitest/coverage-v8`，阈值取 2026-11-19 实测基线略下方；
  `test:coverage` 进 CI。api 口径含单元 + 集成（service 层由集成覆盖），web 口径限定
  `src/utils`（store/router/api 由 e2e 覆盖且 e2e 不插桩，纳入会得到虚低数字）。
- **小程序构建**：`apps/miniapp` 增加 `build`（h5 + mp-weixin），纳入根 `pnpm build`；api 增加
  `postinstall: prisma generate`，修复全新检出 `@prisma/client did not initialize` 的冷启动缺口。
- **依赖漏洞**：`pnpm audit --prod --audit-level=high` 进 `security.yml`；`overrides` 修复可修的传递
  依赖（multer/adm-zip/postcss/ws/source-map-js/jpeg-js/intlify/vue-server-renderer/deepmerge-ts/vite 5.x）；
  两条不可修项经逐条裁决写入 `auditConfig.ignoreGhsas` 并注明理由；新增 Dependabot（npm + actions）。
- **容器构建**：`ci.yml` 新增独立 `images` job 执行 `docker compose build`，只验证 Dockerfile 与上下文。
- **样式**：stylelint 最小规则集（禁裸 hex、重复声明/选择器、空块、未知属性/伪元素），`.vue`/`.scss`
  分别用 postcss-html / postcss-scss；仅 token 单源文件（`index.css`、`uni.scss`）允许 hex。
- **重复度与死代码**：jscpd 阈值 4%（实测基线 3.62%）阻断；knip 忽略 uni-app 工作区（页面注册为动态），
  api/web/contracts/e2e 只报告不阻断。顺带删除 knip 查出的 3 个死导出。
- **workflow 自检**：`security.yml` 新增 `workflows` job 执行 actionlint 1.7.12。
- 不改产品行为与服务契约（`skip_specs: true`）；无 API、DB migration 变更。

## Impact

- CI 新增必过项：`lint:style`、`dup:check`、`test:coverage`、`audit`、`images`、`workflows`；
  `build` 开始覆盖小程序双端。
- 依赖树因 `overrides` 有变化：uni 工具链若干钉死版本的传递依赖被提级，已用双端构建与小程序单测验收。
- 两条忽略的公告：vite 需 ≥6.4.4（uni 钉 5.x，等上游）、@intlify 原型污染（上游无修复版本，
  本仓 i18n 消息为静态资源）。理由写在 `pnpm-workspace.yaml`。
- 已接受边界：web 覆盖率只覆盖 utils；knip 对 Vue SFC 与动态注册有误报，只报告不阻断。
