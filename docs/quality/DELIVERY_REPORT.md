# 天工脚手架交付报告（2026-11-20）

> 现状快照：只写当前形态、验证证据与遗留项；过程与变更历史看 git log。
> 交接权威文件是 `docs/BUILD_PLAN.md`（§7 状态表 / §7.1 必读事实 / §8 执行指令）。

## 交付范围

BUILD_PLAN §7 全部 6 个阶段（Stage 0-6）已过门禁；9 个变更经 owner 验收归档（`openspec/changes/archive/`）：
2026-11-07 五变更、2026-11-08/09 两变更（wot 组件层、add-basic-metrics）、2026-11-19 质量门禁批次 5、
2026-11-20 门禁缺口收口（close-gate-gaps）。
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

在途变更：`2026-11-19-add-secret-scanning`（跨仓质量门禁批次 1 / P0-1，gitleaks 机密扫描）、`2026-11-19-add-structural-gates`（结构类门禁）、批次 2/3/4（覆盖率/构建/依赖审计/stylelint/重复度/.vue 类型感知/Prisma schema/运行时 a11y/架构分层/OpenAPI/许可+SBOM/容器加固/严格档）——代码均已提交推送，本地门禁全绿；因 GitHub Actions 账号账单锁从未实跑、分支保护 required 未设置，5 个 change 保持 active，解锁后归档。批次 5（系统模块 UI e2e/全页 a11y/响应契约/knip 阻断/dev 依赖审计/tsconfig 严格开关）与批次 6（env 配置契约/详情接口契约/体积预算/license 动态 workspace/API 授权矩阵/覆盖率阈值收紧）已于 2026-11-20 归档。

## FUNCTION_MATRIX P0 逐项对照

| P0 能力            | 交付形态                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 验证证据                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 管理员登录/退出    | argon2id + 失败锁定 + refresh 轮换吊销（web Cookie / miniapp body）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 集成：错误密码 401 不泄露存在性、缺 client 400、Cookie 语义、轮换复用拒绝；e2e：错密停留/登录/登出 |
| 当前用户/个人中心  | profile / change-password / 头像字段（上传可选未接 UI）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 集成：带 token 读 profile                                                                          |
| 用户管理           | CRUD/启停/重置密码（吊销会话）/角色分配/搜索分页                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 集成 + e2e fixture 经 API 建/删                                                                    |
| 角色管理           | CRUD + 权限关联 + builtin 保护                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 集成：roleKey 冲突 409                                                                             |
| 菜单管理           | 树 CRUD + 动态路由 + 按权限过滤                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 集成：noperm 用户菜单树为空；e2e：侧栏按权限渲染                                                   |
| 权限管理           | Permission 独立表 + 默认拒绝 + `*:*:*` 通配                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 集成：越权 403；e2e：零权限用户导航树空 + 未注册路由落 404                                         |
| 字典管理           | 类型/项/启停/排序 + 进程内缓存写时失效                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 集成 + Web 页（useDict）                                                                           |
| 系统参数           | 非机密参数 CRUD、builtin 保护、密钥形态 key 拒绝                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 集成 + files 上限联动验证                                                                          |
| 操作审计           | @Audit 切面（截断 + password/token/secret 脱敏）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 集成：写操作落审计含 requestId                                                                     |
| 登录审计           | 成败 + IP + client                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 集成 + Web 页                                                                                      |
| 异常与请求日志     | pino 结构化 + requestId 中间件 + 契约错误 envelope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 集成：错误响应含 requestId                                                                         |
| 通用附件上传       | StorageService 接口 + LocalStorage、白名单/上限/随机键/授权流式下载                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 集成 8 负例 + 浏览器走查                                                                           |
| 通用 CRUD 模块示例 | SampleRecord api + Web 五段式页 + 小程序页                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 集成：web 建档→miniapp 改同一条记录；e2e：UI 新增/编辑/删除                                        |
| 代码生成工具       | gen_definition CRUD + 预览 + CLI 拒绝覆盖 + 确定性渲染                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 单测（两次落盘 diff 为空）+ CLI 端到端实测                                                         |
| API 文档           | OpenAPI（nestjs-zod 桥接）/docs + Bearer 标注                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | swagger 可访问                                                                                     |
| 微信小程序端       | uni-app CLI 工程：登录/我的/SampleRecord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | build:mp-weixin 产物 3 页；开发者工具模拟器走查三页                                                |
| Web 管理界面       | 登录/布局/菜单/系统管理/日志/文件/代码生成 UI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | e2e 5 例（真实浏览器 + 真库）                                                                      |
| 国际化/主题        | zh-CN 默认 + en；亮暗 token 成对；375/768/1280 走查                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | UI_STYLEGUIDE + 浏览器亮暗切换                                                                     |
| 系统基础运行指标   | /health/live（进程）与 /health/ready（DB）分离 + /api/v1/metrics（Prometheus：进程默认指标 + HTTP RED，METRICS_ENABLED 可关）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 集成：ready 检查 database up；metrics 公开端点 2 例（add-basic-metrics）                           |
| 测试/CI/部署       | 单测+集成 163（contracts 22 / web 28 / miniapp 34 / api 79）+ e2e 14（全页 a11y + 系统模块 UI 闭环）；CI 含 schema 三项门禁/lint（.vue 类型感知 + strictTypeChecked + a11y）/lint:arch/lint:style/lint:md/dup/format/build（含小程序双端）/size:check（web gzip 与小程序主包体积预算）/typecheck（exactOptionalPropertyTypes + noPropertyAccessFromIndexSignature）/test:coverage/OpenAPI 快照/响应契约巡检（列表 + 详情）/API 授权矩阵（路由必须声明 Public 或权限点）/e2e 覆盖率 + knip 阻断 + 全量依赖审计 + 镜像构建 + hadolint + trivy + license/SBOM + gitleaks/actionlint+shellcheck + 全栈冒烟与安全头；compose 全栈 | 下方验证记录                                                                                       |

## 验证记录

- **2026-11-20 门禁缺口收口（已归档 2026-11-20）**：按门禁清单盘点剩余 6 项并落地。
  ① env 配置契约：新增 `apps/api/src/config/__tests__/env.test.ts` 4 例，锁 fail-fast
  退出码与字段提示、secret 不回显、默认值注入、`METRICS_ENABLED` 只认字面 true/false
  （`'0'` 拒绝）。② 详情接口契约：断言助手抽到 `test/setup/contract.ts`；新增
  `contract-details.test.ts` 4 例，覆盖 `GET /users/:id`、`GET /roles/:id`（权限点
  `resource:action` 往返）、`GET /samples/:id` 与 404 统一错误 envelope；探针角色键纳入
  `cleanupFixtures`。③ 体积预算：新增 `scripts/bundle-budget.mjs` 与 `pnpm size:check`
  （web 产物 gzip ≤800KiB、微信小程序主包 ≤1MiB），接入 CI `pnpm build` 之后；实测
  715.4KiB / 334.4KiB；负向注入 200KiB 随机文件后 exit 1，移除后恢复 0。
  ④ license 检查改为从 `apps/*`、`packages/*` 动态推导 workspace（4 → 6 个），新增包
  不再静默逃检。⑤ API 授权矩阵：新增 `security-matrix.test.ts`，从已装配应用的模块容器
  枚举全部 61 条路由，要求显式声明 `@Public` 或非空权限点，自助端点白名单校验无过期条目；
  首次运行即发现 `GET /dicts/:dictKey/options` 未声明权限点（按登录态读取的字典选项，确认
  后入白名单）；负向把 `GET /roles/:id` 权限点置空即 exit 1。⑥ 覆盖率阈值贴线收紧：api
  72/58/78/72、web 98/92/96/98、miniapp 80/89/81/80、contracts 99/98/64/99。
  验证：lint / format / typecheck / lint:arch / lint:dead / lint:md / lint:style /
  dup:check / build / size:check / license:check exit 0；测试 163/163（api 79 含集成，
  新增 10 例）；api 覆盖率 74.06/60.36/81.7/73.74；e2e 14/14（84.33/60.58/77.5/84.3）；
  `openspec validate 2026-11-20-close-gate-gaps --strict` 通过。
- **2026-11-19 门禁代码评审（批次 1-5 范围）**：以负向探针验证门禁真实生效后，修复 11 项。
  ① 契约 schema 的 `z.object` 会静默丢弃未声明字段——实测 `passwordHash` 注入响应仍解析成功，
  「字段多」并未被拦截；响应类 schema 全部改 `z.strictObject`（含角色详情 extend、菜单树递归），
  新增严格性单测。② 契约探针键（`it_contract_probe` / `it.contract.probe` / `it-contract-probe`）
  纳入 `cleanupFixtures`，中途失败后重跑不再撞唯一键。③ 批次 5 把上传触发器改纯文本后丢失了
  `:loading` 的禁用语义，补 `:disabled="uploading"` 防止上传中重复触发。④ compose mysql 健康检查
  硬编码 root 口令，覆盖 `MYSQL_ROOT_PASSWORD` 后健康检查必失败；改为同源插值并实测 `config` 输出。
  ⑤ tinypool override 从精确 `3.2.7` 放宽为 `vitest@^3.0.0`，避免 vitest 3.x 小版本升级导致
  漏洞覆盖失效；升级后 miniapp 34 测试与全量审计（无 high/critical）复验。⑥ dependabot 的
  dev 分组补 `@dcloudio/*` 排除，与 uni 钉版策略一致。⑦ `.gitleaks.toml` 移除覆盖全部 docs 的
  路径豁免（历史扫描在无该豁免时 exit 0），仅保留 tests fixtures。⑧ `no-circular` 注释纠正：
  dependency-cruiser 对动态 import 环同样计入（探针实测命中）。⑨ `openapi:update` 追加
  `prettier --write`，合法更新后不再必然触发 format:check 失败（实测 exit 0 且快照无 diff）。
  ⑩ CI images job 显式给 `ADMIN_INITIAL_PASSWORD` 哑值，避免 seed 的「随机生成并打印口令」
  分支把凭据写进 CI 日志。负向验证：4 条架构规则（api controller→Prisma、web utils→views、
  miniapp 页面互引、e2e src→tests）全部 exit 1，动态循环探针命中 `no-circular`；修复后
  lint / format / typecheck / arch / knip / md / dup / build 全绿，测试 153/153，e2e 14/14
  （覆盖率 84.33/60.58/77.5/84.3），gitleaks 历史扫描 exit 0，compose config 通过。

- **2026-11-19 质量门禁批次 5（已归档 2026-11-20）**：补齐 6 项测试深度/收紧缺口，过程中修复 3 个真实缺陷。
  ① 系统模块 UI e2e：新增 `system-crud.spec.ts` 覆盖角色/菜单/字典（含字典项抽屉）/参数/
  生成器（含预览）/审计双日志/个人中心（改昵称并恢复），删除等待 DELETE 响应并断言成功。
  **实施即暴露缺陷**：角色/用户/菜单页把 `confirmDelete()` 的 `undefined` 解析值当失败，
  用户点「确定」后直接 return，删除从未执行；三处统一改 `.then(() => true).catch(() => false)`。
  ② 全页 a11y：登录后经 `/auth/menus` 拉菜单树、递归拼路径逐页 axe 扫描，另覆盖 `/profile`
  与 `/404`；**发现并修复** `/system/file` el-upload 触发器的 `nested-interactive`
  （触发器改纯文本 span，键盘与点击由 EP 容器承担）。③ 响应契约：新增
  `contract-responses.test.ts`，15 个只读接口 + 登录/字典/参数/示例/生成器/文件上传/错误
  envelope 全部按 contracts zod schema 解析，23 例通过（字段多/少/类型变化即失败）。
  ④ knip 收紧：清除 9 处存量告警（未用导出/类型、hadolint/trivy 未列、冗余配置），
  CI 改为阻断；miniapp 因 uni easycom/自动导入误报仍排除。⑤ dev 依赖审计：security.yml
  审计全量依赖；vitest 升 4.1.12（api/web/contracts），miniapp 因 uni 钉 vite 5 保留
  vitest 3 并把 tinypool 覆盖到 2.1.2；补 `body-parser@1.20.9`、`path-to-regexp@0.1.13`、
  uni-automator `ws@^8.21.0` 覆盖；当前全量审计无 high/critical。⑥ tsconfig：
  `exactOptionalPropertyTypes` + `noPropertyAccessFromIndexSignature` 全量启用，实测 54 处
  全部修复（Prisma 可选入参收敛到 `defined()`、ConfigService `getOrThrow`、索引签名改括号）。
  统计口径迁移：contracts 100/100/100/100，web 100/95.94/100/100，api 分支按 vitest 4
  实测重定 58（其余 70/68/70）；e2e 覆盖率 84.33/60.58/77.5/84.3，阈值重设 82/58/75/82。
  全量门禁 exit 0：lint / format / lint:arch / lint:style / lint:md / dup / knip / typecheck /
  build / test:coverage（150）/ e2e:coverage（14）/ license / sbom / audit / actionlint /
  hadolint；`openspec validate 2026-11-19-add-quality-gates-batch5 --strict` 通过。
  遗留：Actions 仍受账单锁，新增步骤未实跑。

- **2026-11-19 质量门禁批次 4（已提交 2026-11-19）**：补齐 6 项运行期缺口并真实启用严格档。
  ① 运行时 a11y：`@axe-core/playwright` 扫描登录页/仪表盘/系统用户页（WCAG 2A/2AA，
  serious/critical 阻断）；首跑即命中 `button-name(2)`、`color-contrast(2)`、`label(2)`——
  修复图标按钮与开关可访问名、EP 二级/占位文本色提深至 #6b7280、分页每页条数补标签
  （EP 未暴露，包装层补写）后 2/2 通过。② 架构分层：dependency-cruiser 5 条规则 +
  静态环检测，抓到 health 控制器直连 Prisma（新增 HealthService）与 Sidebar/Navbar ↔
  auth store 循环（props/emit 下沉 + 动态路由改挂命名 layout 子路由）；探针 utils→views
  → exit 1，修复后 5 workspace 全绿。③ i18n：web/miniapp 单测校验双语键集合、空值、
  占位符与源码字面量引用；插入仅中文键 → exit 1。④ OpenAPI：抽取 `src/openapi.ts`、
  提交 `openapi.snapshot.json`，测试对真实 AppModule（Prisma 打桩）生成文档比对；
  快照尾加空格 → 失败，恢复通过。⑤ 许可 + SBOM：`license:check` 逐 workspace 生产依赖、
  SPDX 表达式逐原子裁决（MPL-2.0/CC-BY-4.0 注明理由）；`sbom:generate` CycloneDX 1866 组件、
  非 JSON/零组件 fail-closed；移除 MIT → exit 1，输出路径不可写 → exit 1。⑥ 容器加固：
  api/web 只读根 + cap_drop ALL + no-new-privileges + tmpfs，api 存储卷预建属主 1000，
  nginx 下发 CSP/nosniff/X-Frame-Options/Referrer-Policy/Permissions-Policy；实测 web
  uid 101 静态与反代 200、api uid 1000 health 200 且迁移/seed 成功、存储卷可写、响应头
  校验 exit 0，无头服务探针 exit 1；两镜像 trivy 复扫 exit 0。⑦ strictTypeChecked：启用后
  实测 151 项全部清零（两处规则选项：模板表达式允许 number、装饰器类放行；一处目录说明：
  集成测试断言辅助函数的泛型只在返回位），lint 0 error。e2e 7/7（新增 a11y 2 例），
  覆盖率因首次访问用户管理页分母上升，基线 76.97/49.44/67.35/76.93，阈值重设 74/46/64/74。
  全量门禁 exit 0；`openspec validate 2026-11-19-add-quality-gates-batch4 --strict` 通过。
  遗留：Actions 仍受账单锁，新增步骤未实跑。

- **2026-11-19 质量门禁批次 3（已提交 b1a3bc4）**：按「本地可推进但未落地」口径补齐 8 项。① `.vue` 类型感知：
  `recommendedTypeChecked` 扩到 `**/*.{ts,vue}`（`vue-eslint-parser` 入口 + `projectService` +
  `extraFileExtensions`），探针内浮动 Promise 命中 `no-floating-promises`，存量 6 处 uni API 以 `void` 豁免后
  lint 0 error。② actionlint 装 shellcheck 0.11.0 后才分析 `run:` 块；探针 `$(ls)` 命中 SC2086 → exit 1。
  ③ Prisma：`schema:validate`、`schema:format:check`（临时副本格式化比对，不改工作树）、`schema:drift`
  （`migrate diff --from-migrations` + 影子库）进 CI；schema 按 `prisma format` 归一 38 行纯空白；
  负向探针加字段 → drift exit 1（`Added column probeDriftField`），回滚后 exit 0。④ hadolint（threshold warning）
  进 images job；api 运行时 `USER 1000:1000`，web 换 `nginxinc/nginx-unprivileged:1.31-alpine` 监听 8080
  （compose 宿主端口不变）；探针 `apt-get install` → exit 1（DL3008）。⑤ 镜像 CVE：trivy 0.76.2 首扫 api
  6 HIGH（Node 内置 npm 的 brace-expansion/undici，有修复版本）——运行时不需要 npm/corepack，移除并把迁移改
  `node node_modules/prisma/build/index.js migrate deploy`，复扫 exit 0；web 首扫 68 项（alpine 3.21 基线），
  升 1.31（alpine 3.24）余 13 项 apk 滞后，`apk upgrade --no-cache`（root→uid 101 还原）后 exit 0。
  ⑥ a11y：插件 recommended 接入，仪表盘可点击 div 改 `router-link`（真实违规拦截后修复）。⑦ markdownlint：
  50 个 md 0 告警（首跑 14 项结构违规 exit 1，自动修 11 项 + 人工 3 项）。⑧ e2e 覆盖率：`vite-plugin-istanbul`
  按需插桩 + Playwright fixture 回收 `__coverage__` + nyc（cwd=web）合并，web 全 src 实测
  82.96/55.05/75.47/83.05（语句/分支/函数/行），阈值 78/50/70/78，抬高到 99 → exit 1。冒烟：api 容器
  uid=1000 + health 200 + 迁移/seed/启动成功；web 容器 uid=101 + 静态与 `/api/v1/health/live` 反代 200。
  全量门禁：lint / lint:style / lint:md / dup / format / build（含小程序双端）/ typecheck / test:coverage /
  e2e 覆盖率 5/5 / audit / actionlint+shellcheck / hadolint / trivy 全 exit 0；
  `openspec validate 2026-11-19-add-quality-gates-batch3 --strict` 通过。遗留：Actions 仍受账单锁，新增步骤未实跑。

- **2026-11-19 质量门禁批次 1 / P0-1 Secret scanning（在途，待授权提交推送）**：新增 `.gitleaks.toml`（extend 默认规则集 + 路径级 allowlist `tests?/fixtures`、docs 的 md/png/jpg）、`.pre-commit-config.yaml`（gitleaks v8.30.1）、`.github/workflows/security.yml`（`secrets` job：checkout@v7 + `fetch-depth: 0` + gitleaks 8.30.1 全量历史扫描，独立于 `ci.yml` 无路径过滤），并按 handoff §5.0 将 `ci.yml` 的 `actions/checkout@v5` 对齐 `@v7`。验证：干净树 `gitleaks detect --source . --redact --verbose --exit-code 1` exit 0（22 commits scanned / no leaks found）；负向验收——实测 `gitleaks detect` 仅扫 git 历史，未跟踪探针 exit 0（假绿），故在 scratch 仓用同款配置**提交**探针后 exit 1（命中 `aws-access-token`；探针须用 base32 合规合成 key，handoff 模板 `AKIAIOSFODNN7EXAMPLE` 被 8.30 默认规则忽略），移除违规提交后恢复 exit 0；提交前钩子同款命令 `gitleaks git --pre-commit --redact --staged --verbose --exit-code 1` 暂存探针 exit 1、撤销后 exit 0（索引无残留）；`uvx pre-commit validate-config` exit 0；`actionlint`（ci.yml + security.yml）exit 0；`openspec validate --strict` 通过；既有门禁 `pnpm lint && pnpm typecheck && pnpm test && pnpm build` exit 0（单测 72）。遗留：GitHub 侧 `security` 与 `CI` workflow 首跑均在建步骤前失败，annotation = `The job was not started because your account is locked due to a billing issue`（账单锁，非 workflow 缺陷）；改用本地等价复跑——ubuntu:24.04 容器执行 `secrets` job 全步骤（版本下载 + `gitleaks detect --source . --redact --verbose --exit-code 1`）exit 0（23 commits / no leaks；本机 x64 资产在 Rosetta 下 Go runtime fatal，容器改用 arm64 资产，规则与命令不变）；分支保护 required 未设置（`main` 当前未受保护），待账单修复 + CI 实跑绿后设置。集成/e2e 未重跑（纯 workflow/工具配置改动，无源码触碰）。

- **2026-11-19 结构类质量门禁（已提交 4b9265a）**：`eslint.config.js` 新增 typescript-eslint `recommendedTypeChecked`（仅 `**/*.ts`）、sonarjs recommended、import recommended + `import/no-cycle`，结构规则 7 条全部 `error` 且用默认阈值（`complexity 20`、`cognitive-complexity 15`、`max-lines 300`、`max-lines-per-function 50`、`max-depth 4`、`max-params 3`、`max-statements 10`、`max-nested-callbacks 10`），零 disable / 零调参 / 零目录豁免；行长与格式由 Prettier（printWidth 100）接管，CI 增 `pnpm format:check`。存量 233 项违规按最小责任层清零（api 领域服务/生成器模板拆分、web views/store/router、miniapp 请求层、e2e 辅助函数），生成器产物以夹具 dump 前后逐字节比对证明等价。两个「配了不生效」缺口同轮修复：① `import/no-cycle` 依赖图默认只认 `.js/.mjs/.cjs`，补 `settings['import/parsers']` 声明 `.ts` 后立现并修复 5 处真实循环（`router/navigator.ts` 惰性绑定 router 断环）；② contracts 的 `dist` 类型产物是 typecheck/test 解析前提而 `pnpm install` 不构建 workspace 包，CI 将 `pnpm build` 前移、根脚本补 `pretypecheck`/`pretest`。契约类型 `MenuTree` 修正为 `MenuNodeWithMeta[]`（对齐后端既有返回，仅类型层）。验证：`pnpm lint` 0 error；`pnpm format:check` exit 0；`pnpm typecheck` 四包通过；`pnpm test` api 13 + web 17 + miniapp 31；一次性 `mysql:8.4`（宿主 3308）下集成 32/32；`pnpm build` 成功（当时 `pnpm -r build` 不含小程序——miniapp 无 `build` 脚本，双端由 `build:h5`/`build:mp-weixin` 单独验证，批次 2 已补齐）；`pnpm test:e2e` 5/5（另以临时冒烟用例验 dict/gen/permission/sample/setting 弹窗可打开、无 pageerror 后删除）。负向验收：植入 13 语句函数、305 行文件、`any`、双文件互引与超宽格式，分别命中 `max-statements` / `max-lines` / `no-explicit-any` / `import/no-cycle` / `prettier --check exit 1`，移除后恢复全绿。`openspec validate 2026-11-19-add-structural-gates --strict` 通过。遗留：GitHub 分支保护 required 未设置（owner 指示本批不处理）；Actions 仍受账单锁，workflow 改动未实跑。

- **2026-11-19 质量门禁批次 2（已提交 2026-11-19）**：补齐批次 1 的三类盲区。① 覆盖率：四包接入
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

- **GitHub Actions 实跑**：批次 2/3/4 新增或改造的 job 与步骤（Prisma schema 三项、lint:md、lint:arch、
  e2e 覆盖率与运行时 a11y、hadolint、trivy、license/SBOM、全栈冒烟与响应头、shellcheck）与批次 5/6 的
  e2e 覆盖率、`size:check`、API 授权矩阵、详情响应契约均只在本地验证，
  未在 GitHub 实跑（账单锁）。远端 qiyangfan/tiangong（私有）的
  workflow 全部在建步骤前失败；2026-11-19 首次取得 annotation：`The job was not started because your account is locked due to a billing issue`——账号账单锁，非 workflow 缺陷。同因，批次 1 新增的 `security.yml / secrets` job 未实跑（本地容器等价复跑通过，见验证记录），GitHub 分支保护 required check 未设置（`main` 未受保护）。账单修复后 push 任意提交即自动全链验证，随后归档这 5 个 change。
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
- e2e 覆盖率只统计浏览器实际执行到的 web `src`（istanbul 未加载文件不计入），api/miniapp 不插桩；
  本地完整复现 CI 需装 shellcheck、hadolint、trivy（缺失时对应脚本报 command not found，CI 不受影响）

## 已知坑速查

见 `docs/BUILD_PLAN.md` §7.1「已知坑」（DI 元数据、swc、3307、vite watcher/代理 env、EP 图标、IAB 自动化等）。
