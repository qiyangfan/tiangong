# 天工 (tiangong)

以 RuoYi 能力为基准的**通用 TS 全栈后台脚手架**（业务无关）：NestJS 11 + Prisma 6 + MySQL 8.4 + Vue 3.5 / Element Plus + uni-app 微信小程序，pnpm workspace 单仓三端。不包含任何行业/客户业务模块，不复制 RuoYi 源码（重写其模式，不拷贝实现）。

## 能力总览（P0）

- **认证与会话**：账号密码（argon2id）、登录失败锁定、JWT access 15min + refresh 7d 轮换吊销（web 走 HttpOnly Cookie，小程序走 body）
- **RBAC**：独立 Permission + 角色关联，API 默认拒绝，超管 `*:*:*`；菜单树按权限过滤，按钮级 perms 显隐
- **系统管理**：用户 / 角色 / 菜单 / 权限 / 字典 / 系统参数；审计中心（操作日志 + 登录日志，敏感字段脱敏）
- **文件服务**：multipart 上传（大小 / 扩展名白名单 / MIME 一致性）、随机存储键、授权流式下载
- **代码生成器**：gen_definition 元数据 CRUD + 服务端预览 + CLI `pnpm gen:crud`（已存在文件一律拒绝覆盖，两次生成 diff 为空）
- **示例实体**：SampleRecord 三端同源 CRUD（Web 管理页 + 小程序页读写同一 API）
- **健康检查**：`/api/v1/health/live|ready`；OpenAPI 文档 `/docs`

## 快速开始

环境要求：Node ≥ 24（mise 锚定）、pnpm 12、Docker（MySQL 8.4）。

```bash
# 1. 起开发库（共享栈 env-mysql，宿主 3307；或回退 deploy/compose.dev.yaml）
cd ~/workspace/env && docker compose --profile mysql up -d mysql

# 2. 安装 + 迁移 + 种子（幂等；admin 密码读 ADMIN_INITIAL_PASSWORD）
pnpm install --frozen-lockfile
pnpm --filter @tiangong/api prisma:deploy
pnpm --filter @tiangong/api prisma:seed

# 3. 联调（api :3000，web :5173 代理 /api）
pnpm dev:api
pnpm dev:web   # 另开终端
```

登录账号 `admin`，密码为 `apps/api/.env` 的 `ADMIN_INITIAL_PASSWORD`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm lint` / `pnpm typecheck` | 全仓 lint（eslint9 flat）/ 类型检查（TS strict） |
| `pnpm test` | 单元测试（vitest；api 单测走 unplugin-swc） |
| `pnpm --filter @tiangong/api test:integration` | 真库集成 26 例（自动对 tiangong_test migrate + seed） |
| `pnpm test:e2e` | 浏览器端到端（Playwright 自动起 api+web，指向 tiangong_test） |
| `pnpm build` | 全仓构建（contracts → api/web） |
| `pnpm --filter @tiangong/miniapp build:mp-weixin` | 小程序产物（dist/build/mp-weixin） |
| `pnpm gen:crud <module-name>` | 代码生成器 CLI（先在 Web「开发工具 → 代码生成」建定义） |
| `pnpm db:migrate` / `pnpm db:seed` | Prisma 迁移 / 幂等种子 |

## 全栈部署

```bash
cd deploy
JWT_ACCESS_SECRET=<≥32字符> ADMIN_INITIAL_PASSWORD=<初始密码> \
  docker compose up -d --build
# web: http://localhost:8080（nginx 反代 /api → api:3000）
```

生产必须经环境变量注入 secrets 与初始密码；compose 内默认值仅为本地演示哑值，禁止用于真实环境。

## 目录结构

```
apps/
  api/        NestJS（路由 /api/v1；common 全局件 / security 守卫 / modules 业务模块）
  web/        Vue3 + Vite + Element Plus + Tailwind v4（token 单源 styles/index.css）
  miniapp/    uni-app Vue3（登录 / 我的 / 示例数据）
  e2e/        Playwright 端到端（自动起 api+web，指向 tiangong_test）
packages/
  contracts/  Zod schema + 错误码 + 分页类型（三端契约唯一来源）
deploy/       compose.yaml 全栈 / compose.dev.yaml 回退库 / nginx.conf
docs/         BUILD_PLAN（交接权威）/ ADR / API_CONTRACT / UI_STYLEGUIDE / requirements
openspec/     能力 spec（已实现基线）
```

## 工程约定

- 工作契约：`AGENTS.md`（所有 Coding Agent 必读）；治理宪法：`CONSTITUTION.md`
- 架构决策：`docs/adr/`；API 契约细节：`docs/architecture/API_CONTRACT.md`；前端样式规矩：`docs/architecture/UI_STYLEGUIDE.md`
- 质量门禁：`pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @tiangong/api test:integration && pnpm build && pnpm test:e2e`（CI 为最终执法点）
- 交付验收证据与遗留项：`docs/quality/DELIVERY_REPORT.md`

## 参考资料

- RuoYi 官方仓库（能力参考）：https://github.com/yangzongzhuan/RuoYi-Vue
- RuoYi 官方文档：https://doc.ruoyi.vip/
- OpenSpec 官方：https://github.com/Fission-AI/OpenSpec
