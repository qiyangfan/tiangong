# 天工 (tiangong) 建设计划 — 已批准执行蓝图

> 本文档是建设会话间交接的唯一权威文件。任何新会话（包括轻量模型会话）接手前必须完整阅读本文档与 `AGENTS.md`、`CONSTITUTION.md`、`docs/architecture/API_CONTRACT.md`。
> 计划批准日期：2026-11-07。状态标记：[x] 已完成 [ ] 未完成。

## 0. 项目定位与硬边界

- 仓库：`/Users/solvela/workspace/tiangong`，命名「天工」（出自《天工开物》），包作用域 `@tiangong/*`。
- 目标：以 RuoYi 能力为基准的**通用** TS 后台脚手架（NestJS + Vue3 + uni-app 小程序），P0 共 20 项能力（见 `docs/requirements/FUNCTION_MATRIX.md`），业务无关——**禁止出现任何行业实体**（图书/订单/课程/学员/商家等）。
- 每个阶段必须过门禁（真实构建/测试/联调）才能 git commit 并宣称完成；不能完成的如实标 NOT VERIFIED。
- 禁止复制 RuoYi 代码；只重写实现其模式。
- **owner 工程偏好已沉淀在 `AGENTS.md`「本仓执行约定」节**（语言口径/断言纪律/前端约定/Git 授权边界，2026-11-07 自 energy-ai-platform 与 longzhong 聚合层提炼），接手会话必须先读。

## 1. 环境事实（2026-11-07 勘定）

- Node v24.22.2、pnpm 12.18.0（由 mise 管理，`mise.toml` 需固定 node 24 / pnpm 12）
- Docker 29.8.2（OrbStack）；本机**无** mysql/psql 客户端，一切数据库操作走容器
- 参考仓库（只读，勿改）：
  - `/Users/solvela/ruoyi/RuoYi-Vue3` — 前端模式参考
  - `/Users/solvela/ruoyi-vue-plus/RuoYi-Vue-Plus` — 后端表结构蓝本（`script/sql/ry_vue.sql`）
- 规范包来源已拷入本仓库（35 文件，含 docs/、openspec/、agent-prompts/）

## 2. 技术栈（ADR-0001 锁定，不得改）

NestJS 11 + Prisma 6 + MySQL 8.4 LTS + Vue 3.5/Vite/Element Plus + uni-app(Vue3) + pnpm workspace；TypeScript strict；REST `/api/v1` + OpenAPI；Zod-first 契约；模块化单体。版本以实际安装兼容为准锁定进 lockfile。

## 3. 目录结构（目标）

```
tiangong/
├── apps/
│   ├── api/          NestJS，路由 /api/v1
│   │   ├── prisma/       schema.prisma + migrations/ + seed.ts
│   │   └── src/
│   │       ├── common/       envelope 拦截器/异常过滤器/requestId/pino 日志/@Audit 审计切面
│   │       ├── security/     JwtAuthGuard、PermissionsGuard(默认拒绝)、@RequirePermissions
│   │       └── modules/  auth, users, roles, permissions, menus, dictionaries,
│   │                       settings, audit, files, generator, examples, health
│   ├── web/          Vue3+TS strict+Vite+Element Plus+Pinia+vue-i18n
│   │   └── src/  layouts, router, api, stores, views, components, composables, directive, locales
│   └── miniapp/      uni-app Vue3+TS（微信小程序）
├── packages/
│   ├── contracts/    Zod schema + DTO 类型 + 错误码 + 分页类型（三端共享，API 契约唯一来源）
│   └── config/       共享 eslint9 flat / tsconfig 基座
├── scripts/          （工具脚本；gen:crud CLI 在 apps/api/scripts/——pnpm 严格解析须在依赖链内）
├── deploy/           compose.yaml（全栈）+ compose.dev.yaml（仅 dev MySQL）+ nginx/
└── docs/ adr/ openspec/ agent-prompts/ …（规范包 35 文件）
```

## 4. 关键设计决策（已批准，写代码时不得偏离）

1. **会话载体**：JWT access 15min + refresh 7d（轮换+吊销，存 refresh_token 表）。Web 端 refresh 放 HttpOnly SameSite=Lax Cookie（path=`/api/v1/auth`）；小程序端 refresh 走 body。access 只认 `Authorization: Bearer` 头，服务端不从 cookie 读鉴权 → 无需 CSRF token（ADR 附录写明理由）。
2. **RBAC**：独立 `Permission(resource, action)` + `RolePermission`；Menu 独立树（menuType M目录/C菜单/F按钮，perms 字段仅前端按钮显隐）；API 鉴权只认 Permission，默认拒绝；超管角色 roleKey=`superadmin` 持 `*:*:*` 通配。
3. **响应契约**（严格执行，见 docs/architecture/API_CONTRACT.md）：
   - 成功 `{"code":0,"data":...}`
   - 错误 `{"code":"AUTH_FORBIDDEN","message":"...","data":null,"requestId":"..."}` + 正确 HTTP 状态码
   - 分页请求 `page>=1`、`pageSize` 默认 20 上限 100；响应 `{items,total,page,pageSize}`
   - 日期 ISO8601 UTC 字符串
4. **数据库 15 表**（蓝本 ry_vue.sql，差异见 §5）：user, role, permission, menu, user_role, role_permission, dict_type, dict_item, setting, oper_log, login_log, refresh_token, file_object, sample_record, gen_definition。
5. **密码**：argon2id（@node-rs/argon2）；登录失败保护：user.failed_attempts + lock_until + @nestjs/throttler；登录成败写 login_log。
6. **契约路径**：contracts 包 Zod schema 是唯一来源；API 用 zod 校验管道；OpenAPI 由 nestjs-zod 桥接 @nestjs/swagger；Prisma model 一律不直接出 API。
7. **文件存储**：StorageService 接口 + LocalStorage 实现（随机 key、大小/类型白名单、授权流式下载）；file_object 存元数据。
8. **代码生成器**：元数据 JSON 存 gen_definition（Web 管理 UI+预览）；CLI `pnpm gen:crud` 落盘生成 NestJS 模块+web 五段式页面；**已存在文件拒绝覆盖**；确定性（两次生成 diff 为空）。
9. **管理员引导**：seed 读 `ADMIN_INITIAL_PASSWORD`，未设则随机生成只打印一次；禁止内置弱口令。
10. **开发库**（owner 2026-11-07 指示）：本机开发统一用 `~/workspace/env` 共享栈的 **env-mysql**（**MySQL 8.4**，宿主 **3307**——宿主 3306 被 OrbStack 幽灵转发占用且指向不存在的 9.7.2，2026-11-07 已把 env 栈镜像降为 8.4 并改发布端口 3307；应用账号 `tiangong/tiangong_dev` 持 ALL ON `*.*`（migrate shadow 库需要），库 `tiangong`）；dev 连接串 `mysql://tiangong:tiangong_dev@127.0.0.1:3307/tiangong`。`deploy/compose.dev.yaml`（mysql:8.4，端口 3307）降级为无共享栈环境的自包含回退。**CI 与生产口径仍为 mysql:8.4（ADR-0001）**，9.7-dev/8.4-CI 的版本偏差记入 ADR 附录，迁移兼容性以 CI 的 8.4 为准。

## 5. 表结构速查（Prisma 设计基准；类型=MySQL 语义）

以 ry_vue.sql 为蓝本，统一约定：主键 Int @id @default(autoincrement())；审计列 created_by Int? created_at DateTime @default(now()) updated_by Int? updated_at DateTime @updatedAt；状态一律 Boolean enabled（默认 true）；**无软删、无 ancestors 冗余列**；字符集 utf8mb4。

| 表              | 关键列（名称:类型）                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| user            | username varchar(30) unique、nickname varchar(30)、email varchar(100) unique?、phone varchar(20)?、password_hash varchar(255)、avatar_file_id Int?（→file_object）、enabled、remark?、failed_attempts Int @default(0)、lock_until DateTime?、last_login_ip varchar(64)?、last_login_at DateTime? + 审计列                                                                                                                                                                                  |
| role            | name varchar(30)、role_key varchar(100) unique、sort Int @default(0)、enabled、remark? + 审计列                                                                                                                                                                                                                                                                                                                                                                                            |
| permission      | resource varchar(64)、action varchar(32)、name varchar(100)、remark?；@@unique([resource, action])                                                                                                                                                                                                                                                                                                                                                                                         |
| menu            | parent_id Int? @default(0)、name varchar(50)、sort、path varchar(200)?、component varchar(255)?、menu_type char(1)（M/C/F）、visible Boolean @default(true)、enabled、perms varchar(100)?、icon varchar(100)? + 审计列                                                                                                                                                                                                                                                                     |
| user_role       | user_id + role_id @@id([user_id, role_id])                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| role_permission | role_id + permission_id @@id([role_id, permission_id])                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| dict_type       | name varchar(100)、dict_key varchar(100) unique、enabled、remark? + 审计列                                                                                                                                                                                                                                                                                                                                                                                                                 |
| dict_item       | dict_key varchar(100)（逻辑外键，索引）、label varchar(100)、value varchar(100)、tag_type varchar(20)?（primary/success/warning/danger/info）、sort Int @default(0)、is_default Boolean @default(false)、enabled、remark? + 审计列                                                                                                                                                                                                                                                         |
| setting         | name varchar(100)、setting_key varchar(100) unique、value varchar(500)、builtin Boolean @default(false)、remark? + 审计列；**禁止存任何密钥**                                                                                                                                                                                                                                                                                                                                              |
| oper_log        | title varchar(50)、business_type varchar(20)（insert/update/delete/grant/export/import/other）、method varchar(200)、request_method varchar(10)、request_path varchar(255)、user_id Int?、username varchar(50)、client varchar(10)（web/miniapp）、ip varchar(64)、user_agent varchar(255)、params varchar(4000)?（截断+脱敏）、result varchar(2000)?（截断）、status varchar(10)（ok/error）、error_msg varchar(2000)?、cost_ms Int、request_id varchar(36)、operated_at DateTime（索引） |
| login_log       | username varchar(50)、user_id Int?、client varchar(10)、ip varchar(64)、user_agent?，status varchar(10)（ok/error）、message varchar(255)?、request_id、logged_at DateTime（索引）                                                                                                                                                                                                                                                                                                         |
| refresh_token   | token_hash varchar(128) unique、user_id、client varchar(10)、expires_at、revoked_at?、replaced_by_hash? + created_at/created_by                                                                                                                                                                                                                                                                                                                                                            |
| file_object     | storage_key varchar(255) unique、original_name varchar(255)、suffix varchar(10)、mime_type varchar(100)、size_bytes Int、storage varchar(20) @default("local")、checksum_sha256? + 审计列                                                                                                                                                                                                                                                                                                  |
| sample_record   | name varchar(100)、category varchar(50)?、amount Decimal(12,2)?、enabled、remark? + 审计列（示例实体，字段刻意通用）                                                                                                                                                                                                                                                                                                                                                                       |
| gen_definition  | name varchar(50)（模块名，kebab-case unique）、display_name varchar(50)、fields Json（元数据数组）、remark? + 审计列                                                                                                                                                                                                                                                                                                                                                                       |

**菜单种子树**（perms 绑定）：系统管理(M) → 用户管理(C system:user:list perms system:user:*按钮)、角色管理、菜单管理、权限管理、字典管理、系统参数；审计(M) → 操作日志、登录日志；开发工具(M) → 示例数据(SampleRecord)、代码生成。仪表盘(C)。

**权限点种子**：`system:user:{list,detail,create,update,delete,reset-password,assign-roles,enable}`、role/menu/permission/dict/setting/log/file/sample/gen 各自的 list/detail/create/update/delete 等同构集合 + `*:*:*`（superadmin）。

**字典种子**：sys_user_gender（男0/女1/未知2）、sys_normal_disable→改用 enabled 语义的 sys_yes_no、sys_oper_type、sys_sample_category（通用枚举示例 A/B/C）。

**参数种子**：sys.user.initPassword（初始密码）、sys.register.enabled=false、sys.file.maxSizeMb=20、sys.file.allowedExt=jpg,png,pdf,docx,xlsx,zip。

## 6. RuoYi 模式取舍（重写，不复制）

**取**：

- web：401 统一处理+防重复弹登出框（改为标准 HTTP 401 分支）、动态路由三步曲（getInfo→generateRoutes→addRoute，`return {...to, replace:true}`）、`import.meta.glob('@/views/**/*.vue')` 做后端 component 字符串→懒加载映射、v-permission 指令（无权限移除节点）+ checkPermi 函数、useDict（Pinia 缓存 label/value/tagType）、CRUD 五段式页面（搜索表单/按钮行/表格/分页/弹窗表单）、Pagination/RightToolbar 组件、`.env` 三环境+proxy rewrite、pino/结构化日志
- api：@Log 异步审计（切面→事件→落库，参数/结果截断 3800 字符+敏感字段脱敏 password/token/secret）、唯一性校验在 service 层 exists 判断、字典/配置缓存（无 Redis → 进程内 Map 缓存+写时精确失效+TTL）、OSS 抽象→StorageService 接口
  **弃**：雪花 ID、Redis 二级缓存、数据权限拦截器（P1）、globalProperties 挂载（改显式 import）、char(1) 状态、rows/total 分页、TopNav 双布局、TagsView 首版可不做（保留 keep-alive 简化布局）、锁屏/Crontab/Excel 导入导出（P1）。

## 7. 阶段门禁与状态

| Stage   | 内容                                                                                                             | 门禁                                       | 状态 |
| ------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| 0 M0    | 规范包入仓、workspace 骨架、eslint9+prettier+TS strict、mise.toml、compose.dev.yaml、CI 骨架、openspec init 尝试 | `pnpm i && pnpm lint && pnpm typecheck` 绿 | [x]  |
| 1       | packages/contracts 全部 Zod schema+错误码+分页类型                                                               | typecheck+单测绿                           | [x]  |
| 2 M1    | api：bootstrap/全局件/Prisma migration+seed/auth+RBAC/系统模块/health/swagger                                    | vitest 单测+真库 integration 全绿          | [x]  |
| 3 M1-M2 | web 全部页面与布局                                                                                               | vite build 绿+对 api 真实联调              | [x]  |
| 4 M2-M3 | files/SampleRecord 闭环/生成器/@Audit                                                                            | 越权负例+确定性测试绿                      | [x]  |
| 5 M3    | miniapp 登录/我的/SampleRecord                                                                                   | build:mp-weixin 产物生成                   | [x]  |
| 6 M4    | e2e/安全回归/compose 全栈/README/交付报告                                                                        | compose 起→health 通→浏览器闭环            | [x]  |

## 7.1 当前状态与接手必读事实

> 本节与 §8 在每次交接时**整体重写**，对准下一个任务；只保留接手需要的 operative 事实，变更历史看 git log。

**完成度速览**：Stage 0-6 全部收官；2026-11-07 五变更与 2026-11-08 `adopt-wot-design-uni`（miniapp 组件层 wot-design-uni 1.14.0：uni_modules 内联 + 三页 wd-* 替换 + tgTokens 主题桥接 + tabBar 图标，细节见下方「miniapp 组件层」事实与 §8 入口 1）经 owner 验收归档（`openspec/changes/archive/2026-11-0{7,8}-*`），openspec 10 个能力基线 validate 全绿：`add-e2e-test-hardening`（Playwright e2e 5 例入 CI + `TEST_DATABASE_URL` 修复 + 死配置清除）、`unify-terminal-401-relogin`（两端终局 401 统一：按 HTTP 状态码判定、终局清理回登录、文案区分停用/过期，identity-access spec 增补不变量）、`add-frontend-global-error-handling`（两端全局异常兜底 + 节流提示 + miniapp requestId 透传）、`align-miniapp-ui`（UnoCSS token 单源 + 三页 utility 化 + dayjs 双端时间单源，修 UTC 裸切时区 bug）、`add-miniapp-state-i18n`（pinia + vue-i18n 基线：文案收编、语言切换、导航/tabBar 运行时同步、`tg_locale` 持久化）；新增能力基线 miniapp-ui / frontend-resilience / miniapp-client，e2e-testing 基线落地。归档前评审循环：五变更收官时全树复审（spec 文案规则对齐、delta 结构修复、preset 命名纠偏、ci 死配置清除）；wot 变更实施后一轮评审循环修复 2 项细节（CRLF 归一、theme.ts 头注陈旧引用）。当前测试矩阵：单元 70（contracts 17 + api 生成器 7 + web 16 + miniapp 30）+ 真库集成 26 + 浏览器 e2e 5（`pnpm test:e2e` 一键跑，自动起 api:3001 + web:5174 指向 tiangong_test，globalSetup 自动 migrate+seed+复位 admin 锁定计数）。**下一个任务：无在途变更（2026-11-08 六变更收官归档，wot 组件层基线并入 miniapp-ui）；后续会话按 §8 入口进入。**

**环境基线**（动手前核对，勿凭记忆）：

- 已锁依赖（pnpm-lock）：NestJS 11.2 / Prisma 6.19 / zod 4.1 / nestjs-zod ^5.5 / Vue 3.5 / Vite 8（rolldown）/ Element Plus 2.14 / vue-router 5 / pinia 4 / vue-i18n 11 / axios 1.21 / vue-tsc 3.3 / Tailwind 4.3（@tailwindcss/vite，CSS-first）/ echarts 6.1（echarts/core 按需，BaseChart 单源）/ multer 2.4 / vitest 3.2（contracts/web）/ @playwright/test 1.5x（apps/e2e）
- dev 库 = `~/workspace/env` 共享栈 env-mysql 8.4（宿主 3307，账号 tiangong/tiangong_dev）；测试库 `tiangong_test` 同实例；`apps/api/.env` 已配好（随机 JWT secret；ADMIN_INITIAL_PASSWORD=Tgdev3e3b3e5036da25f0；STORAGE_DIR=./storage/uploads；MAX_UPLOAD_MB=20）
- dev 联调：`pnpm dev:api`（:3000）+ `pnpm dev:web`（:5173，vite 代理 /api → 3000，HttpOnly refresh Cookie `tg_refresh` 同源自动携带）；登录账号 admin（密码见 .env）。注意本机 3000 若有遗留 dev api 进程属正常，e2e 用 3001/5174 与其隔离互不影响
- e2e 账号约定：admin 密码固定 `TestAdmin1pw`（globalSetup 以 env 注入 seed/服务进程）；fixture 零权限角色 `e2e_noperm_role` + 用户 `e2e_noperm`，用后即删（apps/e2e/tests/helpers.ts）
- API 端点全集：/health/live|ready、/auth/*、/users、/roles、/permissions、/menus、/dict-types|/dict-items|/dicts/:key/options、/settings、/oper-logs、/login-logs、**/files(+/:id/download)、/samples、/gen-definitions(+/preview|:id/preview)**；swagger /docs
- 前端锚点：五段式页模板看 `views/system/user/index.vue`（带字典的看 `views/dev/sample/index.vue`）；request 层 `src/utils/request.ts`；公共件 FormDialog/SearchForm/Pagination/RightToolbar/DictTag/MenuIcon + useDict/usePermission + confirmDelete/confirmBox（选用表见 UI_STYLEGUIDE）
- 样式与 UI 规矩：见 ADR-0006 + `docs/architecture/UI_STYLEGUIDE.md`（token 单源 `apps/web/src/styles/index.css`；EP 管控件、Tailwind 管布局；preflight 禁用；禁魔法值/emoji 图标/AI 味套路）
- 响应契约（已测试锁定）：成功 `{code:0,data}`；错误 `{code,message,data:null,requestId}` + 正确 HTTP 状态码

**平台模块关键事实**：

- **生成器渲染单源**：`apps/api/src/modules/generator/render/`（服务端预览与 CLI 共用）；产物 7 件定版路径；CLI `pnpm gen:crud <name>` 留在 `apps/api/scripts/`（pnpm 严格解析），仓库根用 pnpm-workspace.yaml 探测（**不可用 import.meta.url**，tsx CJS 转译下 shim 不可靠）；任一目标文件已存在整体拒绝
- **files 模块**：`src/common/storage/` + `src/modules/files/`；上限 = min(sys.file.maxSizeMb, MAX_UPLOAD_MB)；busboy latin1 文件名 mojibake 已修复；下载非 envelope 二进制流
- **更新动词 = PUT（跨端统一，部分合并语义）**：曾用 PATCH + `X-HTTP-Method-Override` 适配层（微信 request 不支持 PATCH），2026-11-07 owner 决策改为全线 PUT（对齐 RuoYi 约定，微信原生支持），适配层已删除；约定写明在 docs/architecture/API_CONTRACT.md；集成测试含 miniapp 原生 PUT 更新用例
- **miniapp**：`apps/miniapp`（uni preset vite-ts；vite 5.2.8 为 uni 插件约束勿升；typescript 已升 5.9 + 自写 tsconfig——模板 extends 的 @vue/tsconfig@0.1.3 含 TS5.9 移除项）；API 基地址 `VITE_API_BASE_URL`（.env，真机需 https+域名白名单）；模板 eslint 由根 flat config 覆盖
- **miniapp 状态与文案基线（add-miniapp-state-i18n）**：pinia 4 + vue-i18n 11（版本对齐 web 已锁线）；凭据存储单源仍是 `utils/auth.ts`，auth store 只做其上的响应式会话态（401 终局路径不经 store，防模块环）；语言偏好 `tg_locale` 持久化（非法值回落 zh-CN），导航标题/tabBar 由 app store `syncChrome` 运行时同步（pages.json 中文仅首帧默认）；终局 401 提示分类 `sessionExpiredCategory`（expired/disabled）为可测枚举，测试锁分类与次数、不锁文案
- **e2e 工程**：`apps/e2e`（单 worker 顺序执行保确定性；reuseExistingServer 本地 true/CI false；CI 失败上传 playwright-report artifact）；web/miniapp 单测纯逻辑走 node 环境（miniapp 用 uni 全局桩），组件行为统一由 e2e 覆盖，不在单测层 mount
- **miniapp 组件层（adopt-wot-design-uni，2026-11-08 实施）**：wot-design-uni 1.14.0 以官方 tarball 内联 `src/uni_modules/wot-design-uni/`（npm 直装被 uni mp 编译器 chunkFileNames 阻断，阶梯实证见 ADR-0008）；`sass@1.78.0` 精确锁版（v1 硬约束）；组件库纪律见 UI_STYLEGUIDE「miniapp 参照执行」组件层节（theme-vars 桥接单点 `src/theme.ts`、46px 控件档、反馈层不替换）。**typecheck 隔离三件**：tsconfig `exclude: ["src/uni_modules"]` + locale 深路径 type-only 导入（禁从包根导入，会拉全量组件源）+ `src/shims/wot-locale.ts` 垫片（.ts 形态，.d.ts 会触发 vue-tsc Debug Failure）；eslint/prettier 同步 ignore 库目录。tabBar 图标 = EP 同源字形 PNG，`scripts/gen-tab-icons.mjs` 生成（playwright chromium 取自 apps/e2e）
- **微信开发者工具自动化**：小程序测试号 appid 经 `MP_WEIXIN_APPID`（apps/miniapp/.env，gitignored；.env.example 有样例）构建后注入产物 project.config.json（`scripts/patch-mp-appid.mjs`，manifest 恒为 touristappid 占位，不设置则保持占位）——公众号测试号 appid 服务端校验会以 invalid app type 拒绝，勿混用；占位 touristappid 仅 GUI 游客模式可用，CLI/HTTP 全系拒绝；模拟器走查链路 = IDE 设置开启服务端口（本机已开）→ `cli auto --project apps/miniapp/dist/build/mp-weixin --auto-port 9420` → miniprogram-automator connect 驱动页面与截图；首次编译期 automator 老版会对空 getPageMeta 消息同步抛错，脚本需守卫 uncaughtException 并轮询 currentPage
- **终局 401 不变量（两端同语义，勿再分叉）**：非 auth 路径收到 HTTP 401 → 单飞刷新重放一次 → 重放仍 401 或刷新失败 ⇒ 清理本地会话并引导重登；判定按状态码不按错误码；auth 路径 401 不清理；提示恰好一次且区分停用/过期文案（带凭据重放后仍被拒 = 停用，无凭据/刷新失败 = 过期；web 无凭据终局不可达按码判定等价，miniapp 以是否已重放为信号；web 归 auth store 防抖，miniapp 单 toast）。实现锚点 `apps/web/src/utils/request.ts` / `apps/miniapp/src/utils/request.ts`，契约见 identity-access spec
- **错误文案国际化分层（ADR-0007）**：`code` 为对外契约，服务端 message（英文）为日志/回落文本，用户可见文案归客户端 locale 层——web 走 vue-i18n 键，miniapp 走 `locales/` vue-i18n 资源的 `errors` 组映射（未收录码回落英文）。后端 i18n 不预建；触发条件 = 服务端主动用户文本能力（通知/邮件/短信）立项时随该能力 ADR 重开
- **miniapp vite 配置为 ESM（vite.config.mts，勿改回 .ts）**：`unocss/vite` 为 ESM-only 而 `@dcloudio/*` 为 CJS-only 且缺类型声明——.mts 下 uni 插件须取 `.default`（unocss#3776 维护者方案）；uni 插件硬编码 `resolve.preserveSymlinks: true`，pnpm 虚拟仓库中的传递依赖（pinia 的 `nostics`、vue-i18n 的 `@intlify/*`）沿符号链接路径解析必炸，配置内以置于 uni 之后的定制 Plugin 的 config 钩子翻回 `false`（config 钩子按插件顺序合并、后者覆盖标量；与 web 裸 vite 语义一致）

**已知坑**（违反必返工）：

1. 禁用 `@typescript-eslint/consistent-type-imports`：会把 DI 构造器注入改写成 import type，擦除 NestJS 元数据
2. vitest 必须走 unplugin-swc + reflect-metadata setup（esbuild 不支持 emitDecoratorMetadata）
3. 直接 import 'express' 的代码必须把 express 声明为直接依赖（pnpm 严格解析）
4. 一切 MySQL 连接走 3307：宿主 3306 是 OrbStack 幽灵转发，指向不存在的实例
5. markdown 里写通配符（`*.*`、`*:*:*`）必须套反引号，否则 prettier 会当强调语法吞星号
6. **vite 8 dev 的文件 watcher 在本机不生效**：改完前端源码必须重启 `pnpm dev:web`（否则浏览器跑旧代码）
7. Element Plus 未全局注册图标：el-button 必须用 `:icon="组件"`（显式 import）
8. 契约细节：字典类型/项 update 的 remark 只能省略不能置 null；列表 enabled 过滤传 `'true'/'false'` 字符串（contracts 已修 coerce 缺陷，勿改回）
9. **IAB 浏览器自动化**：Playwright locator click 对按钮持续超时（actionability 卡死），用 `tab.cua.click({x,y})` 坐标点击；`node_repl` 每次 js 调用必须重跑完整 bootstrap；IAB 不支持 file chooser（上传类走查用 curl 打真实进程）
10. **miniapp typecheck**：`pnpm --filter @tiangong/miniapp type-check`（vue-tsc 3）；uni 的 SFC 需要 `@dcloudio/types`；微信 request method 无 PATCH——更新动词已全线统一为 PUT（见「平台模块关键事实」）
11. **vite 8 loadEnv 不合并 process.env**：外部环境注入代理目标（e2e 切 3001）必须由 vite.config 显式读 `process.env.VITE_DEV_PROXY_TARGET` 优先（已实现，勿改回）；`pnpm --filter x dev -- --port` 的 `--` 会被原样透传给 vite，透传参数用 `exec vite`
12. **axios 自定义 adapter 需自行 settle**：非 2xx 必须用 AxiosError 附带 response 拒绝，否则走成功分支——范本见 `apps/web/src/utils/__tests__/request.test.ts` 假 adapter
13. **playwright install 官方源在本机停滞**：用 `PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/` 下载；seed 幂等 upsert 的 `update: {}` 不覆盖既有 admin 密码——换测试密码需先清库或直接改库
14. **微信 IDE 自动化桥对 virtualHost 上提树不可靠**（wot 接入后实测）：`page.$$` 无 wd-* tag 查询（仅 `view >>> <sel>` 深选择可达）、深层元素无 `.input()` 且 trigger 不达 uni v-model、size/offset/text 序列化残缺（text 对真节点可用，按 i18n 全文匹配）、页面 data 键被编译压缩（dialogVisible 等运行时态不可读）、合成点击几何不可信——**mp 侧 automator 只取三件：页面路径断言 + 截图 + console.error 收集；登录打字/弹层/语言/登出等交互环一律走 H5 playwright 补验**（`python3 -m http.server 5173` 服 `dist/build/h5`，源必须是 `http://localhost:5173`——api CORS 白名单仅此一条；选择器用 `uni-button.wd-button`/`.uni-tabbar__item`/`.wd-cell`，tabbar 项需 force:true）

## 8. 后续工作指引（项目收官态）

建设阶段与 2026-11-07 五变更、2026-11-08 wot 组件层变更均已收官归档；`openspec/changes/` 无在途变更。后续会话按需从以下入口进入：

1. **miniapp 组件层（已收官归档 2026-11-08）**：`adopt-wot-design-uni` tasks ①-⑨ 全部完成并加验 owner 反馈两项（tabBar 图标、46px 控件档）——三页 wd-* 替换 + 主题桥接 + sass 1.78 锁版 + vue-tsc 隔离三件 + 双端构建/门禁全绿 + 双端走查（mp 截图与 H5 playwright 交互环，console.error=0）；决策与安装路线见 `docs/adr/0008-adopt-wot-design-uni.md`（v1 冻结 ≠ 断更的证据链已补入）；组件库纪律沉淀在 UI_STYLEGUIDE「miniapp 参照执行」节。后续如需启用 picker/日历/上传类组件或升级 v2，先读该 ADR 的升级触发条件。
2. **按需启用 P1 能力**（FUNCTION_MATRIX：通知公告/在线会话/定时任务/部门组织/岗位/数据权限/导入导出）：走 OpenSpec 变更流程（proposal→tasks→实现→验收→archive），先读 `docs/requirements/FUNCTION_MATRIX.md` 的「最低交付要求」。
3. **业务项目接入**：业务模块以插件式变更加入，不修改平台模块承载业务规则（CONSTITUTION 约束）；可用 `pnpm gen:crud` 生成纵向骨架后人工补齐业务语义。
4. **真实环境上线前必办**：配置远端仓库验证 CI 实跑（当前 NOT VERIFIED）；微信小程序真机预览验证（开发者工具模拟器走查已过，2026-11-08）；生产 secrets 与域名注入演练。
5. 任何改动遵守 AGENTS.md 工作契约与 UI_STYLEGUIDE；门禁：`pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @tiangong/api test:integration && pnpm build && pnpm test:e2e`（集成与 e2e 需本地共享栈 MySQL 3307 在跑）。
6. 验收证据与遗留项见 `docs/quality/DELIVERY_REPORT.md`；既有基线 spec 共 10 个（openspec/specs/），改动平台行为先改对应基线或走变更 delta。
