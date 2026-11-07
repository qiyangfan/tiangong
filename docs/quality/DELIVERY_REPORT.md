# 天工脚手架交付报告（2026-11-07）

> 现状快照：只写当前形态、验证证据与遗留项；过程与变更历史看 git log。
> 交接权威文件是 `docs/BUILD_PLAN.md`（§7 状态表 / §7.1 必读事实 / §8 执行指令）。

## 交付范围

BUILD_PLAN §7 全部 6 个阶段（Stage 0-6）均已过门禁：contracts 契约层、api 全模块（auth/RBAC/系统管理/审计/files/examples/generator/health/swagger）、web 全部页面（登录/仪表盘/系统管理/审计中心/开发工具）、miniapp 三页、全栈 compose 部署、e2e 浏览器闭环。

## FUNCTION_MATRIX P0 逐项对照

| P0 能力 | 交付形态 | 验证证据 |
| --- | --- | --- |
| 管理员登录/退出 | argon2id + 失败锁定 + refresh 轮换吊销（web Cookie / miniapp body） | 集成：错误密码 401 不泄露存在性、缺 client 400、Cookie 语义、轮换复用拒绝 |
| 当前用户/个人中心 | profile / change-password / 头像字段（上传可选未接 UI） | 集成：带 token 读 profile |
| 用户管理 | CRUD/启停/重置密码（吊销会话）/角色分配/搜索分页 | 集成 + 浏览器走查 |
| 角色管理 | CRUD + 权限关联 + builtin 保护 | 集成：roleKey 冲突 409 |
| 菜单管理 | 树 CRUD + 动态路由 + 按权限过滤 | 集成：noperm 用户菜单树为空 |
| 权限管理 | Permission 独立表 + 默认拒绝 + `*:*:*` 通配 | 集成：越权 403、permissions 端点 |
| 字典管理 | 类型/项/启停/排序 + 进程内缓存写时失效 | 集成 + Web 页（useDict） |
| 系统参数 | 非机密参数 CRUD、builtin 保护、密钥形态 key 拒绝 | 集成 + files 上限联动验证 |
| 操作审计 | @Audit 切面（截断 + password/token/secret 脱敏） | 集成：写操作落审计含 requestId |
| 登录审计 | 成败 + IP + client | 集成 + Web 页 |
| 异常与请求日志 | pino 结构化 + requestId 中间件 + 契约错误 envelope | 集成：错误响应含 requestId |
| 通用附件上传 | StorageService 接口 + LocalStorage、白名单/上限/随机键/授权流式下载 | 集成 8 负例 + 浏览器走查 |
| 通用 CRUD 模块示例 | SampleRecord api + Web 五段式页 + 小程序页 | 集成：web 建档→miniapp 改同一条记录 |
| 代码生成工具 | gen_definition CRUD + 预览 + CLI 拒绝覆盖 + 确定性渲染 | 单测 5 例（两次落盘 diff 为空）+ CLI 端到端实测 |
| API 文档 | OpenAPI（nestjs-zod 桥接）/docs + Bearer 标注 | swagger 可访问 |
| 微信小程序端 | uni-app CLI 工程：登录/我的/SampleRecord | build:mp-weixin 产物 3 页 |
| Web 管理界面 | 登录/布局/菜单/系统管理/日志/文件/代码生成 UI | 浏览器走查 + e2e 闭环 |
| 国际化/主题 | zh-CN 默认 + en；亮暗 token 成对；375/768/1280 走查 | UI_STYLEGUIDE + 浏览器亮暗切换 |
| 系统基础运行指标 | /health/live（进程）与 /health/ready（DB）分离 | 集成：ready 检查 database up |
| 测试/CI/部署 | 单测 17 + 集成 26；CI ubuntu-26.04+node24；compose 全栈 | 下方验证记录 |

## 验证记录（2026-11-07）

- `pnpm lint`、`pnpm typecheck`（contracts/api/web/miniapp vue-tsc）、`pnpm test`（17）、`pnpm build`：全绿
- `pnpm --filter @tiangong/api test:integration`：26/26（认证契约、RBAC 默认拒绝、分页与唯一性、审计脱敏、files 8 负例、SampleRecord 跨端闭环、miniapp 原生 PUT 更新闭环、生成器预览与越权）
- 生成器确定性：同一输入两次渲染/两次独立落盘逐字节一致；CLI 端到端（落盘 7 件 → 二跑整体拒绝并列全部冲突）
- **全栈 e2e**：`deploy/compose.yaml` 起 mysql:8.4 + api（migrate→seed→serve，healthcheck healthy）+ web nginx → `http://localhost:8080` health/live 通 → 浏览器登录（暗色主题）→ SampleRecord 新增 66.60（两位小数）→ 编辑 99.99 → 删除 → 空态。已 down 清理。
- openspec：6 spec validate 全绿，头部均转 Implemented 基线
- 安全回归：越权负例（RBAC 403/文件下载 403/生成器预览 403）、路径遍历剥离、上传白名单、暴力锁定、refresh 轮换复用拒绝——均在集成套件内持续执行；`docs/quality/SECURITY_TESTING.md` 基线逐条覆盖

## NOT VERIFIED（如实标注）

- **GitHub Actions 实跑**：仓库无远端，CI workflow 未经真实 runner 验证（actionlint 本地过）
- **微信小程序真机/开发者工具运行**：本机无工具，仅 build:mp-weixin 产物级验证
- **生产部署**：compose 验证为本地演示口径；生产 secrets/域名/HTTPS 未演练

## 已知限制与设计取舍

- 进程内缓存（字典/参数/权限）——模块化单体默认形态，多实例部署需换共享缓存（CacheService 注释已说明）
- 无 Redis、无软删、数据范围权限/导入导出/在线会话管理为 P1（FUNCTION_MATRIX 明确按需启用）
- 更新动词统一 PUT（部分合并语义，对齐 RuoYi 约定）：微信 request 不支持 PATCH，PUT 为三端原生可用动词，无需任何传输适配层
- 生成器产物不含菜单/权限 seed 注入（人工在 UI 配置，避免覆盖人工改动）；prisma model 片段需人工合并后 migrate
- files 上传走内存存储（≤MAX_UPLOAD_MB 硬顶），大文件分片/直传为未排期能力

## 已知坑速查

见 `docs/BUILD_PLAN.md` §7.1「已知坑」10 条（DI 元数据、swc、3307、vite watcher、EP 图标、IAB 自动化等）。
