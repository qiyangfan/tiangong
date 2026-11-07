# 变更提案：miniapp 引入 pinia 与 vue-i18n 客户端基线（add-miniapp-state-i18n）

## 为什么变

owner 决策（2026-11-07）：pinia 与 vue-i18n 是脚手架的基础能力，miniapp 端必须具备，
不能以「单语言、页面少」为由长期缺位。本决策**推翻** `align-miniapp-ui` proposal 中
「不引 vue-i18n——依赖已在工程瘦身时删除，单语言脚手架用常量资源即可满足文案进资源纪律」
的口径，并接管其任务 6（文案单源）：文案资源从纯常量升级为 vue-i18n 资源单源。
`align-miniapp-ui` 其余任务（dayjs 时区修复、UnoCSS 视觉基线）不受影响。

现状：miniapp 装配零插件（main.ts 仅 createSSRApp + 全局异常兜底）；用户可见文案硬编码
于三个页面、`request.ts` 兜底与 `global-error.ts`（约 40 处）；会话凭据已收敛于
`utils/auth.ts` 存储单源，页面以局部 ref 自取自存，无跨页共享状态。

## 范围与定级

- 依赖与装配：miniapp 引入 pinia 与 vue-i18n（版本对齐 web 已锁线），main.ts 按 web
  装配顺序接线（createPinia → app store init → use(i18n)）：**P1 基线**。
- 状态基线：`stores/auth.ts`（会话态：登录写入、身份读取、profile 拉取、登出清理）与
  `stores/app.ts`（语言偏好：持久化、启动恢复、导航标题/tabBar 运行时同步）。
  `utils/auth.ts` 存储单源与 `request.ts` 401 逻辑零改动：**P1 基线**。
- 文案单源：`locales/{zh-CN,en,index}` 双语资源（en 以 `typeof zhCN` 锁键结构），三页 +
  request.ts + global-error.ts 硬编码文案收编；「我的」页加语言切换项；页面导航标题与
  tabBar 文案随语言运行时同步（pages.json 中文保留作首帧默认）：**P1 规范**。
- 明确不做：持久化插件（手写 storage 对齐 web）、暗色主题、UnoCSS/dayjs（属
  align-miniapp-ui）、web 端改动、401/刷新逻辑改动、manifest.json 应用名。

## 契约与安全影响

- 不改任何对外契约：无 API、DTO、DB schema 变更；纯客户端装配与展示层。
- 行为不变量承袭：终局 401 语义（identity-access spec）由 `request.ts` 原样保持，既有
  7 组单测回归护栏不动；`global-error.ts` 的节流行为不变（仅提示文案进资源）。
- 依赖变化：miniapp dependencies 新增 pinia、vue-i18n；`pnpm-lock.yaml` 同步入库。
- 存储新增 key `tg_locale`（与 web 同名同语义），仅存语言码，不含敏感数据。

## 验收标准

- 三页与 request.ts/global-error.ts 无硬编码用户可见文案（pages.json/manifest.json
  编译期首帧默认除外）。
- 语言切换：mine 页切换后页面文案、导航标题、tabBar 文案同步；重启后语言保持；
  非法持久化值回落 zh-CN（fail-closed）。
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；`build:h5` 与
  `build:mp-weixin` 编译通过（pinia/vue-i18n × uni 编译器兼容性验证点）。
- 既有 miniapp 单测（终局 401 七组）原样通过；新增 auth/app store 行为测试
  （锁行为契约，不锁文案措辞）。
- 真机 / 微信开发者工具走查无法自动化时如实标注 NOT VERIFIED。
