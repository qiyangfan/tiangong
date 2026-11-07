# 变更提案：miniapp 视觉与单源对齐 web 基线（align-miniapp-ui）

## 为什么变

`docs/architecture/UI_STYLEGUIDE.md` 自述「适用 apps/web（后续 miniapp 参照执行）」——
miniapp 对齐是挂账待办，现状与 web 基线脱节：

1. **时间显示实际 bug**：`sample/index.vue` 与 `mine/index.vue` 的 `formatDate` 用
   `iso.replace('T',' ').slice(0,16)` 裸切 ISO 串，不做时区换算——东八区用户看到的
   createdAt/updatedAt **慢 8 小时**；且违反「时间格式单源」约定（web 有
   `utils/datetime.ts`，miniapp 各页自造）。
2. **token 无单源**：`uni.scss` 仍是 uni-app 脚手架默认值（`$uni-color-primary: #007aff`），
   全仓零引用是死文件；三个页面全部硬编码 hex（`#f6f7f9`/`#8a8f99`/`#26292f`/`#c2455c`…），
   语义色与 web 不一致（success `#3d7a4f` vs web 竹青 `#3d8f63`、danger `#c2455c` vs 赭红
   `#b3402a`），字号/间距各页自定、多非 4px 基数。
3. **文案散落**：用户可见文案硬编码在各页面（「加载中…」「操作成功」「金额格式不正确」…），
   未收敛为资源单源。
4. **样式技术栈缺位**：web 端为 Tailwind v4 + token 单源；miniapp 无任何原子 CSS 方案。
   owner 决策（2026-11-07）：引入 **UnoCSS（unocss-applet presetApplet + presetRemRpx）** 作为
   miniapp
   原子样式栈（uni-app 生态对 Tailwind 语义的等价物，小程序 class 转义已处理）；
   时间方案采用**两端统一 dayjs**（web 手写实现改为 dayjs 封装，API 与行为契约不变）。

## 范围与定级

- 两端统一 dayjs：web `datetime.ts` 改 dayjs 实现（导出函数与行为契约不变，既有测试原样
  通过）；miniapp 新增同名单源 + 测试；三页接入修时区 bug：**P0 缺陷修复**。
- UnoCSS 接入 + token 单源（`uno.config.ts` theme）+ 三页样式 utility 化 + `uni.scss`
  瘦身为内置变量同值映射 + `pages.json` 色值对齐：**P1 视觉基线**。
- ~~文案单源（`src/locales/zh-CN.ts` 常量，页面零散硬编码收编；不引 vue-i18n）~~：
  **移交 `add-miniapp-state-i18n`**（2026-11-07 owner 决策推翻「不引 vue-i18n」口径，
  文案单源升级为 vue-i18n 双语资源，随状态基线一并落地）。
- UI_STYLEGUIDE 增补 miniapp 章节：**P1 文档**。
- 明确不做：小程序暗色主题（darkmode/themeLocation 留待需要）、图标体系（当前页面无图标，
  引入时经 iconfont 单源）、新增页面/组件抽象。

## 契约与安全影响

- **不改任何对外契约**：无 API、DTO、DB schema 变更；纯展示层。
- **行为变化（有意的）**：miniapp 时间展示从「UTC 裸串」变为「本地时区 YYYY-MM-DD HH:mm:ss」，
  与 web 端全站口径一致；web `datetime.ts` 导出签名不变。
- **依赖变化**：新增 dayjs（两端 dependencies，显式声明，web 不再依赖传递引入）与
  unocss / unocss-applet（miniapp devDependencies）；`pnpm-lock.yaml` 同步入库。

## 验收标准

- `formatDateTime('2026-11-07T08:09:10Z')` 在宿主时区渲染本地时间（测试与宿主时区无关）；
  miniapp 页面不再出现裸 ISO 串操作。
- `uno.config.ts` 为色值/字号/圆角 token 事实源；三个页面 scoped 样式中无裸 hex 与魔法字号
  （原生组件 prop 所需色值经同一导出常量引用）；`uni.scss` 变量与 token 同值映射。
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；
  `pnpm --filter @tiangong/miniapp build:h5` 与 `build:mp-weixin` 编译通过。
- 真机 / 微信开发者工具视觉走查如无法自动化，如实标注 NOT VERIFIED。
