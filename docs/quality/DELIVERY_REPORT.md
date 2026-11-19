# 天工脚手架交付报告（2026-11-19）

> 现状快照：只写当前形态、验证证据与遗留项；过程与变更历史看 git log。
> 交接权威文件是 `docs/BUILD_PLAN.md`（§7 状态表 / §7.1 必读事实 / §8 执行指令）。

## 交付范围

BUILD_PLAN §7 全部 6 个阶段（Stage 0-6）已过门禁；2026-11-07 五变更与 2026-11-08/09 两变更（wot 组件层、add-basic-metrics）经 owner
验收归档（`openspec/changes/archive/2026-11-0{7,8,9}-*`），
`openspec/specs/` 现为 10 个能力基线（validate 全绿）：

- `add-e2e-test-hardening`：补齐 FUNCTION_MATRIX P0「测试/CI/部署」承诺的自动化 e2e
  （Playwright 驱动真实 api + web + MySQL，3 spec 5 例入 CI）+ web 请求层/时间单源单测防护
  - `TEST_DATABASE_URL` 修复 + `JWT_REFRESH_SECRET` 死配置清除；e2e-testing 基线落地。
- `unify-terminal-401-relogin`（owner 决策）：统一 web/miniapp 终局 401 恢复语义——按
  HTTP 401 判定、终局清理并引导重登、提示收口会话方、文案区分停用/过期（miniapp 位置感知
  防无凭据误报停用）；identity-access 基线增补「客户端终局 401 恢复」不变量。
- `add-frontend-global-error-handling`：两端全局异常兜底（errorHandler / uni onError /
  unhandledrejection / router.onError / guard 失败中止）+ 3s 节流提示 + miniapp
  `TgError.requestId` 透传；frontend-resilience 基线落地。
- `align-miniapp-ui`：UnoCSS（presetApplet + presetRemRpx）token 单源 + 三页 utility 化 +
  dayjs 双端时间单源（修 UTC 裸切时区 bug）+ uni.scss 瘦身；miniapp-ui 基线落地。
- `add-miniapp-state-i18n`（owner 决策，推翻 align-miniapp-ui「不引 vue-i18n」口径）：
  pinia 会话态/语言偏好 + vue-i18n 双语资源（文案收编、语言切换、导航/tabBar 运行时同步、
  `tg_locale` 持久化）；miniapp-client 基线落地。
- `adopt-wot-design-uni`（2026-11-08 归档）：miniapp 组件层选型 wot-design-uni 1.14.0
  （uni_modules 内联安装，npm 直装路线经 PoC 实证被 uni 小程序编译器阻断）——三页
  表单/交互控件换 wd-* 组件、主题经 `theme.ts` wotThemeVars 单点桥接 tgTokens、
  tabBar 增 EP 同源字形图标（生成脚本可复现）、46px 控件档统一；门禁与双端构建全绿，
  模拟器渲染走查 + H5 playwright 全交互环走查通过（console.error=0）。决策记录
  （含「v1 冻结 ≠ 断更」证据链）见 `docs/adr/0008-adopt-wot-design-uni.md`；
  组件库控件层与 tabBar 图标条款并入 miniapp-ui 基线。
- `add-basic-metrics`（2026-11-09 归档）：`GET /api/v1/metrics` Prometheus 文本端点
  （prom-client 进程默认指标 + HTTP RED 中间件；route 标签仅路由模板，查询串/路径参数
  不入标签；`METRICS_ENABLED=false` 关端点且停记 HTTP 指标）——FUNCTION_MATRIX P0
  「基础 metrics」字面缺口补齐；「基础运行指标」并入 platform-api 基线；同轮矩阵补
  「登录人机验证」取舍行（X）。

归档前完成一轮全树评审循环（文档契约与实现对齐、delta 结构修复、死配置清理），见验证记录。

在途变更：`2026-11-19-add-secret-scanning`（跨仓质量门禁批次 1 / P0-1，gitleaks 机密扫描）——已提交推送，本地验证与 Linux 容器等价复跑通过；GitHub 首跑被账号账单锁拦在启动前，待账单修复后实跑与分支保护 required，见验证记录 2026-11-19 条。`2026-11-19-add-structural-gates`（结构类门禁）已提交（4b9265a）。`2026-11-19-add-quality-gates-batch2`（覆盖率/小程序构建/依赖审计/镜像构建/stylelint/重复度/actionlint，未提交）见验证记录第三条。

## FUNCTION_MATRIX P0 逐项对照

| P0 能力            | 交付形态                                                                                                                                                                                                              | 验证证据                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 管理员登录/退出    | argon2id + 失败锁定 + refresh 轮换吊销（web Cookie / miniapp body）                                                                                                                                                   | 集成：错误密码 401 不泄露存在性、缺 client 400、Cookie 语义、轮换复用拒绝；e2e：错密停留/登录/登出 |
| 当前用户/个人中心  | profile / change-password / 头像字段（上传可选未接 UI）                                                                                                                                                               | 集成：带 token 读 profile                                                                          |
| 用户管理           | CRUD/启停/重置密码（吊销会话）/角色分配/搜索分页                                                                                                                                                                      | 集成 + e2e fixture 经 API 建/删                                                                    |
| 角色管理           | CRUD + 权限关联 + builtin 保护                                                                                                                                                                                        | 集成：roleKey 冲突 409                                                                             |
| 菜单管理           | 树 CRUD + 动态路由 + 按权限过滤                                                                                                                                                                                       | 集成：noperm 用户菜单树为空；e2e：侧栏按权限渲染                                                   |
| 权限管理           | Permission 独立表 + 默认拒绝 + `*:*:*` 通配                                                                                                                                                                           | 集成：越权 403；e2e：零权限用户导航树空 + 未注册路由落 404                                         |
| 字典管理           | 类型/项/启停/排序 + 进程内缓存写时失效                                                                                                                                                                                | 集成 + Web 页（useDict）                                                                           |
| 系统参数           | 非机密参数 CRUD、builtin 保护、密钥形态 key 拒绝                                                                                                                                                                      | 集成 + files 上限联动验证                                                                          |
| 操作审计           | @Audit 切面（截断 + password/token/secret 脱敏）                                                                                                                                                                      | 集成：写操作落审计含 requestId                                                                     |
| 登录审计           | 成败 + IP + client                                                                                                                                                                                                    | 集成 + Web 页                                                                                      |
| 异常与请求日志     | pino 结构化 + requestId 中间件 + 契约错误 envelope                                                                                                                                                                    | 集成：错误响应含 requestId                                                                         |
| 通用附件上传       | StorageService 接口 + LocalStorage、白名单/上限/随机键/授权流式下载                                                                                                                                                   | 集成 8 负例 + 浏览器走查                                                                           |
| 通用 CRUD 模块示例 | SampleRecord api + Web 五段式页 + 小程序页                                                                                                                                                                            | 集成：web 建档→miniapp 改同一条记录；e2e：UI 新增/编辑/删除                                        |
| 代码生成工具       | gen_definition CRUD + 预览 + CLI 拒绝覆盖 + 确定性渲染                                                                                                                                                                | 单测（两次落盘 diff 为空）+ CLI 端到端实测                                                         |
| API 文档           | OpenAPI（nestjs-zod 桥接）/docs + Bearer 标注                                                                                                                                                                         | swagger 可访问                                                                                     |
| 微信小程序端       | uni-app CLI 工程：登录/我的/SampleRecord                                                                                                                                                                              | build:mp-weixin 产物 3 页；开发者工具模拟器走查三页                                                |
| Web 管理界面       | 登录/布局/菜单/系统管理/日志/文件/代码生成 UI                                                                                                                                                                         | e2e 5 例（真实浏览器 + 真库）                                                                      |
| 国际化/主题        | zh-CN 默认 + en；亮暗 token 成对；375/768/1280 走查                                                                                                                                                                   | UI_STYLEGUIDE + 浏览器亮暗切换                                                                     |
| 系统基础运行指标   | /health/live（进程）与 /health/ready（DB）分离 + /api/v1/metrics（Prometheus：进程默认指标 + HTTP RED，METRICS_ENABLED 可关）                                                                                         | 集成：ready 检查 database up；metrics 公开端点 2 例（add-basic-metrics）                           |
| 测试/CI/部署       | 单测 78（contracts 17 + api 13 + web 17 + miniapp 31）+ 集成 32 + e2e 5；CI 含 lint/lint:style/dup/format/build（含小程序双端）/typecheck/test:coverage/集成/e2e + 镜像构建 + gitleaks/audit/actionlint；compose 全栈 | 下方验证记录                                                                                       |

## 验证记录（2026-11-07）

- **2026-11-19 质量门禁批次 1 / P0-1 Secret scanning（在途，待授权提交推送）**：新增 `.gitleaks.toml`（extend 默认规则集 + 路径级 allowlist `tests?/fixtures`、docs 的 md/png/jpg）、`.pre-commit-config.yaml`（gitleaks v8.30.1）、`.github/workflows/security.yml`（`secrets` job：checkout@v7 + `fetch-depth: 0` + gitleaks 8.30.1 全量历史扫描，独立于 `ci.yml` 无路径过滤），并按 handoff §5.0 将 `ci.yml` 的 `actions/checkout@v5` 对齐 `@v7`。验证：干净树 `gitleaks detect --source . --redact --verbose --exit-code 1` exit 0（22 commits scanned / no leaks found）；负向验收——实测 `gitleaks detect` 仅扫 git 历史，未跟踪探针 exit 0（假绿），故在 scratch 仓用同款配置**提交**探针后 exit 1（命中 `aws-access-token`；探针须用 base32 合规合成 key，handoff 模板 `AKIAIOSFODNN7EXAMPLE` 被 8.30 默认规则忽略），移除违规提交后恢复 exit 0；提交前钩子同款命令 `gitleaks git --pre-commit --redact --staged --verbose --exit-code 1` 暂存探针 exit 1、撤销后 exit 0（索引无残留）；`uvx pre-commit validate-config` exit 0；`actionlint`（ci.yml + security.yml）exit 0；`openspec validate --strict` 通过；既有门禁 `pnpm lint && pnpm typecheck && pnpm test && pnpm build` exit 0（单测 72）。遗留：GitHub 侧 `security` 与 `CI` workflow 首跑均在建步骤前失败，annotation = `The job was not started because your account is locked due to a billing issue`（账单锁，非 workflow 缺陷）；改用本地等价复跑——ubuntu:24.04 容器执行 `secrets` job 全步骤（版本下载 + `gitleaks detect --source . --redact --verbose --exit-code 1`）exit 0（23 commits / no leaks；本机 x64 资产在 Rosetta 下 Go runtime fatal，容器改用 arm64 资产，规则与命令不变）；分支保护 required 未设置（`main` 当前未受保护），待账单修复 + CI 实跑绿后设置。集成/e2e 未重跑（纯 workflow/工具配置改动，无源码触碰）。

- **2026-11-19 结构类质量门禁（已提交 4b9265a）**：`eslint.config.js` 新增 typescript-eslint `recommendedTypeChecked`（仅 `**/*.ts`）、sonarjs recommended、import recommended + `import/no-cycle`，结构规则 7 条全部 `error` 且用默认阈值（`complexity 20`、`cognitive-complexity 15`、`max-lines 300`、`max-lines-per-function 50`、`max-depth 4`、`max-params 3`、`max-statements 10`、`max-nested-callbacks 10`），零 disable / 零调参 / 零目录豁免；行长与格式由 Prettier（printWidth 100）接管，CI 增 `pnpm format:check`。存量 233 项违规按最小责任层清零（api 领域服务/生成器模板拆分、web views/store/router、miniapp 请求层、e2e 辅助函数），生成器产物以夹具 dump 前后逐字节比对证明等价。两个「配了不生效」缺口同轮修复：① `import/no-cycle` 依赖图默认只认 `.js/.mjs/.cjs`，补 `settings['import/parsers']` 声明 `.ts` 后立现并修复 5 处真实循环（`router/navigator.ts` 惰性绑定 router 断环）；② contracts 的 `dist` 类型产物是 typecheck/test 解析前提而 `pnpm install` 不构建 workspace 包，CI 将 `pnpm build` 前移、根脚本补 `pretypecheck`/`pretest`。契约类型 `MenuTree` 修正为 `MenuNodeWithMeta[]`（对齐后端既有返回，仅类型层）。验证：`pnpm lint` 0 error；`pnpm format:check` exit 0；`pnpm typecheck` 四包通过；`pnpm test` api 13 + web 17 + miniapp 31；一次性 `mysql:8.4`（宿主 3308）下集成 32/32；`pnpm build` 成功（当时 `pnpm -r build` 不含小程序——miniapp 无 `build` 脚本，双端由 `build:h5`/`build:mp-weixin` 单独验证，批次 2 已补齐）；`pnpm test:e2e` 5/5（另以临时冒烟用例验 dict/gen/permission/sample/setting 弹窗可打开、无 pageerror 后删除）。负向验收：植入 13 语句函数、305 行文件、`any`、双文件互引与超宽格式，分别命中 `max-statements` / `max-lines` / `no-explicit-any` / `import/no-cycle` / `prettier --check exit 1`，移除后恢复全绿。`openspec validate 2026-11-19-add-structural-gates --strict` 通过。遗留：GitHub 分支保护 required 未设置（owner 指示本批不处理）；Actions 仍受账单锁，workflow 改动未实跑。

- **2026-11-19 质量门禁批次 2（未提交）**：补齐批次 1 的三类盲区。① 覆盖率：四包接入
  `@vitest/coverage-v8`，阈值取实测基线略下方——api 70/80/68/70（全量单测+集成，实测 72.21/83.13/70.76）、
  web 60/88/72/60（`src/utils` 口径，实测 63.01/91.04/76.47，store/router/api 由 e2e 覆盖且不插桩）、
  miniapp 78/88/80/78（80.80/91.83/84.61）、contracts 98/95/60/98（99.46/100/66.66）；`test:coverage` 进 CI
  （api 覆盖集成，原独立集成步骤合并）。② 构建：miniapp 补 `build`（h5 + mp-weixin）纳入 `pnpm -r build`
  （此前 `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` 静默跳过），api 补 `postinstall: prisma generate` 修冷启动
  `@prisma/client did not initialize`。③ 依赖：`pnpm audit --prod --audit-level=high` 进 `security.yml`；
  初始 17 high 经 `overrides` 修复 10 类传递依赖（multer 2.5.0、adm-zip 0.6.1、postcss 8.5.18、
  source-map-js 1.2.2、jpeg-js 0.4.4、@intlify/core-base/message-resolver 9.1.11、@vue/server-renderer 3.5.42、
  deepmerge-ts 8、vite 5.x→5.4.21 版本限定不动 web 的 vite 8），残留 1 条（GHSA-587h-7wmj-h5pm 需 vite ≥6.4.4、
  uni 钉 5.x）与无修复版本的 @intlify 公告写入 `auditConfig.ignoreGhsas` 并注明理由；新增 Dependabot。
  覆盖过程中实测：全局覆盖 @intlify 会把 web vue-i18n 降级到 9.x（已改版本限定）、core-base 9.14.x 缺
  `handleFlatJson` 导出致小程序构建失败（已改精确 9.1.11）。④ 容器：`ci.yml` 新增 `images` job 跑
  `docker compose build`；本地以 `podman build --network=host` 等价验证 api 471 MB / web 53.6 MB 构建成功。
  ⑤ 样式：stylelint 最小规则集（禁裸 hex、重复声明/选择器、空块、未知属性/伪元素；`.vue` 走 postcss-html、
  `.scss` 走 postcss-scss），仅 token 单源 `index.css`/`uni.scss` 允许 hex；顺带修复 `index.css` 注释内含
  `*/` 导致的解析错误。⑥ 重复度与死代码：jscpd 基线 3.62%、阈值 4% 阻断（逐文件复制探针实测 4.7% 触发）；
  knip 忽略 uni-app 工作区（页面为动态注册）其余只报告，删除 3 个死导出（apiGetSample/apiGetUser/
  validateUserForm）。⑦ workflow 自检：actionlint 1.7.12 进 `security.yml`。负向验收全部实测：覆盖率
  阈值抬到 99% → exit 1；删除 auditConfig → exit 1（3 high）；stylelint 植入 `#fff` → exit 2；复制
  `index.css` 探针 → 4.7% exit 1；非法 workflow → exit 1；移除后均恢复绿。全量门禁：
  lint / lint:style / dup / format / build（含小程序双端）/ typecheck / test:coverage / test:e2e 5/5 /
  audit / actionlint 全 exit 0；`openspec validate 2026-11-19-add-quality-gates-batch2 --strict` 通过。
  附带：e2e 浏览器随 lockfile 重解析升至 Playwright 1.65.0，已同步安装对应 chromium-headless-shell。

- **add-basic-metrics（2026-11-08 实施，2026-11-09 owner 指令归档）**：`GET /api/v1/metrics`（Prometheus 文本 = prom-client 默认进程指标 + HTTP RED 中间件；route 标签仅路由模板，查询串/路径参数不入标签；`METRICS_ENABLED=false` 关端点且停记 HTTP 指标）——FUNCTION_MATRIX P0「基础 metrics」字面缺口补齐。验证：集成 28/28（新增 2 例：未认证公开可达含 `process_cpu_seconds_total` 与 `http_requests_total` 指标族、查询串不入指标）；全量门禁 lint/typecheck(4 包)/单测 72/build + e2e 5/5 全绿；`openspec validate add-basic-metrics` valid、`--all` 11 基线全过。同轮 FUNCTION_MATRIX 补「登录人机验证」取舍行（X：不预建，失败锁定+限流已覆盖）消除矩阵悬案。归档（2026-11-09 owner 指令）：移入 `archive/2026-11-09-*`，「基础运行指标」（ADDED）合入 platform-api 基线并抛光（场景「验收」后缀、Purpose 与头部证据计数 28），validate 10/10
- `pnpm lint`、`pnpm typecheck`（contracts/api/web/miniapp/e2e）、`pnpm test`（67）、`pnpm build`：全绿
- **微信开发者工具模拟器真实走查（2026-11-08 补录）**：小程序测试号 appid 经 `MP_WEIXIN_APPID` 环境变量注入产物（manifest 内恒为 touristappid 占位，见 `apps/miniapp/scripts/patch-mp-appid.mjs`）后重建，`cli auto --auto-port 9420` 启用自动化，miniprogram-automator 驱动模拟器三页走查——登录（账号密码打真 3000 dev api，登录成功）→ 示例数据（真实请求返回空列表，空态正确）→ 我的（profile 渲染、最近登录时间=本次走查时刻、语言切换项渲染、tabBar 选中态正确），`console.error`=0。期间验证终局 401 防抖改动随产物实机运行无异
- **adopt-wot-design-uni 实施（2026-11-08）**：wot 1.14.0 uni_modules 内联 + sass 1.78.0 后——根门禁 lint/typecheck(4 包)/单测 70/build 全绿；`build:h5`/`build:mp-weixin` 双链路编译通过，mp 产物含 wd-* 组件（easycom 按需：直用 6 件 + 内部依赖 5 件）与 tab 图标资产，appid 注入链路不受影响。走查双轨：① 微信模拟器（wot 产物）三页渲染截图 + tabBar 图标选中态正确 + `console.error`=0（automator 桥对 virtualHost 上提树无法可靠打字/点击——几何与 data 序列化残缺，已登记 BUILD_PLAN 已知坑 14）；② H5 playwright 驱动同一套组件补全交互环：登录打字（真 3000 api 登录成功→跳示例数据）→ 弹层开/switch 切/取消关 → 语言切 English 再切回 → 退出登录回登录页，`console.error`=0。走查中消化 owner 两项反馈：登录输入框 46px 控件档（`inputInnerHeightNoBorder` 桥接修复文字偏上）、tabBar 图标补齐（EP 字形栅格 PNG + 生成脚本入库）。代码评审循环：修复 2 项细节（两文件 CRLF 归一、theme.ts 头注陈旧引用），复验全绿
- 归档（2026-11-08 owner 指令）：`adopt-wot-design-uni` 移入 `openspec/changes/archive/2026-11-08-*`；组件库控件层（ADDED）与「样式 token 单源」「双端构建可通过」增补（MODIFIED）合入 miniapp-ui 基线并按惯例抛光头部与 Purpose
- miniapp 状态/i18n 基线（add-miniapp-state-i18n）：单测 30/30（终局 401 十二例 + datetime 4 + auth store 6 + app store 8，提示断言锁分类枚举与次数、不锁文案）；`build:h5` 与 `build:mp-weixin` 编译通过（pinia 4 + vue-i18n 11 × uni 插件兼容性验证点；uni `preserveSymlinks` 与 pnpm 虚拟仓库冲突的解法见 BUILD_PLAN §7.1 已知坑）；语言切换/导航标题/tabBar 同步行为有 store 级结构断言
- `pnpm --filter @tiangong/api test:integration`：26/26（认证契约、RBAC 默认拒绝、分页与唯一性、审计脱敏、files 8 负例、SampleRecord 跨端、miniapp 原生 PUT、生成器预览与越权）
- `pnpm test:e2e`：**5/5**（错密停留登录页 401、登录→仪表盘→菜单渲染→登出、未登录守卫重定向含回跳地址、零权限用户菜单过滤+未注册路由 404、SampleRecord UI 纵向新增/编辑/删除含两位小数金额）——Playwright 自动拉起 api(:3001)+web(:5174)，指向 tiangong_test，globalSetup 自动 migrate+seed+复位锁定计数
- 生成器确定性：同一输入两次渲染/两次独立落盘逐字节一致；CLI 端到端（落盘 7 件 → 二跑整体拒绝并列全部冲突）
- 安全回归：越权负例（RBAC 403/文件下载 403/生成器预览 403）、路径遍历剥离、上传白名单、暴力锁定、refresh 轮换复用拒绝——集成套件持续执行；`docs/quality/SECURITY_TESTING.md` 基线逐条覆盖
- web 请求层单测锁定 401 单飞刷新契约（并发共享一次 refresh/成功重放/终局清理会话/auth 路径豁免/防循环/silent 静默/并发终局各自清理）与 envelope 解包；miniapp 请求层单测锁定同语义（过期重放仍拒、被停用、无凭据、auth 路径豁免、silent、恢复成功）并额外锁定并发终局收敛——同一死亡周期仅首个终局请求执行清理+回登录+提示，其余仅抛出（一次性 claim 落在凭据单源 `utils/auth.ts`，写入新凭据即复位，与 web 层 store 防抖同构）
- 归档前全树评审循环（2026-11-07）：终局 401 文案规则的 spec/proposal/BUILD_PLAN 四处表述与 miniapp 位置感知实现对齐（补「无凭据终局不误报停用」scenario）；unify delta 结构修复（`## MODIFIED Requirements` + `### Requirement:`，validate 由 ✗ 转全绿）；align 文档 preset 命名纠偏为 unocss-applet 0.16 实际导出（presetApplet/presetRemRpx/transformerApplet）；UI_STYLEGUIDE 补「miniapp 参照执行」节；ci.yml 作业级死配置 `ADMIN_INITIAL_PASSWORD` 删除；`.gitignore` 增 `.zcode/`。验证：`openspec validate --all --specs` 10/10、actionlint OK、prettier（编辑集）clean、`pnpm lint && pnpm typecheck && pnpm test`（67）复跑全绿
- 归档（2026-11-07 owner 指令）：5 个变更移入 `openspec/changes/archive/2026-11-07-*`；三个新基线（miniapp-ui/frontend-resilience/miniapp-client）由 archive 生成并按仓库惯例抛光头部与 Purpose

## NOT VERIFIED（如实标注）

- **GitHub Actions 实跑**：批次 2 新增或改造的 `images` / `dependencies` / `workflows` job 与 `test:coverage`
  步骤均只在本地等价验证，未在 GitHub 实跑（账单锁）。远端 qiyangfan/tiangong（私有）的 workflow 全部在建步骤前失败；2026-11-19 首次取得 annotation：`The job was not started because your account is locked due to a billing issue`——账号账单锁，非 workflow 缺陷。同因，批次 1 新增的 `security.yml / secrets` job 未实跑（本地容器等价复跑通过，见验证记录），GitHub 分支保护 required check 未设置（`main` 未受保护）。账单修复后 push 任意提交即自动全链验证。
- **微信小程序真机运行**：开发者工具模拟器走查已通过（2026-11-08，见验证记录）；真机预览未执行
- **生产部署**：compose 验证为本地演示口径；生产 secrets/域名/HTTPS 未演练

## 已知限制与设计取舍

- 进程内缓存（字典/参数/权限）——模块化单体默认形态，多实例部署需换共享缓存（CacheService 注释已说明）
- 无 Redis、无软删、数据范围权限/导入导出/在线会话管理为 P1（FUNCTION_MATRIX 明确按需启用）
- 更新动词统一 PUT（部分合并语义，对齐 RuoYi 约定）：微信 request 不支持 PATCH，PUT 为三端原生可用动词
- 生成器产物不含菜单/权限 seed 注入（人工在 UI 配置，避免覆盖人工改动）；prisma model 片段需人工合并后 migrate
- files 上传走内存存储（≤MAX_UPLOAD_MB 硬顶），大文件分片/直传为未排期能力
- **request 层终局 401 语义（2026-11-07 owner 决策统一）**：web/miniapp 以 HTTP 401 为判定基准，非 auth 路径终局 401（刷新失败或重放仍被拒）清理本地会话并引导重登；auth 路径 401（登录失败）不触发清理；silent 仅抑制提示不豁免清理。终局提示恰好一次且区分文案：停用/删除（`AUTH_ACCOUNT_DISABLED`/`AUTH_UNAUTHENTICATED`）提示「账号已被停用」，其余提示「登录状态已过期」；「停用且 access 同时已过期」窗口期按过期文案（refresh 端点按设计不泄露账号停用状态，防账号枚举侧信道），重登时得到明确停用提示。不变量已写入 identity-access spec，两端单测锁定
- **错误文案国际化分层（ADR-0007，2026-11-07 修订）**：`code` 为契约、服务端 message（英文）为日志/回落文本、展示文案归客户端——web 走 vue-i18n；miniapp 自 add-miniapp-state-i18n 起同为 vue-i18n 双语资源（`locales/` zh-CN 默认 + en，键结构类型约束一致；错误码映射在 `errors` 组、终局会话提示在 `session` 组，未收录码回落英文；终局提示按位置区分：重放后仍被拒 = 停用文案，无凭据/刷新失败 = 引导重登文案，防凭据被系统清理后误报「账号已停用」）；后端 i18n 不预建，触发条件见 ADR
- e2e 固定端口 api 3001 / web 5174，与日常 dev（3000/5173）隔离，防止 reuse 误连开发服务；本机若有遗留 dev api 占 3000，不影响 e2e

## 已知坑速查

见 `docs/BUILD_PLAN.md` §7.1「已知坑」（DI 元数据、swc、3307、vite watcher/代理 env、EP 图标、IAB 自动化等）。
