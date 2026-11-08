# 设计：miniapp 组件层采用 wot-design-uni

## 授权影响

- 无。纯展示层与 miniapp 构建链改造，不触碰鉴权、权限、路由与请求契约；
  `utils/request.ts`、`utils/auth.ts`、stores 语义不动。决策与版本/安装路线
  论证见 ADR-0008。

## 迁移影响

- 无 schema / API 变更。依赖变化：miniapp devDependencies 增 `sass`（精确
  `1.78.0`）；无 npm 运行时依赖新增——wot 以官方 tarball 内联
  `apps/miniapp/src/uni_modules/wot-design-uni/`（2.8MB/379 文件，版本自记录
  于其 package.json）。
- 更新流程（写入 UI_STYLEGUIDE）：`npm pack wot-design-uni@<ver>` → 解包 →
  替换 uni_modules 目录 → 双目标构建 + 走查。v1 冻结线更新预期低频；v1→v2
  升级触发条件见 ADR-0008。
- 工具链保持现状：`vite.config.mts` 的 preserveSymlinks:false 覆盖、
  pnpm 严格布局（无 hoist）一律不动——PoC 阶梯证实 npm 直装/hoist 路线在
  本仓 monorepo 均不可行，内联路线不依赖任何布局妥协。

## 测试影响与分层原则

| 层       | 职责         | 本次内容                                                                                 |
| -------- | ------------ | ---------------------------------------------------------------------------------------- |
| 既有单测 | 回归保护     | 70 例原样通过（请求层/store 层语义零触碰；换控件不改行为契约）                           |
| 构建验证 | 编译链路     | `build:h5` / `build:mp-weixin` 全绿；mp 产物含 wd-* 组件（easycom 按需编译，不引全量库） |
| 类型检查 | 严格性不降级 | vue-tsc 含 `noUncheckedIndexedAccess` 全绿；库源码经 exclude/隔离导入不进检查程序        |
| 手动走查 | 视觉与交互   | 开发者工具 automator 三页走查对照 PoC 前截图（before/after）；真机 NOT VERIFIED 如实声明 |

- 断言纪律：不新增 UI 层单测（控件替换无行为契约可锁，锁样式类/文案违反断言
  纪律）；locale 桥接行为（wot Locale 随 appStore.locale 切换）如需锁定，
  以 store 级结构断言承载，不断言具体文案。

## 关键设计

1. **版本与安装**：wot-design-uni 1.14.0 精确锁版，uni_modules 内联。easycom
   零配置（uni_modules 原生规范，pages.json 不加 custom 规则）。sass 精确锁
   1.78.0（v1 文档硬约束：Dart Sass 3.0 移除 legacy API 后 1.79+ 不可用；
   vite 5.2.8 走 legacy 渲染链）。
2. **typecheck 隔离三件**（PoC 全绿组合）：
   - tsconfig `exclude: ["src/uni_modules"]`——库源码（约 50 处库内严格性错误）
     不进 vue-tsc 程序；
   - `ConfigProviderThemeVars` 经深路径 type-only 导入
     （`@/uni_modules/wot-design-uni/components/wd-config-provider/types`），
     不从包根导入（根 index 会拉全量组件源）；
   - `@/uni_modules/wot-design-uni/locale` 经 tsconfig paths 指向本地类型垫片
     `src/shims/wot-locale.ts`（带最小实现的 .ts 形态——.d.ts 形态会触发
     vue-tsc Debug Failure 编译器崩溃；运行时不受影响，vite 仍加载真实模块）。
   - 官方推荐的 `types: ["wot-design-uni/global"]` 不采用（会把全部组件源拉进
     检查程序），代价是模板内 wd-* 组件无 props 类型提示，由走查补偿。
3. **主题桥接单点**：`src/theme.ts` 在 tgTokens 旁导出 `wotThemeVars`
   （`ConfigProviderThemeVars` 类型：colorTheme/colorSuccess/colorWarning/
   colorDanger 等语义变量），三页根节点包裹
   `<wd-config-provider :theme-vars="wotThemeVars">`——色值单源纪律延伸到组件库
   变量，桥接层零裸 hex。圆角对齐：v1 `wd-button` 默认 round=true（胶囊），
   本仓控件档 16rpx → `:round="false"` + 工具类 `rounded-control`。
4. **三页控件替换映射**：
   - login：`wd-input` ×2（密码字段 `show-password` 开启明暗文切换，maxlength/
     confirm-type 透传原生能力）+ `wd-button`（block、`:loading`、`:disabled`）；
   - sample：列表卡片保留工具类（信息展示非控件）；弹层 `view+fixed` 遮罩方案
     换 `wd-popup`（遮罩点击关闭、层级/滚动锁定由组件承担）；表单 `wd-input` ×2
     - `wd-switch`；新增/取消/保存/删除四按钮 `wd-button`（删除用 danger 语义、
       保存 `:loading`）；
   - mine：资料行 `wd-cell-group` + `wd-cell`（语言切换行保留点击交互、值列
     语义对齐）、退出登录 `wd-button`（`:loading`）。
     空态/加载态保留既有工具类文本（wd-status-tip 不引入——最小范围）。
5. **平台反馈层不替换**：`uni.showToast`/`uni.showModal` 全站保持——request 层
   会话终局提示、页面操作反馈的语义已被单测锁定；wot 的 wd-toast/wd-message-box
   需要页面级挂载点，替换属无收益的全站扰动。
6. **locale 桥接**：wot 默认 zh-CN；`Locale.use('en-US', enUS)` 注册英文包并
   随 `appStore.locale` 切换（watch 接线在装配期初始化一次）。现用组件无内置
   文案，本接线为 calendar/picker 类组件预留，属前瞻基建（P2）。

## 运行形态

- 门禁：根 `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；
  `build:h5` / `build:mp-weixin` 复验（appid env 注入链路不受影响，PoC 已证）。
- 走查：DevTools automator 三页（登录 → 示例数据 → 我的）+ 截图对照；
  `console.error` 应为 0。真机预览 NOT VERIFIED 如实标注。
- 文档：UI_STYLEGUIDE「miniapp 参照执行」节增补（组件选用清单、theme-vars
  桥接纪律、内联更新流程）；BUILD_PLAN §7.1 已知坑增补（chunkFileNames 阶梯、
  typecheck 隔离三件、sass 锁版）；DELIVERY_REPORT 验证记录。
