# 设计：补齐自动化 e2e 与测试防护网

## 授权影响

- e2e 自建 fixture：零权限角色 `e2e_noperm_role` + 用户 `e2e_noperm`，经 API 以 admin token
  创建、用后删除（users/roles 均有 DELETE 端点），不触碰 seed 内置角色与权限点。
- e2e admin 密码固定 `TestAdmin1pw`（`ADMIN_INITIAL_PASSWORD` 注入 seed），仅存在于测试环境
  变量与 `tiangong_test` 库，不写入任何生产配置。
- API 强制越权（403 / 默认拒绝）已由集成测试锁定；e2e 只验证 UI 层授权的可见结果（菜单过滤、
  按钮显隐的最终效果），不重复后端断言。

## 迁移影响

- 无 schema 变更。e2e 复用既有 `prisma migrate deploy + db seed` 流程，数据源
  `TEST_DATABASE_URL ?? mysql://tiangong:tiangong_dev@127.0.0.1:3307/tiangong_test`，与集成测试
  同一约定；CI 由 mysql:8.4 service 提供 `TEST_DATABASE_URL`（本次修复缺失注入）。

## 测试影响与分层原则

| 层 | 职责 | 本次内容 |
| --- | --- | --- |
| 单元（vitest，node 环境） | 纯逻辑契约 | request.ts 401 单飞刷新（并发共享/重放/失败清理/auth 豁免/防循环/silent）、envelope 解包、datetime 边界 |
| 集成（真库 supertest） | API 契约与安全负例 | 既有 26 例，不改 |
| e2e（Playwright，真浏览器 + 真双端服务） | UI 纵向行为 | 登录/登出/守卫重定向、SampleRecord UI CRUD、零权限用户菜单过滤与 404 兜底 |

- 断言纪律：锁行为结果（URL 跳转、记录出现/消失、菜单有无、错误码透传），不断言文案措辞、
  i18n 值、样式类。定位器优先用结构性属性（`autocomplete`、`.tg-sidebar__menu`）而非文案。
- web 单测不 mount 组件（无 DOM 依赖）；组件行为交由 e2e 覆盖，避免脆弱的双份维护。

## 运行形态

- `apps/e2e`（`@tiangong/e2e`）：playwright webServer 自动起
  `pnpm --filter @tiangong/api dev`（nest --watch，env 指向 tiangong_test）与
  `pnpm --filter @tiangong/web dev`（vite，proxy → 3000），`reuseExistingServer` 本地为 true、
  CI 为 false；globalSetup 执行 migrate + seed；`workers: 1` 保证对单一 seeded 库的顺序确定性。
- 根脚本 `pnpm test:e2e` 独立于 `pnpm test`（e2e 不带 `test` 脚本名，不会被 `-r run test` 拉进
  单元门禁）；typecheck 纳入 `-r run typecheck`。
- CI：build 后 `playwright install --with-deps chromium` + `test:e2e`，失败上传
  playwright-report artifact。
