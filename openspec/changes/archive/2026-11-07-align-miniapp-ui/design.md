# 设计：miniapp 视觉与单源对齐 web 基线

## 授权影响

- 无。纯展示层与客户端工具改造，不触碰鉴权、权限、路由与请求契约；`utils/request.ts`、
  `utils/auth.ts` 会话语义不动（归 `unify-terminal-401-relogin`）。

## 迁移影响

- 无 schema / API 变更。依赖新增：dayjs（两端 dependencies）、unocss + unocss-applet
  （miniapp devDependencies）。
- web `datetime.ts` 由手写实现换 dayjs：**导出函数名、参数、返回值契约不变**，既有
  `datetime.test.ts` 断言原样通过（该测试已与宿主时区无关）；`formatCost` 与 dayjs 无关，
  保持纯 JS 实现。
- `uni.scss` 瘦身：删除死变量，保留 uni-app 内置 `$uni-*` 变量名但值映射到 token 同值
  （内置组件与第三方插件兼容面），注释标明事实源。页面样式不再消费 `$uni-*`。

## 测试影响与分层原则

| 层           | 职责             | 本次内容                                                                                                |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------------------- |
| web 单元     | 时间契约回归     | `datetime.test.ts` 断言不变，实现换 dayjs 后原样通过（换实现不松断言）                                  |
| miniapp 单元 | 新增时间单源契约 | `datetime.test.ts`：空值/非法值 `-`、ISO UTC 按宿主时区渲染、`formatDate` 取日期部分、`formatCost` 分界 |
| 构建验证     | 编译链路         | `build:h5` 与 `build:mp-weixin` 编译通过（UnoCSS 小程序 class 转义生效）                                |
| 手动走查     | 视觉基线         | 微信开发者工具 / 真机对照 UI_STYLEGUIDE 走查三页；无法自动化处标注 NOT VERIFIED                         |

- 断言纪律：锁行为结果（格式化输出、时区正确性、构建成功），不断言样式类名与文案措辞；
  禁快照测试。

## 关键设计

1. **token 单源 = `uno.config.ts`**：theme 承载色值（品牌绀青 `#2f5d9e`、语义四色对齐 web
   竹青/赭金/赭红/灰墨、文字三级与页面底对齐 EP 亮色值）、字号阶梯（title 40rpx / body
   28rpx / caption 24rpx，对应 web 20/14/12px）、圆角（控件 16rpx / 卡片 24rpx / 胶囊
   999rpx，对应 8/12/999px）；间距直接用默认 spacing（1 单位 = 0.25rem = 8rpx = 4px，
   mp 端经 presetRemRpx 自动 rem→rpx，与 web 4px 基数天然一致）。同时导出 `tgTokens` 常量供原生组件 prop（如 `<switch color>`）
   import 同一常量——色值只有一处事实源。
2. **pages.json 为静态 JSON 无法引用 token**：其色值（导航栏/tabBar/页面底）须与 token 同值，
   同步纪律写入 UI_STYLEGUIDE；页面底统一为 `#f2f3f5`（EP `--el-bg-color-page` 亮色值，
   替换现状 `#F6F7F9`）。
3. **UnoCSS 接入**：`vite.config.mts` 挂 `unocss/vite` 插件；presets 用 `unocss-applet`
   的 `presetApplet` + `presetRemRpx`（rem↔rpx 换算），transformers 用 `transformerApplet`
   （小程序 class 名转义；unocss-applet 0.16 已移除旧名 presetWeapp/transformerClass）。
   scoped style 仅保留 utility 覆盖不了的少量场景（弹层遮罩等），其中色值一律走 token
   常量或 theme 类，禁止裸 hex。
4. **文案单源**：移交 `add-miniapp-state-i18n`（vue-i18n 双语资源 + 语言偏好）。
   本变更只约束「页面不得散落硬编码色值/字号/间距」，文案键接线由该变更负责。
5. **时间单源**：miniapp 新增 `src/utils/datetime.ts`，与 web 同签名（formatDateTime /
   formatDate / formatCost），内部 dayjs 实现；三页删除本地 `formatDate`，导入单源；
   `createdAt/updatedAt/lastLoginAt` 展示统一为本地时区 `YYYY-MM-DD HH:mm:ss`。

## 运行形态

- 门禁：根 `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿（miniapp 测试经
  既有 vitest 配置纳入）；追加 `pnpm --filter @tiangong/miniapp build:h5` 与
  `build:mp-weixin` 作为构建验证（miniapp 无根 build 脚本，维持现状不新增）。
- eslint 覆盖 `uno.config.ts`（根 flat config 扫全仓 TS）。
