# 任务清单：add-e2e-test-hardening

- [x] 1. 死配置与 CI 修复：删除 `JWT_REFRESH_SECRET`（deploy/compose.yaml、ci.yml、README）、
      ci.yml 增加 `TEST_DATABASE_URL`、README 部署命令同步
- [x] 2. `apps/e2e` Playwright 工程：package.json / tsconfig / playwright.config（双 webServer）/
      env 单源 / globalSetup（migrate + seed + admin 锁定计数复位）
- [x] 3. e2e 用例：`auth.spec`（错密停留、成功登录、登出、未登录守卫重定向）、
      `sample-record.spec`（UI 纵向新增→编辑→删除）、`rbac.spec`（零权限用户菜单过滤 + 未注册
      路由 404 兜底，含 fixture 清理）
- [x] 4. web 单测：`src/utils/__tests__/request.test.ts`（401 单飞刷新契约 6 组）、
      `datetime.test.ts`（边界）；web 接入 vitest 与根 `pnpm test`
- [x] 5. CI 增加 e2e 步骤 + 失败报告上传；根脚本接入 `pnpm test:e2e`
- [x] 6. 验证：`pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿（单测 34）；
      `pnpm --filter @tiangong/api test:integration` 26/26；`pnpm test:e2e` 本地实跑 5/5
- [x] 7. 文档：DELIVERY_REPORT 交接节整体重写、`openspec/specs/e2e-testing/spec.md` 基线落地、
      README 命令表与门禁串更新、BUILD_PLAN §7.1/§8 重写
