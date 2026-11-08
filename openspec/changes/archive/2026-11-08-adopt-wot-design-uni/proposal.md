# 变更提案：miniapp 组件层采用 wot-design-uni（adopt-wot-design-uni）

## 为什么变

miniapp 三页的表单/交互控件全部是原生 `input`/`button`/`switch`，两个实际问题：

1. **原生控件基础样式与工具类互搏（真实兼容缺陷）**：微信原生 button 的
   `display:block; margin-left/right:auto; font-size:18px` 等基础样式压过工具类，
   走查实测登录按钮/退出按钮渲染为 fit-content 胶囊（56×14、84×14），与
   `rounded-control bg-primary text-body` 的意图完全不符；align-miniapp-ui 的
   token 基线在控件层名存实亡。
2. **控件交互能力缺位**：无 loading 态、无输入清空、无密码明暗文切换、无成熟
   行列表/弹层语义——逐个手搓违背「用组件不用手搓」，且每个自研件都是新的维护面。

owner 决策（2026-11-08）：miniapp 组件层选 **wot-design-uni**（多源对比调研结论：
Vue3+TS、80+ 组件、`--wot-*` CSS 变量主题体系、文档对 AI 友好，优于 uni-ui /
uview-plus / uv-ui）。版本与安装路线经本轮调研 + PoC 实证收口（ADR-0008）：

- **版本锁定 v1.14.0**（v1 终版）：v2 线（`@wot-ui/ui`）要求 vite ≥5.4 的
  `api: 'modern-compiler'`，而 vite 5.2.8 由 `@dcloudio/vite-plugin-uni` peer
  精确钉死（最新 alpha 亦然），v2 工具链在 uni 当前线上不可达；v1 自身即以
  vite 5.2.8 + sass 1.59 开发，兼容按构造成立。v1→v2 挂账，触发条件见 ADR。
- **安装采用 uni_modules 内联**：npm 直装被 uni 小程序编译器的 chunkFileNames
  路径推导卡死（monorepo 下模块 realpath 逃逸应用包目录，rollup 拒绝 `../`
  开头模式）；hoist 阶梯死于 `@intlify/shared` 9.x/11.x 版本分叉。内联到
  `src/uni_modules/wot-design-uni/` 后双目标构建全绿（PoC 实证）。

## 范围与定级

- 依赖接入：wot v1.14.0 内联 + `sass@1.78.0` devDep 精确锁版（v1 文档硬约束：
  Dart Sass 3.0 移除 legacy API，1.79+ 不可用）+ vue-tsc 隔离三件（tsconfig
  exclude / locale 类型垫片 / 深路径类型导入）：**P1 基建**。
- 主题桥接：`wd-config-provider` theme-vars 单点桥接，值全部派生自 tgTokens
  （色值单源纪律延伸到组件库变量）：**P1 基建**。
- 三页控件替换：login（wd-input ×2 + wd-button）、sample（wd-button ×4 +
  wd-popup 弹层 + wd-input ×2 + wd-switch）、mine（wd-cell-group + wd-button）：
  **P1 视觉与交互**，消除 fit-content 胶囊缺陷。
- locale 桥接：`Locale.use('en-US', enUS)` 随应用语言切换生效（现用组件无内置
  文案，为 calendar/picker 类组件预留）：**P2 前瞻接线**。
- 明确不做：`uni.showToast`/`uni.showModal` 反馈层替换（request 层会话终局提示
  已被单测锁定，替换属无收益连带风险）；`@wot-ui/unocss-preset`（第二套 token
  源，违反单源纪律）；小程序暗色主题（沿用 align-miniapp-ui 口径，wot 的
  ConfigProvider theme="dark" 机制存在，需要时另行立项）；图标体系引入。

## 契约与安全影响

- **不改任何对外契约**：无 API、DTO、DB schema 变更；纯 miniapp 展示层与构建链。
- **行为变化（有意的）**：三页控件视觉与交互升级（loading/清空/明暗文切换）；
  请求层/store 层语义零触碰，既有 70 单测原样通过。
- **依赖与供应链**：无新增 npm 运行时依赖；wot 以 npm registry 官方 tarball
  逐字节内联入库（版本自记录于其 package.json，更新 = 重新解包替换）；
  `pnpm-lock.yaml` 仅增 sass devDep。
- **工具链回退保证**：`preserveSymlinks: false`、无 hoist、严格 pnpm 布局全部
  保持现状（PoC 阶梯中的 hoist/preserveSymlinks 试验性改动不入库）。

## 验收标准

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；
  `pnpm --filter @tiangong/miniapp build:h5` 与 `build:mp-weixin` 编译通过
  （PoC 已预验，实施后复验）。
- 三页模板不再出现承担表单/交互职责的原生 `input`/`button`/`switch`；
  桥接层（theme-vars）无脱离 tgTokens 的裸 hex。
- vue-tsc 严格设置（含 `noUncheckedIndexedAccess`）不降级；库源码不进入
  vue-tsc 检查程序（exclude + 隔离导入）。
- 微信开发者工具模拟器三页走查（automator 驱动，对照 PoC 前截图 before/after）；
  真机预览如未执行，如实标注 NOT VERIFIED。
