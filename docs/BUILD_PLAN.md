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
| 5 M3    | miniapp 登录/我的/SampleRecord                                                                                   | build:mp-weixin 产物生成                   | [ ]  |
| 6 M4    | e2e/安全回归/compose 全栈/README/交付报告                                                                        | compose 起→health 通→浏览器闭环            | [ ]  |

## 7.1 当前状态与接手必读事实

> 本节与 §8 在每次交接时**整体重写**，对准下一个任务；只保留接手需要的 operative 事实，变更历史看 git log。

**完成度速览**：Stage 0/1/2/3/4 已过门禁入仓（§7 表）。Stage 4 已交付：files 模块（StorageService 接口 + LocalStorage 实现 + multipart 上传/授权下载/删除，8 例集成负例）、SampleRecord 纵向闭环（api + web 五段式页 + web→miniapp 跨端读写集成测试）、代码生成器（gen_definition CRUD + 服务端预览 + CLI `pnpm gen:crud` 拒绝覆盖 + 确定性单测 5 例 + CLI 端到端实测）、文件管理 web 页（seed 菜单已补）。集成测试 25 例、生成器单测 5 例全绿；lint/typecheck/build 绿；浏览器走查三页通过（sample CRUD / file 上传列表 / gen 定义+预览）。**下一个任务是 Stage 5：miniapp（uni-app CLI 工程，登录/我的/SampleRecord 三页）**。

**环境基线**（动手前核对，勿凭记忆）：

- 已锁依赖（pnpm-lock）：NestJS 11.2 / Prisma 6.19 / zod 4.1 / nestjs-zod ^5.5 / Vue 3.5 / Vite 8（rolldown）/ Element Plus 2.14 / vue-router 5 / pinia 4 / vue-i18n 11 / axios 1.21 / vue-tsc 3.3 / Tailwind 4.3（@tailwindcss/vite，CSS-first）/ echarts 6.1（echarts/core 按需，BaseChart 单源）/ multer 2.4（@types/multer 已入 api devDeps，tsconfig types 含 multer）
- dev 库 = `~/workspace/env` 共享栈 env-mysql 8.4（宿主 3307，账号 tiangong/tiangong_dev）；测试库 `tiangong_test` 同实例；`apps/api/.env` 已配好（随机 JWT secret；ADMIN_INITIAL_PASSWORD=Tgdev3e3b3e5036da25f0；STORAGE_DIR=./storage/uploads；MAX_UPLOAD_MB=20）
- dev 联调：`pnpm dev:api`（:3000）+ `pnpm dev:web`（:5173，vite 代理 /api → 3000，HttpOnly refresh Cookie `tg_refresh` 同源自动携带）；登录账号 admin（密码见 .env）
- API 端点全集：/health/live|ready、/auth/*、/users、/roles、/permissions、/menus、/dict-types|/dict-items|/dicts/:key/options、/settings、/oper-logs、/login-logs、**/files(+/:id/download)、/samples、/gen-definitions(+/preview|:id/preview)**；swagger /docs
- 前端锚点：五段式页模板看 `views/system/user/index.vue`（带字典的看 `views/dev/sample/index.vue`）；request 层 `src/utils/request.ts`；公共件 FormDialog/SearchForm/Pagination/RightToolbar/DictTag/MenuIcon + useDict/usePermission + confirmDelete/confirmBox（选用表见 UI_STYLEGUIDE）
- 样式与 UI 规矩：见 ADR-0006 + `docs/architecture/UI_STYLEGUIDE.md`（token 单源 `apps/web/src/styles/index.css`；EP 管控件、Tailwind 管布局；preflight 禁用；禁魔法值/emoji 图标/AI 味套路）
- 响应契约（已测试锁定）：成功 `{code:0,data}`；错误 `{code,message,data:null,requestId}` + 正确 HTTP 状态码
- openspec 校验：`npx -y @fission-ai/openspec@latest validate --all --specs`；file-management spec 已标 Implemented，其余 5 spec 头部仍是「TARGET」模板文案（历史遗留，Stage 6 交付报告前统一处理）

**Stage 4 新增事实**：

- **生成器渲染单源**：`apps/api/src/modules/generator/render/`（服务端预览与 CLI 共用）；产物 7 件定版路径 = contracts schema + prisma model 片段（`apps/api/prisma/gen/`，人工合并）+ api 三件 + web api + web 五段式页；生成页文案走 locale 驱动的本地映射（生成器不注入 locales 源文件），公共键走全局 t()
- **CLI**：`pnpm gen:crud <module-name>`（根 script 转发到 `apps/api/scripts/gen-crud.ts`；CLI 必须留在 api 包内——pnpm 严格解析下根 scripts 目录 import 不到包依赖）；仓库根用 pnpm-workspace.yaml 向上探测（**不可用 import.meta.url**：tsx 按包内 CJS 转译时其 shim 指向不可靠，曾致产物落盘到 apps/apps/）；任一目标文件已存在即整体拒绝（先全量检查再写盘）
- **files 模块**：`src/common/storage/`（STORAGE_SERVICE token + LocalStorage 越界拒绝）+ `src/modules/files/`；生效上限 = min(系统参数 sys.file.maxSizeMb, env MAX_UPLOAD_MB)；multer 硬顶同源 env；扩展名白名单为准 + MIME 冲突拒绝（octet-stream 视为未声明放行）；busboy 对 quoted filename 按 latin1 解码，服务端已做 UTF-8 mojibake 修复（浏览器 filename* 不受影响）；下载走 `/files/:id/download` 二进制流（非 envelope），权限 files:list
- **菜单 seed**：系统管理下新增「文件管理」（component `system/file/index`，perms `files:list`）——老库需重跑 `pnpm --filter @tiangong/api prisma:seed`

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

## 8. 下一任务执行指令（每次交接随 §7.1 一并重写）

1. 先读：本文档 → AGENTS.md → docs/architecture/API_CONTRACT.md → 对应 Stage 的既有代码模式（**新代码必须仿照已建成的模块写**，不许另起炉灶）。
2. Stage 5 接手时（miniapp）：
   - uni-app 用 CLI 工程（`npx degit dcloudio/uni-preset-vue#vite-ts` 或等价 npm 脚手架；**不要 HBuilderX 专属结构**），落在 `apps/miniapp`
   - 请求封装复用 `@tiangong/contracts`（envelope/错误码/类型同源）；token 用 `uni.setStorageSync`；refresh 走 body、`client='miniapp'`；401 单飞刷新重放语义对齐 web 的 request 层
   - 页面：登录、我的（profile + 退出）、SampleRecord 列表+编辑（读写与 Web 同一条 API，完成跨端闭环验收）
   - 门禁：`build:mp-weixin` 产物生成（dist/build/mp-weixin）即达标；真机/微信开发者工具运行 NOT VERIFIED 可如实标注
3. Stage 6（收官）：e2e（compose 全栈起 → health 通 → 浏览器登录→SampleRecord 闭环）、安全回归（越权负例清单复跑）、`deploy/compose.yaml` 全栈、README、交付报告；5 个 spec 头部「TARGET」文案统一转已实现；FUNCTION_MATRIX P0 逐项对照表。
4. 任何门禁失败：修到绿为止或如实标 NOT VERIFIED，禁止跳过门禁宣称完成。权威门禁：`pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @tiangong/api test:integration && pnpm build`（CI 已配 ubuntu-26.04 + node 24 全量跑，本地必须先过）。
5. 常用命令：
   - 本机 MySQL：`cd ~/workspace/env && docker compose --profile mysql up -d mysql`（共享栈 env-mysql 8.4，宿主 **3307**；勿用 3306）
   - 回退：`docker compose -f deploy/compose.dev.yaml up -d`（独立 mysql:8.4，端口 3307）
   - `pnpm --filter @tiangong/api prisma:migrate` / `prisma:seed`（幂等）
   - `pnpm --filter @tiangong/api test:integration`（自动对 tiangong_test migrate deploy + seed；25 用例含 RBAC 负例/refresh 轮换/审计/files 负例/跨端闭环/生成器预览）
   - `pnpm gen:crud <module-name>`（生成器 CLI；落盘前必须先在 Web 代码生成页建定义）
   - `pnpm dev:api` + `pnpm dev:web`（联调；web 端口 5173）
   - `pnpm dev` / `pnpm test` / `pnpm lint` / `pnpm typecheck` / `pnpm build`（根目录聚合）
6. Stage 5（flash 会话）开场白，可直接粘贴：
   > 先完整阅读 `/Users/solvela/workspace/tiangong/AGENTS.md` 与 `docs/BUILD_PLAN.md`（重点 §7.1 当前状态与接手必读事实、§8 执行指令），然后执行 Stage 5（miniapp：uni-app CLI 工程，登录/我的/SampleRecord）。
