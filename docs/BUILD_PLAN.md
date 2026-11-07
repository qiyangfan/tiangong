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
├── scripts/          gen:crud CLI
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
| 4 M2-M3 | files/SampleRecord 闭环/生成器/@Audit                                                                            | 越权负例+确定性测试绿                      | [ ]  |
| 5 M3    | miniapp 登录/我的/SampleRecord                                                                                   | build:mp-weixin 产物生成                   | [ ]  |
| 6 M4    | e2e/安全回归/compose 全栈/README/交付报告                                                                        | compose 起→health 通→浏览器闭环            | [ ]  |

## 7.1 当前状态与接手必读事实

> 本节与 §8 在每次交接时**整体重写**，对准下一个任务；只保留接手需要的 operative 事实，变更历史看 git log。

**完成度速览**：Stage 0/1/2/3 已过门禁入仓（§7 表）。contracts / apps/api / apps/web 已建成并真实联调（登录→CRUD→审计→会话恢复→暗色/语言切换全走通）；@Audit 审计切面已随 Stage 2 落地。**下一个任务是 Stage 4：files 模块、SampleRecord 纵向闭环、代码生成器**（dev/sample、dev/gen 两个前端页面目前是占位）。

**环境基线**（动手前核对，勿凭记忆）：

- 已锁依赖（pnpm-lock）：NestJS 11.2 / Prisma 6.19 / zod 4.1 / nestjs-zod ^5.5 / Vue 3.5 / Vite 8（rolldown）/ Element Plus 2.14 / vue-router 5 / pinia 4 / vue-i18n 11 / axios 1.21 / vue-tsc 3.3 / **Tailwind 4.3（@tailwindcss/vite，CSS-first）**
- dev 库 = `~/workspace/env` 共享栈 env-mysql 8.4（宿主 3307，账号 tiangong/tiangong_dev）；测试库 `tiangong_test` 同实例；`apps/api/.env` 已配好（随机 JWT secret；ADMIN_INITIAL_PASSWORD=Tgdev3e3b3e5036da25f0）
- dev 联调：`pnpm dev:api`（:3000）+ `pnpm dev:web`（:5173，vite 代理 /api → 3000，HttpOnly refresh Cookie `tg_refresh` 同源自动携带）；登录账号 admin（密码见 .env）
- API 端点全集：/health/live|ready、/auth/login|refresh|logout|menus|**permissions**|profile|change-password、/users(+reset-password|enabled)、/roles、/permissions、/menus、/dict-types|/dict-items|/dicts/:key/options、/settings、/oper-logs、/login-logs；swagger /docs
- 前端结构锚点：动态路由按后端菜单 component 字符串映射 `apps/web/src/views/<component>.vue`（`import.meta.glob`）；五段式页面模板看 `apps/web/src/views/system/user/index.vue`；request 层 `src/utils/request.ts`（401 单飞刷新重放、envelope 解包）；公共件 Pagination/RightToolbar/DictTag/MenuIcon + useDict/usePermission
- **样式分工（ADR-0006 + `docs/architecture/UI_STYLEGUIDE.md`）**：交互控件及其内部样式一律 Element Plus（主题靠覆盖 EP css-vars，见 `src/styles/index.css` 亮暗两套 token）；布局/间距/响应式/门面视觉用 Tailwind utility（`dark:` 变体已绑 html.dark）；**Tailwind preflight 禁用**（只引 theme+utilities 两层，防重置 EP）。**设计 token 标准**：品牌色绀青（亮 #2f5d9e / 暗 #5b87bd）、语义色竹青/赭金/赭红（与 longzhong 生态同值）、圆角控件 8/卡片 12、字号标题 20/正文 14/注释 12、间距 4px 基数；新页面必须按 UI_STYLEGUIDE 执行（禁魔法值、禁 emoji/符号图标、禁紫渐变/玻璃拟态套路）
- 响应契约（已测试锁定）：成功 `{code:0,data}`；错误 `{code,message,data:null,requestId}` + 正确 HTTP 状态码
- openspec 校验：`npx -y @fission-ai/openspec@latest validate --all --specs`（npm 无 `@openspec/cli` 包）；当前 6 spec 全绿

**已知坑**（违反必返工）：

1. 禁用 `@typescript-eslint/consistent-type-imports`：会把 DI 构造器注入改写成 import type，擦除 NestJS 元数据
2. vitest 必须走 unplugin-swc + reflect-metadata setup（esbuild 不支持 emitDecoratorMetadata）
3. 直接 import 'express' 的代码必须把 express 声明为直接依赖（pnpm 严格解析）
4. 一切 MySQL 连接走 3307：宿主 3306 是 OrbStack 幽灵转发，指向不存在的实例
5. markdown 里写通配符（`*.*`、`*:*:*`）必须套反引号，否则 prettier 会当强调语法吞星号
6. **vite 8 dev 的文件 watcher 在本机不生效**：改完前端源码必须先 `curl -s localhost:5173/src/<file> | grep <新内容>` 验证模块已更新，否则重启 `pnpm dev:web`（否则浏览器跑的是旧代码，症状诡异）
7. Element Plus 未全局注册图标：el-button 必须用 `:icon="组件"`（显式 import），字符串 `icon="Plus"` 不渲染
8. 契约细节：字典类型/项的 update 请求 remark 只能省略不能置 null（partial 语义，非 nullable）；列表 enabled 过滤传 `'true'/'false'` 字符串（contracts 已修 coerce 缺陷，勿改回）

## 8. 下一任务执行指令（每次交接随 §7.1 一并重写）

1. 先读：本文档 → AGENTS.md → docs/architecture/API_CONTRACT.md → 对应 Stage 的既有代码模式（**新代码必须仿照已建成的模块写**，不许另起炉灶）。
2. Stage 4 接手时：
   - **files 模块**：api 仿照 `modules/users`（contracts/files.ts schema 已备好）；上传走 multipart，StorageService 接口 + LocalStorage 实现（随机 key、大小/扩展名白名单、授权后流式下载）；file_object 只存元数据；负例（越权下载 403、路径遍历）进集成测试。若需要新权限点（system:file:*），同时补 seed 幂等数据。
   - **SampleRecord 纵向闭环**：contracts/examples.ts 已有 schema；api 模块 + 替换 web 占位页 `views/dev/sample/index.vue`（五段式仿 system/user）；Web 与小程序读写同一条记录。
   - **代码生成器**：gen_definition CRUD + 服务端模板渲染预览 + CLI `scripts/gen:crud`（**已存在文件一律拒绝覆盖**）；确定性测试 = 同一输入两次生成 diff 为空；模板放 `modules/generator/templates`。
   - 完成后：勾选 §7 表、**对照 Stage 5 整体重写 §7.1/§8**、git commit。
3. Stage 5 接手时：uni-app 用 CLI 工程（不要 HBuilderX 专属结构），请求封装复用 `@tiangong/contracts`；token 用 uni.setStorageSync（refresh 走 body，client='miniapp'）。
4. 任何门禁失败：修到绿为止或如实标 NOT VERIFIED，禁止跳过门禁宣称完成。权威门禁含真库集成：`pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @tiangong/api test:integration && pnpm build`（CI 已跑全量，本地必须先过）。
5. 常用命令：
   - 本机 MySQL：`cd ~/workspace/env && docker compose --profile mysql up -d mysql`（共享栈 env-mysql 8.4，宿主 **3307**；勿用 3306）
   - 回退：`docker compose -f deploy/compose.dev.yaml up -d`（独立 mysql:8.4，端口 3307）
   - `pnpm --filter @tiangong/api prisma:migrate` / `prisma:seed`（幂等；admin 密码读 ADMIN_INITIAL_PASSWORD）
   - `pnpm --filter @tiangong/api test:integration`（自动对 tiangong_test migrate deploy + seed；13 用例含 RBAC 负例/refresh 轮换/审计断言）
   - `pnpm dev:api` + `pnpm dev:web`（联调；web 端口 5173）
   - `pnpm dev` / `pnpm test` / `pnpm lint` / `pnpm typecheck` / `pnpm build`（根目录聚合）
6. Stage 4（flash 会话）开场白，可直接粘贴：
   > 先完整阅读 `/Users/solvela/workspace/tiangong/AGENTS.md` 与 `docs/BUILD_PLAN.md`（重点 §7.1 当前状态与接手必读事实、§8 执行指令），然后执行 Stage 4（files 模块 + SampleRecord 闭环 + 代码生成器）。
