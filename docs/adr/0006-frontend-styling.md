# ADR-0006: 前端样式方案 — Element Plus 为主 + Tailwind v4 为辅

状态：Accepted | 日期：2026-11-07

## 背景

Stage 3 交付后 owner 反馈 UI 观感不足。三个既有前端项目均使用 Tailwind（energy web-admin 用 v3.4，muniu/jinguan 用 v4 + @tailwindcss/vite）；ADR-0001 只锁定了 Element Plus 组件库，未约定 CSS 方案。需要明确两者的分工边界与共存方式。

## 决策

引入 Tailwind CSS v4（`@tailwindcss/vite` 插件，CSS-first 配置，无 tailwind.config.js），与 Element Plus 按层分工：

- **Element Plus 层**：一切交互控件（表格/表单/弹窗/菜单/抽屉/分页等）与其内部样式；主题通过覆盖 EP 的 CSS 变量定制（品牌主色、圆角、暗色色阶），不修改组件内部类名。
- **Tailwind 层**：布局（flex/grid/间距/尺寸）、自定义区域排版、响应式、门面视觉（登录页/仪表盘/空态）；不用于覆盖 EP 组件内部样式。
- **Token 单源**：设计变量以 CSS 自定义属性定义在 `src/styles/index.css`（亮暗两套值），EP 与 Tailwind 各自消费；暗色统一由 `html.dark` 驱动（EP dark css-vars 与 Tailwind `@custom-variant dark` 同一开关）。

共存约束：**禁用 Tailwind preflight**（只引入 theme 与 utilities 两层），避免其全局重置破坏 EP 组件样式；`dark:` 变体定义为 `&:where(.dark, .dark *)`。

## 对照选项

- 纯 EP + token 打磨（零新依赖）：改动最小，但布局与自定义区域排版能力弱，且与 owner 既有项目栈不一致。
- Unocss / 手写 CSS：preset 生态与 owner 项目经验不匹配。
- Tailwind v4（采纳）：对齐既有栈；CSS-first 无配置文件；utilities 层与 EP 组件样式天然分层。

## 后果

- 样式审查双轨：EP 组件行为看 EP 文档，布局排版看 Tailwind；两者共用 `--el-*` 变量时以 EP 语义 token 为准。
- preflight 缺位意味着 Tailwind 的默认样式假设（如 border 颜色）不完全成立，utility 使用时注意显式声明。
- 主题切换过渡压制（`theme-switching` 类，见 ADR 附录与 `stores/app.ts`）必须同时覆盖两层的 transition。
