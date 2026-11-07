# miniapp 视觉基线 — ADDED

## ADDED Requirements

### Requirement: 样式 token 单源

miniapp SHALL 以 `uno.config.ts` 的 theme 为色值/字号/圆角 token 事实源：品牌色与语义色
SHALL 与 web 基线一致（品牌绀青 `#2f5d9e`、竹青 success、赭金 warning、赭红 danger、灰墨
info）；页面代码 SHALL NOT 出现裸 hex 色值、魔法字号与非 4px 基数间距（原生组件 prop 所需
色值 SHALL 经同一导出常量引用）；`pages.json` 静态色值 SHALL 与 token 同值。

#### Scenario: 语义色对齐

- **GIVEN** web 端 UI_STYLEGUIDE 定义的语义色
- **WHEN** 检查 miniapp 启用/停用 tag、危险按钮、品牌按钮
- **THEN** 色值与 web 基线一致，且页面 scoped 样式中不存在裸 hex。

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
（`build:h5` / `build:mp-weixin`），小程序端 class 转义由 presetApplet/transformerApplet 处理
（rem→rpx 换算由 presetRemRpx 承担）。

#### Scenario: 编译验证

- **WHEN** 执行两条构建命令
- **THEN** 均编译成功且产物含经转义的工具类。
