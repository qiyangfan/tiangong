# ADR-0008: miniapp 组件层采用 wot-design-uni v1（uni_modules 内联安装）

状态：Accepted | 日期：2026-11-08 | 关联 OpenSpec：adopt-wot-design-uni / miniapp-ui

## 背景与问题

miniapp 三页（登录/示例数据/我的）的表单控件全部是原生 `input`/`button`/`switch`：
微信原生 button 基础样式（`display:block`、`margin:auto`、18px 字号）与 UnoCSS 工具类
互搏，实测登录按钮/退出按钮渲染为 fit-content 胶囊（56×14、84×14），视觉基线名存实亡；
且原生控件无 loading 态、无清空、无明暗文切换等成熟交互。align-miniapp-ui 只解决了
token 与工具类，控件层的丑是组件缺位而非样式问题。owner 决策（2026-11-08）：miniapp
组件层选 wot-design-uni，调研后立项。

## 约束与可核验事实

**库的两条版本线（2026-11-08 npm 实查）**：

- **v1 线**：npm 包 `wot-design-uni`，终版 1.14.0（2026-01-04），MIT，peer 仅
  `vue >= 3.2.47`（本仓 vue 3.5.45 ✓），零运行时依赖。库自身 devDeps 即
  `vite ^5.2.8` + `sass ^1.59.3`——与本仓钉死的小程序工具链同构，兼容性按构造成立。
  v1 线已功能冻结（作者转向 v2）。
- **v2 线**：npm 包 `@wot-ui/ui`（2026-04-21 起，现 2.4.0），活跃开发。但要求
  sass > 1.78（推荐 1.98）+ vite `css.preprocessorOptions.scss.api: 'modern-compiler'`
  ——该选项 vite 5.4 才存在。npm 裸名 `wot-ui` 是无关占位包（ISC，2025-03 后未动），
  不可混用。
- **本仓工具链 vite 钉死 5.2.8，钉死者是 DCloud**：`@dcloudio/vite-plugin-uni` 的
  peerDependencies 为精确 `"5.2.8"`（在用线与 2026-11-06 最新 alpha 均如此）。uni
  编译器深度接管 vite 行为（硬编码 preserveSymlinks、按模块路径逐 chunk 推导小程序
  产物文件名），跨出钉版即未验证状态。vite ≥5.4 在 uni 当前线上不可达。

**安装路线阶梯（PoC 实证，2026-11-08）**：

1. **npm 直装 + easycom**：H5 构建通过；小程序构建失败——uni mp 编译器从模块
   realpath 推导 chunkFileNames，pnpm monorepo 下 realpath 逃逸到根
   `node_modules/.pnpm/...`，rollup `isPathFragment` 拒绝 `../` 开头模式
   （uni-mp-vite/build.js 源码核实：非动态入口 chunk 走 `[name].js` 不触发，
   easycom 组件恰是动态入口）。提升 hoist 无法根治（realpath 仍穿透）。
2. **preserveSymlinks: true + 公共 hoist**：符号链接路径留在包内可过 chunkFileNames，
   但库生态传递依赖须逐层 hoist（pinia 的 `nostics` → `@vue/devtools-kit` →
   `perfect-debounce` → …）；全量 hoist（shamefullyHoist）后死于版本分叉——
   `@dcloudio` 工具链钉 `@intlify/shared@9.1.9` 而 vue-i18n@11 需要新版，根 hoist
   一名一版，结构上不可调和。
3. **uni_modules 内联（采用）**：包源码（2.8MB/379 文件）落
   `apps/miniapp/src/uni_modules/wot-design-uni/`——路径永不出应用包目录，双目标
   构建、typecheck、单测 30/30 全绿；easycom 原生支持零配置；preserveSymlinks
   翻回 false、无任何 hoist，严格 pnpm 布局原样保留。此为 wot 官方文档承认的
   两种安装方式之一（uni_modules：「即插即用」）。

**typecheck 隔离（实证）**：wot v1 以未编译 TS/Vue 源码发布，其库内源码在本文仓
`noUncheckedIndexedAccess` 下有约 50 处类型错误（common/util.ts、composables/* 等，
第一次只报 locale 一条是 tail 截断假象）。官方推荐的 tsconfig `types:
["wot-design-uni/global"]` 会把全部组件源拉进 vue-tsc 程序引爆检查。隔离方案（PoC
全绿）：tsconfig `exclude: ["src/uni_modules"]` + 深路径 type-only 导入
`ConfigProviderThemeVars` + `wot-design-uni/locale` 经 tsconfig paths 指向本地
类型垫片（运行时仍走真实模块；.d.ts 形态垫片会触发 vue-tsc Debug Failure 崩溃，
须用带最小实现的 .ts 形态）。

**组件与依赖面核实**：计划使用的 wd-button/wd-input/wd-switch/wd-cell/wd-popup/
wd-config-provider 均不引用 locale 模块（内置文案仅在 calendar/picker 等组件）；
`wd-input` 有 `show-password`（含明暗文眼睛切换）、confirm/confirmType 透传；v1
`wd-button` `type` 枚举含 `error`（v2 才改名 danger）、`round` 默认 true。
`@wot-ui/unocss-preset`（官方 UnoCSS 预设）面向 v2 token，且会引入第二套 `wot-*`
原子类 token 源，与 UI_STYLEGUIDE「tgTokens 单源」纪律冲突，不引入。

## 候选方案（含现状）

1. **维持现状（纯工具类 + 原生控件）**：控件交互（loading/清空/明暗文/表单校验）
   全部自研，违背「用组件不用手搓」；视觉缺陷挂账不消。否决。
2. **uni-ui**：官方出品但设计体系与双端一致性感弱，主题变量体系不及 wot 完整
   （前轮调研结论，owner 已在选型时排除）。
3. **uview-plus / uv-ui**：Vue3 生态可用，但 TS 类型与维护活跃度弱于 wot
   （前轮调研结论，已排除）。
4. **wot v2（`@wot-ui/ui`）**：活跃线但工具链前提不成立（vite ≥5.4 不可达），
   且迁移面大（MessageBox→Dialog、Form rules→schema、Button variant 体系、
   Input 表单属性上移 form-item、主题改三层 token）。否决，列为挂账升级项。
5. **wot v1.14.0 + uni_modules 内联（采用）**：兼容按构造成立（库自身即用
   vite 5.2.8 + sass 开发）、安装路线平台原生、v1 冻结的成本以三页规模可控。

## 决策及理由

采用方案 5：**wot-design-uni 1.14.0（精确锁版）以 uni_modules 内联方式安装**。
分层不变量：

- **控件层**：表单/交互控件（button/input/switch/cell/popup 系列）一律 wd-* 组件；
  `uni.showToast`/`uni.showModal` 等平台反馈层**不替换**（request 层会话终局提示已
  被单测锁定，替换属无收益的连带风险）。
- **样式层**：tgTokens 仍是唯一色值事实源；wot 经页面级 `wd-config-provider` 的
  `theme-vars` 桥接（`colorTheme/colorSuccess/colorWarning/colorDanger` 派生自
  tgTokens，禁止在桥接层写裸 hex）。不引入 `@wot-ui/unocss-preset`。
- **类型层**：库源码隔离在 vue-tsc 程序之外（exclude + 深路径类型导入 + locale
  类型垫片），本仓严格设置不降级。
- **依赖层**：不新增 npm 依赖（wot 为内联源码，sass 为唯一新增 devDep，精确锁
  1.78.0——v1 文档明示 Dart Sass 3.0 移除 legacy API 后 1.79+ 不可用）。

**v1→v2 升级触发条件（届时重开本决策）**：uni 工具链某条线将 vite peer 提到
≥5.4（uni+vite 同步升级后 v2 的 modern-compiler 工具链可达），或 v1 出现无修复的
阻断性 bug。三页 + 少量组件的迁移面经 migration-v2 文档核对为有界（wd- 前缀、
easycom 模式、ConfigProvider theme-vars、Locale API 均在 v2 保留）。

## 复杂度、性能、兼容、测试、迁移与运维影响

- 复杂度：新增 2.8MB 内联源码 + sass devDep + locale 类型垫片（约 30 行）；
  小程序产物仅编译实际使用的组件（easycom 按需）。
- 性能：mp 产物 easycom 分包编译，不引全量库；H5 无预构建全量包问题。
- 兼容：无 API/DTO/DB 变更；视觉变化即本变更目的（消除原生控件 fit-content
  胶囊缺陷）；`uni.showToast/showModal` 反馈层行为不变。
- 测试：既有 70 单测 + 26 集成不动（请求层/store 层语义未触碰）；本变更验证
  以构建门禁 + 双端走查为准，不断言样式类名与文案（断言纪律）。
- 运维：内联源码更新流程 = `npm pack wot-design-uni@<ver>` 解包替换
  `src/uni_modules/wot-design-uni/`（版本自记录于其 package.json）；库源码缺陷
  可就地临时修补，升级时随换版自然收敛。

## 风险及撤销条件

- v1 冻结：bug 修复不再发布——三页所用控件均为成熟基础组件；阻断性缺陷走
  升级触发条件重开决策。
- uni 编译器对小程序产物把 uni_modules 组件归入 `node-modules/` 镜像目录：
  编译通过、产物结构由开发者工具加载验证（走查为验收项）；若真机出现加载异常，
  属本 ADR 撤销评估范围。
- 内联源码引入供应链面扩大（379 文件入库）：来源为 npm registry 官方 tarball
  逐字节解包，更新流程固定，无额外代理层。

## 维护性证据（2026-11-08 owner 问询裁决，决策维持）

owner 问：「wot 某种意义上断更了？vite 锁死 5.2.8 的话，不就相当于（对我们）断更了吗？」——复核 npm registry 后结论：**冻结 ≠ 断更**，决策不变。

- **活跃度实测（2026-11-08 npm registry）**：`wot-design-uni` v1 终版 1.14.0
  （2026-01-04）后无发布；但上游团队整体迁至 `@wot-ui/ui`（v2）继续活跃发版
  （2.2.0 2026-06-30 → 2.3.x 2026-08 → **2.4.0 2026-10-25**），项目活着，冻结的
  只是我们选的兼容线。对照：`uview-plus` 3.8.138（2026-10-30，活跃）、
  `nutui-uniapp` 1.11.2（2026-03-11，8 个月无发布，真断更，排除）。
- **「同温层」论证**：vite 5.2.8 钉子锁的是整条 uni 工具链而非单库——库与环境
  同步冻结=一致性，不是「平台动而库不动」的腐烂态。DCloud 解钉（peer ≥5.4）之
  日即升级触发器生效之日，逃生舱通向同团队 v2 线（官方迁移映射）。
- **死库四风险逐条称重**：阻断 bug（六个成熟原语 + 全源 vendor 进树可就地修
  补）、平台漂移（wxml 运行时十年级保守兼容 + 工具链同冻）、安全（UI 渲染层
  无输入解析/网络/凭据面）、出路（目录替换 + tgTokens 桥接使换库只动控件层）。
- **替代方案裁决**：uview-plus 活跃是唯一赢项——但集成侵入更高（uni.scss/App.
  vue/main.ts 三处全局 + 全量 app.use + easycom 自定义规则）、npm 直装在本仓
  被 chunkFileNames 阻断（uni_modules 版仅插件市场发布，拿不到可锁版 tarball）、
  JS 源无类型、2021 代设计语言。其发版节奏服务全组件面用户；本仓消费六个收口
  多年的原语控件，活性期望收益≈0。可证伪翻案条件：全面采用 picker/日历/上传
  等追平台演进的组件面并多年跟随时，「活性」权重压倒「成熟」，届时重跑对比。

## 参考

- wot v1 快速上手/自定义主题/国际化/常见问题（master 分支文档 = v1.14 终版）：
  https://github.com/Moonofweisheng/wot-design-uni
- wot v2 线与迁移文档：https://wot-ui.cn（`@wot-ui/ui` 2.4.0，migration-v2）
- uni mp chunkFileNames 推导：`@dcloudio/uni-mp-vite/dist/plugin/build.js`
  `createChunkFileNames`；rollup 拒绝规则：`isPathFragment`（rollup.js）
- pnpm 传递依赖阶梯：pinia@4.1.0 deps `nostics`；`@vue/devtools-kit` →
  `perfect-debounce`；`@intlify/shared` 9.1.9（@dcloudio）vs 11.x（vue-i18n@11）分叉
