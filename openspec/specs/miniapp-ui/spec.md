# miniapp 视觉基线 — Implemented baseline specification

> 已实现并通过验收（2026-11-07 变更 align-miniapp-ui 奠基；2026-11-08 变更
> adopt-wot-design-uni 增组件库控件层与 tabBar 图标）：验收证据见
> docs/quality/DELIVERY_REPORT.md 与测试套件（miniapp 单测 30 + `build:h5` /
> `build:mp-weixin` 编译验证；微信开发者工具模拟器走查 + H5 playwright 交互环
> 走查已过，真机预览 NOT VERIFIED）。

## Purpose

定义 miniapp 视觉层的目标基线：样式 token 单源与 web 基线对齐、字号/圆角/间距阶梯一致、
时间展示单源且时区正确、UnoCSS 接入后 H5 与微信小程序双端构建可通过；表单与交互控件
由 wot-design-uni 组件库承载，组件库语义变量经 tgTokens 单点桥接。

## Requirements

### Requirement: 样式 token 单源

miniapp SHALL 以 `uno.config.ts` 的 theme 为色值/字号/圆角 token 事实源：品牌色与语义色
SHALL 与 web 基线一致（品牌绀青 `#2f5d9e`、竹青 success、赭金 warning、赭红 danger、灰墨
info）；页面代码 SHALL NOT 出现裸 hex 色值、魔法字号与非 4px 基数间距（原生组件 prop 所需
色值 SHALL 经同一导出常量引用）；`pages.json` 静态色值 SHALL 与 token 同值。
组件库（wot-design-uni）主题变量 SHALL 经单点桥接层（tgTokens 派生的
`wd-config-provider` theme-vars）供给，桥接层 SHALL NOT 出现脱离 token 源的裸 hex。
tabBar 图标 SHALL 为组件库同源字形的栅格 PNG（经入库脚本生成、可复现），
未选中/选中色值 SHALL 与 token 同值，SHALL NOT 使用 emoji 或手绘不可复现资产。

#### Scenario: 语义色对齐

- **GIVEN** web 端 UI_STYLEGUIDE 定义的语义色
- **WHEN** 检查 miniapp 启用/停用 tag、危险按钮、品牌按钮（含 wd-* 组件渲染的
  primary/success/warning/danger 控件）
- **THEN** 色值与 web 基线一致，且页面代码与 theme-vars 桥接层中均不存在裸 hex。

### Requirement: 字号/圆角/间距阶梯对齐

miniapp SHALL 使用与 web 四档字号对应的阶梯（标题 40rpx / 正文 28rpx / 注释 24rpx）、
对齐的圆角体系（控件 16rpx / 卡片 24rpx / 胶囊 999rpx）与 4px 基数间距
（默认 spacing 1 单位 = 0.25rem = 8rpx，mp 端经 presetRemRpx 换算）。

#### Scenario: 卡片与按钮基线

- **WHEN** 渲染示例数据页卡片与主按钮
- **THEN** 卡片圆角 24rpx、控件圆角 16rpx、间距均为 4px 基数的整数倍。

### Requirement: 时间展示单源与时区正确

miniapp SHALL 经 `utils/datetime.ts`（dayjs 实现，与 web 同签名）格式化全部时间展示，
SHALL NOT 页面内裸操作 ISO 串；ISO UTC 时间 SHALL 按宿主本地时区渲染
`YYYY-MM-DD HH:mm:ss`。

#### Scenario: 东八区时间正确

- **GIVEN** 服务端返回 `2026-11-07T08:09:10Z` 且宿主时区为 UTC+8
- **WHEN** 示例数据页/我的页渲染该时间
- **THEN** 显示 `2026-11-07 16:09:10`（本地时间），不再出现 UTC 裸串。

### Requirement: 双端构建可通过

UnoCSS 接入后 miniapp SHALL 通过 H5 与微信小程序两条编译链路
（`build:h5` / `build:mp-weixin`），小程序端 class 转义由 presetApplet/transformerApplet
处理（rem→rpx 换算由 presetRemRpx 承担）。wot-design-uni 组件库 SHALL 以 uni_modules
方式内联于 `src/uni_modules/`（npm 直装与 hoist 路线经 PoC 证实在本仓 monorepo 被
uni 小程序编译器阻断，见 ADR-0008）；其样式编译所依赖的 sass SHALL 锁定 1.78.0；
库源码 SHALL NOT 进入 vue-tsc 检查程序，本仓 TypeScript 严格设置 SHALL NOT 因引入
组件库而降级。

#### Scenario: 编译验证

- **WHEN** 执行两条构建命令
- **THEN** 均编译成功，产物含实际使用的 wd-* 组件（easycom 按需编译，不引全量库）
  且含经转义的工具类。

#### Scenario: 严格类型检查不降级

- **WHEN** 执行 `vue-tsc --noEmit`（miniapp typecheck）
- **THEN** 全绿，且 tsconfig 的 strict / noUncheckedIndexedAccess 设置与引入组件库前
  逐字一致。

### Requirement: 组件库控件层

miniapp 三页的表单与交互控件 SHALL 使用 wot-design-uni 组件承载：登录页账号/密码输入
SHALL 用 `wd-input`（密码字段 SHALL 提供明暗文切换）、提交按钮 SHALL 用 `wd-button`
（含 loading 与禁用态）；示例数据页的编辑弹层 SHALL 用 `wd-popup`，表单控件用
`wd-input`/`wd-switch`，操作按钮用 `wd-button`；我的页资料行 SHALL 用
`wd-cell-group`/`wd-cell`，退出登录用 `wd-button`。页面模板 SHALL NOT 保留承担表单或
交互职责的原生 `input`/`button`/`switch`；平台反馈层（`uni.showToast`/`uni.showModal`）
SHALL NOT 被组件库替换（请求层会话终局提示语义已被单测锁定）。组件库内置文案的 locale
SHALL 随应用语言偏好切换（`Locale.use` 接线）。

#### Scenario: 三页控件替换

- **WHEN** 检查 login / sample / mine 三页模板
- **THEN** 表单与交互控件均为 wd-* 组件且带正确交互态（提交按钮 loading、密码字段
  可切换明文、弹层遮罩点击可关闭），原生 input/button/switch 不再出现。

#### Scenario: 平台反馈层保持

- **WHEN** 触发会话终局 401、登录失败提示与示例数据操作成功/失败提示
- **THEN** 提示仍经 `uni.showToast`/`uni.showModal` 呈现，语义与既有单测锁定一致。

#### Scenario: 组件库文案随语言切换

- **GIVEN** 应用语言偏好为 English
- **WHEN** 渲染含内置文案的 wot 组件（现用组件暂无内置文案，接线面向后续组件）
- **THEN** 组件库内置文案按 en-US 语言包呈现，且随语言偏好即时切换。
