# AGENTS.md — 所有 Coding Agent 的工作契约

## 第一职责

构建**业务无关**、可交付的全栈管理后台脚手架。RuoYi 仅作为能力与交互体验基准，不照搬 Java 类、SQL、UI 资产或授权代码。禁止出现图书、订单、课程、商家、具体客户等业务实体。

## 阅读顺序

1. `CONSTITUTION.md`（优先级最高）
2. `docs/requirements/FUNCTION_MATRIX.md` 与 `ACCEPTANCE.md`
3. `docs/adr/` 与 `docs/architecture/`
4. `openspec/specs/`，然后该变更 `proposal.md/design.md/tasks.md`
5. 现有代码、实际测试结果

## 必须遵守

- 先勘察再修改；以代码运行行为为准，不因注释或 README 自称而认定已实现。
- 新增或改变平台行为，先更新 OpenSpec；关键架构决定先写/修改 ADR。
- 原则冲突：安全与不可逆操作 > 对外契约兼容 > 可验证事实 > 交付效率 > 美观偏好。
- 最小完整设计，模块化单体；不引入微服务、MQ、K8s、复杂 DDD、多租户等预设能力。
- 不以编译通过代替端到端验证。不得禁用 lint/strict/测试或提交假成功截图。
- 不写硬编码密码、生产密钥、JWT secret；不能将令牌/敏感个人信息写日志。
- API 权限由后端强制；前端菜单隐藏不等于鉴权。
- 需求变更前评估 API、DB migration、客户端兼容和回滚策略。
- 每个任务结束报告：已实现文件、验证命令及结果、遗留问题、风险、下一步。

## 工作流程

`理解代码 -> OpenSpec proposal/spec/design/tasks -> 最小实现 -> 测试 -> 代码审查 -> 文档更新 -> 验收 -> archive`。
单纯文案/微小修复可以简化过程，但不得越过安全和契约检查。

## 质量门禁

- `pnpm install --frozen-lockfile`（lockfile 建立后）
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- 依赖真实数据库的 integration/e2e、认证与权限负例、migration up、初始种子、容器健康检查
- 至少一次 Web 与微信小程序共用 API 的真实纵向闭环
- 未能运行的项目要明确标注 NOT VERIFIED，不可报告通过

## 协作约束

禁止未经确认改公开 API、删除数据库字段或修改已有业务语义。并行 Agent 按目录所有权拆分，最终由主 Agent 执行集成和冲突检查。

## 本仓执行约定（owner 偏好沉淀 2026-11-07，与上文冲突时以本节为准）

参考 owner 既有工程（energy-ai-platform / longzhong 聚合层）沉淀；违反即返工。

### 语言口径

- 对话、方案、注释、Markdown、提交信息：**简体中文**。
- 代码标识符、错误码、DTO 校验 message、日志文本：**英文**。
- 注释只写代码看不出的业务意图、约束和取舍，不复述语法；方法默认一句简短说明（讲清职责或结果，
  签名自明且无副作用时可省略）；禁黑话（赋能/链路/闭环/下沉/该模块旨在/底层逻辑等）与过程叙事（「本次/之前」）。

### 门禁与测试纪律

- 权威门禁：`pnpm lint && pnpm typecheck && pnpm test && pnpm build`（CI 为最终执法点；本地全绿是提交前提）。
- 测试同步原则：行为变更必须同一变更内带测试；修 bug 先写复现测试再改实现。
- 断言纪律：只锁契约与行为结果（错误码、payload 结构、业务结果与状态转移、安全方向 fail-closed、
  边界与非法输入被拒）；**禁止断言**文案措辞、i18n 值、日志级别、样式类、组件内部结构；禁快照测试。
- 测试失败先归因 `git diff`（是不是自己改坏的），禁止削足适履放松断言；确属有意行为变更才同步改测试。
- 门禁未跑或失败时如实标注 NOT VERIFIED，禁止伪报通过。

### 工程习惯

- 本地基础环境（MySQL 等）统一用 `~/workspace/env` 共享栈（env-mysql 8.4，宿主 **3307**（3306 被宿主幽灵转发占用），
  应用账号 `tiangong/tiangong_dev`，库 `tiangong`，dev 账号持有 ALL ON `*.*` 供 migrate shadow 库）；`deploy/compose.dev.yaml` 仅作无共享栈环境的回退；
  CI/生产口径恒为 mysql:8.4。
- 最小可验证改动；复用既有模式与组件；不为「未来可能需要」新增抽象。
- 输入边界必校验；错误信息不得泄露内部异常、密钥、令牌。
- 前端筛选只服务展示；权限、状态、数据量类条件必须同时在服务端校验。
- 生成文件不手改（代码生成器产物、OpenAPI 生成物）；重新生成而非手工修补。
- `pnpm-lock.yaml` 入库，不得进 .gitignore。
- 文档（HANDOFF/交付报告）是现状快照不是过程日志：只写当前形态、未完成项、接下来做什么；git 细节以 git log 为准。

### 前端约定（Element Plus 语境，承 longzhong 前端宪法精神）

- 元原则：**用组件不用手搓；用默认不胡乱覆盖；用 token 不用魔法值**。
- 同类 UI 出现第 2 处即抽公共组件；页面骨架只用既有标准件（Pagination/DictTag/SearchForm 等）。
- 空态、加载态、错误态必须有界面；错误走明确提示，禁静默空白。
- 时间/数字格式一律走 `src/utils/datetime.ts` 单源，禁页面内裸渲染 ISO 串。
- 暗色主题一级公民：新增样式 token 必须同时给暗色值；用户可见文案进 i18n 资源（zh-CN 默认）。
- 多档走查：375/768/1280 × 亮暗（涉及响应式改动时）。

### Git

- 阶段性 commit 已获 owner 授权（见 docs/BUILD_PLAN.md 门禁要求）；push/远端操作仍需逐次明确指令。
- 提交信息用简体中文；文档不写提交哈希。
