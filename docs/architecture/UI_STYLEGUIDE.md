# UI 样式规范（Styleguide）

> 适用 `apps/web`；miniapp 自 2026-11-07 起参照执行（见下方「miniapp 参照执行」节）。token 事实源：`apps/web/src/styles/index.css`（亮暗两套，单源）。
> 文案纪律两端一致（2026-11-07 起 miniapp 已生效）：用户可见文案一律进 i18n 资源单源——web `apps/web/src/locales/`，miniapp `apps/miniapp/src/locales/`（vue-i18n，zh-CN 默认 + en，键结构类型约束一致），禁止页面散落硬编码。
> 背景：owner 反馈初版 UI「AI 味重、有棱有角、不高级」——本规范即为整改标准，新页面/新组件验收按此执行。

## 硬规矩（违反即返工）

1. **禁止魔法值**：色值、字号、圆角、间距一律引用 token（`--el-*` / `--tg-*` 或 Tailwind utility），不得在页面代码写裸 hex/px（4px 基数的间距 utility 除外）。
2. **图标只用组件库**：一律 `@element-plus/icons-vue` 组件（`:icon="组件"` 形式）。**禁止** emoji、Unicode 符号（·、—、▸、✦ 等）充当图标；文本分隔用空格或结构化标签，不用装饰符号。
3. **禁止 AI 味套路**：紫色系渐变（indigo→violet 类）、玻璃拟态（backdrop-blur 玻璃卡）、彩色光斑背景、白字叠透（text-white/80）。门面用纯色 + 低透明度单色晕（品牌色 ≤10%）即可，克制是高级感的前提。
4. **亮暗成对**：新增任何 token 必须同时提供暗色值；涉及界面改动走查亮/暗两档（参照 AGENTS「前端约定」多档走查）。
5. **对比度**：正文文字 ≥4.5:1；大字号标题与图形边界 ≥3:1。品牌色按钮文字用白（亮 #2f5d9e / 暗 #5b87bd 均满足）。

## 颜色 token

| 语义                   | 亮色                                        | 暗色      | 说明                                              |
| ---------------------- | ------------------------------------------- | --------- | ------------------------------------------------- |
| 品牌色 primary（绀青） | `#2f5d9e`                                   | `#5b87bd` | 主按钮/链接/激活态/选中态；EP 色阶 color-mix 现算 |
| success（竹青）        | `#3d8f63`                                   | `#4d9170` | 成功/启用                                         |
| warning（赭金）        | `#b07d2e`                                   | `#b3863f` | 警告/待处理                                       |
| danger / error（赭红） | `#b3402a`                                   | `#bb5642` | 失败/删除/危险操作                                |
| info（灰墨）           | `#6b7280`                                   | `#7c8593` | 中性 tag/占位                                     |
| 页面底                 | `--el-bg-color-page`                        | 同名暗值  | 页面背景（卡片外）                                |
| 卡片/组件底            | `--el-bg-color`                             | 同名暗值  | 卡片、导航、弹窗                                  |
| 分隔/描边              | `--el-border-color-light`                   | 同名暗值  | hairline，刻意低对比                              |
| 文字                   | `--el-text-color-primary/regular/secondary` | 同名暗值  | 主文/常规/次要三级                                |

用法：EP 组件自动消费；自定义区域用 CSS `var(--el-color-primary)` 或 Tailwind 任意值 `text-[var(--el-color-primary)]`。语义选型先问「这是状态还是品牌」——状态用语义色，勿拿品牌色表达成功/失败。

## 字号与字重（四档，勿新增）

| 档   | token                    | 值   | 字重    | 用途                                                         |
| ---- | ------------------------ | ---- | ------- | ------------------------------------------------------------ |
| 标题 | `--tg-font-size-title`   | 20px | 600     | 页面级问候/大标题                                            |
| 正文 | `--tg-font-size-body`    | 14px | 400/600 | 正文与卡片头（区块头 = 正文档 + semibold，`.tg-card-title`） |
| 注释 | `--tg-font-size-caption` | 12px | 400     | 表单 tip、辅助说明、预览块                                   |

弹窗标题经 `--el-dialog-title-font-size: 16px` 统一。**禁止**页面内再出现 13/15/17px 这类夹缝字号。

## 圆角体系

| 层                         | token                       | 值    |
| -------------------------- | --------------------------- | ----- |
| 控件（按钮/输入框/选择器） | `--el-border-radius-base`   | 8px   |
| 小件（tag/预览块）         | `--el-border-radius-small`  | 6px   |
| 卡片                       | `--el-card-border-radius`   | 12px  |
| 弹窗                       | `--el-dialog-border-radius` | 12px  |
| 胶囊                       | `--el-border-radius-round`  | 999px |

## 间距（4px 基数）

- 页面内边距：`--tg-page-padding`（20px）；卡片间距：`--tg-card-gap`（16px）；表单/按钮组内小间距 8px。
- Tailwind 间距 utility（4 的倍数：`gap-2`/`p-5` 等）可用；**禁止** 6/10/14 这类非基数值。
- 区块层级呼吸：卡片内 16px、卡片间 16px、页面分区间可到 24px。

## 阴影

用 EP 三档（已柔化）：`--el-box-shadow` / `-light` / `-lighter`。禁止自造大阴影、禁止彩色阴影。

## 尺寸

- 按钮：表单与工具行一律 default 档；登录/主 CTA 可用 large；表格行内用 link 按钮。
- 图标：12（跟随文字）/16（导航/按钮内）/20（空态/入口卡）三档，同层同档。
- 导航栏高度 `--tg-navbar-height`（56px）、侧栏宽 `--tg-sidebar-width`（224px）。

## 门面基准（已按本规范落地）

登录页 = 页面底色 + 品牌色 7% 单色顶部晕 + 白卡阴影；仪表盘问候 = `primary-light-9` 淡底横幅 + 品牌色图标容器（无渐变无玻璃）；侧栏 logo 区 = 品牌色纯底白字。改门面时以此为准，不加回渐变。

## 标准件清单（用什么、何时包壳）

原则：**Element Plus 原生能直接用的不包壳**（包壳=加间接层，无收益）；只对「同一样板重复出现」的场景收敛薄壳（AGENTS 元原则：第 2 处即抽公共组件）。

| 场景 | 用什么 | 说明 |
| --- | --- | --- |
| 表单弹窗（新增/编辑/带确认按钮的操作弹窗） | `components/FormDialog.vue` | 内置取消/确定 footer、submit loading、`close-on-click-modal=false`；确定文案默认「提交」，保存语义传 `:confirm-text="t('common.save')"` |
| 只读详情展示 | 裸 `el-drawer` / `el-dialog` | 无 footer 的展示场景不套 FormDialog |
| 删除/登出等确认框 | `utils/confirm.ts` 的 `confirmDelete()` / `confirmBox(content)` | type 与按钮文案全仓单源，调用方只传内容 |
| 列表页搜索区 | `components/SearchForm.vue` | 字段经默认插槽传入；折叠经 `v-show="showSearch"` 配合 RightToolbar `v-model:show-search` |
| toast 轻提示 | `ElMessage` 直用 | success 一律 `common.opSuccess`（或页面专属成功文案）；**错误文案一律 request 层映射，页面不自行解析错误码**；不写 duration/grouping 覆盖，默认值即标准 |
| 通知 | `ElNotification` 直用 | 当前无场景；出现第 2 处使用后再评估是否封装 |
| 空态 | `el-empty` 直用 | description 固定 `common.noData` |
| 结果页/错误页 | `el-result` 直用 | 图标按语义选（404 用 `info`，禁 warning 表达「不存在」） |
| 顶部横幅 | 门面基准 pattern（无组件） | 当前仅仪表盘 1 处；第 2 处出现后再抽组件 |
| 图表 | `components/BaseChart.vue` | 注册/主题/配色见下方「图表规矩」；页面禁直接 `echarts.init` |

## 表格规矩

- **表头**：label 一律 i18n；样式用 EP 默认（禁手写表头加粗/背景/行高）。对齐：文本/时间列左对齐，状态/枚举/数字列（排序、耗时、定宽 IP）居中，操作列左对齐。
- **操作列**：`fixed="right"` 默认全配（容器内小表格同样生效）；宽度按按钮数定档——80（1 按钮）/ 140（2 按钮）/ 220（3 按钮），勿自造第四种宽度。只读页是否要操作列按「是否有列表承载不了的详情」判定（oper-log 有详情抽屉故有操作列；login-log 字段全在列表故无）。
- **单元格**：单行省略为基准。长文本列（名称/键/路径/邮箱/备注/消息/标识）必配 `show-overflow-tooltip`；时间列定长不配；枚举/状态/tag 列不配；tag 组列（如用户角色）允许换行，是唯一例外。
- **排序**：P0 禁用 `sortable`——contracts 分页契约无 orderBy 参数，页面单方面加只会造成前后端不一致；启用前必须先扩 API 契约再全仓统一开。
- **滚动**：横向 = el-table 自动横向滚动 + 操作列 fixed 兜底；纵向 = 页面级滚动（main 区），表格不限高；容器内表格（弹窗/抽屉）改用 max-height 内部滚动（先例：role 分配权限弹窗 el-scrollbar max-height 420）。
- **分页**：一律 `Pagination` 单源组件（默认 20，可选 10/20/50/100）。仅数据集有界的全量页（menu 树表、permission 分组）可不分页；数据会增长的全量列表必须分页。**不带页码跳转（jumper）**：定位靠搜索过滤与顺序翻页——跳页是深分页 OFFSET 的高频入口，且数据增删后跳页内容漂移易误操作；若未来数据规模使 OFFSET 成为瓶颈，正确解法是契约层上 keyset 游标分页，而非在 UI 上做加减法。
- **空态**：所有 `el-table` 必配 `#empty`（`el-empty :description="t('common.noData')" :image-size="60"`），含抽屉/分组内嵌表格。
- **搜索**：一律 `SearchForm` 标准件（见标准件清单）。
- **列设置**：RightToolbar 的 columns/visibleCols 仅在列数 ≥8 且存在可隐藏大列的页启用；当前无页达标，组件保留待用。

## 容器尺寸档位

| 容器 | 档位 | 用途 |
| --- | --- | --- |
| 弹窗宽 | 420px | 小型表单（≤2 字段：重置密码、编辑资料） |
| 弹窗宽 | 480px | 标准表单（3-5 字段） |
| 弹窗宽 | 520px | 复杂表单（多字段/多选） |
| 弹窗宽 | 560px | 最复杂（树选择：菜单表单；权限分配面板） |
| 抽屉宽 | 480px | 只读详情（日志详情，el-descriptions 单列） |
| 抽屉宽 | 640px | 管理型（内嵌表格操作：字典项管理） |

- 弹窗/抽屉高度一律内容自适应，禁写死 height；超长内容用 max-height + 内部滚动（先例 `el-scrollbar max-height="420px"`、`.tg-pre max-height 240px`）。
- 卡片：流式自适应，禁写死宽高；登录卡 400px 属门面例外。卡片纵向间距 `mt-4`（= `--tg-card-gap` 16px）。

## 图表规矩

- **一律 `BaseChart`**（自动 resize、卸载释放、亮暗跟随、loading 态）；**禁页面直接 `echarts.init`**。
- 图表类型/组件**只在 `src/utils/echarts.ts` 注册**（按需引入控制包体），要用新类型改这一处。
- **配色只从 token 现算**：`chartThemeColors()` 读 CSS 计算值组成调色板与文字/边框/tooltip 色，页面 option **禁写 hex/rgb 字面量**（引用 helper 返回值合规）。原因：**canvas 不解析 CSS 变量字符串**，`var(--x)` 写进 option 不生效，必须运行时读计算值。
- **页面 option 用 computed 构建**（依赖 `appStore.theme` 与数据）：显式色值槽位（饼图 label、坐标轴 label/轴线、语义色系列）在主题切换时随 computed 重算取新 token 值，BaseChart 监听 option 变化重绘——**禁把色值「烤死」在加载时构建的静态对象里**（否则暗色下亮色标签不可读，仪表盘首版踩过）。
- 状态语义（成功/失败）用语义色（palette[1]/palette[3] 等语义位），**不进分类调色板轮转**；分类系列按 palette 顺序取色。
- **数据口径必须如实标注在卡片头**（如「最近 100 条」），禁把抽样说成全量；客户端聚合只允许叠加在「接口契约允许的最大取样」上（pageSize 上限 100）。
- 卡片内图表高度统一 `BaseChart` 默认 320px；饼图 legend 置底。
- **图表卡片三态**：加载态用 wrapper `v-loading`（对齐表格先例）；数据空或请求失败渲染
  `el-empty`（`common.noData`），禁空白卡体。页面加载函数自行吞错——错误提示由 request 层给出。

## miniapp 参照执行（2026-11-07 起）

- **token 事实源**：`apps/miniapp/uno.config.ts` 的 theme；色值常量单源 `apps/miniapp/src/theme.ts`（`tgTokens`），色板与本文件上表亮色列同值。页面原生组件 prop（如 `<switch color>`）必须引用 `tgTokens`，禁裸 hex。
- **换算基准**：1 工具类单位 = 0.25rem = 8rpx = 4px（与 web 4px 基数一致）；mp 构建经 `presetRemRpx` 自动 rem→rpx（1rem = 32rpx），H5 保持 rem。
- **字号/圆角档位**（对齐 web 四档）：title 1.25rem（40rpx/20px）、body 0.875rem（28rpx/14px）、caption 0.75rem（24rpx/12px）、dialog-title 1rem（32rpx/16px）；圆角 control 0.5rem（16rpx/8px）、card 0.75rem（24rpx/12px）、胶囊 `rounded-full`（999rpx）。
- **pages.json / uni.scss 同步纪律**：两者为静态文件无法引用 token，其色值（globalStyle 导航栏/页面底、tabBar）必须与 `theme.ts` 同值——改色三处同步（theme.ts ↔ pages.json ↔ uni.scss），评审逐一核对。
- **页面样式一律 UnoCSS 工具类**，禁裸 hex/魔法字号/非 4px 基数间距；scoped style 仅保留 utility 覆盖不了的场景。图标纪律沿「硬规矩 2」：一律组件库图标，禁 emoji/Unicode 符号。
- **暗色**：miniapp 当前仅亮色基线（暗色主题为后续独立能力）；新增样式值先在 `theme.ts` 建语义名，为暗色扩展预留位。文案纪律见顶部引言（vue-i18n 资源单源）。
