# 变更提案：补齐自动化 e2e 与测试防护网（add-e2e-test-hardening）

## 为什么变

1. **P0 契约欠账**：`docs/requirements/FUNCTION_MATRIX.md`「测试/CI/部署」行（P0）明文要求
   e2e，当前仅有 26 例 API 级集成测试与一次人工浏览器走查；仓库无 playwright/cypress 依赖，
   `ci.yml` 无 e2e 步骤。P0 契约未完整签收。
2. **CI 隐性缺陷**：集成测试以 `TEST_DATABASE_URL ?? 3307 共享栈` 为数据源，但 `ci.yml` 只注入
   `DATABASE_URL`，CI 环境下集成测试会指向不存在的 3307（CI 从未实跑，缺陷未暴露）。
3. **死配置**：`JWT_REFRESH_SECRET` 在 compose.yaml 与 ci.yml 中注入甚至强制校验（compose
   `:?` 语法），但 auth 实现为随机串 + sha256 落库，`apps/api/src/config/env.ts` 不校验、源码
   不消费——误导部署者以为 refresh secret 必需。
4. **前端核心逻辑无测试防护**：web `utils/request.ts` 的 401 单飞刷新（并发共享一次
   refresh、成功重放、失败引导重登、auth 路径豁免、`__retried` 防循环）是全站会话安全的关键
   路径，零测试；`utils/datetime.ts` 为全站时间展示单源，零测试。

## 范围与定级

- 自动化 e2e（Playwright 驱动真实 api + web + MySQL）：**P0 契约补口**。
- 死配置删除 + CI `TEST_DATABASE_URL` 修复：**P0 工程修复**。
- web 单元测试（request.ts 401 契约、datetime.ts 边界）：**P0 测试纪律**，测试分层原则见 design。

## 契约与安全影响

- **不改任何对外契约**：无 API、DTO、DB schema 变更；`pnpm-lock.yaml` 仅新增 devDependencies。
- **安全方向**：删除的 `JWT_REFRESH_SECRET` 无任何代码消费（已全仓核查），删除后 compose 不再
  要求该变量，部署面更小；e2e 使用固定测试密钥与 `TestAdmin1pw`，仅指向 `tiangong_test` 库，
  不触碰开发/生产数据。
- **CI**：新增 e2e 步骤与失败报告 artifact 上传；质量门禁序列变为
  lint → typecheck → test → integration → build → e2e。

## 验收标准

- `pnpm test:e2e` 在本地共享栈一键跑通（自动起 api/web、自动 migrate + seed），3 个 spec 覆盖：
  认证流（错密/登录/登出/守卫重定向）、SampleRecord UI 纵向 CRUD、RBAC 零权限用户菜单过滤与
  未注册路由 404 兜底。
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿，web 单测纳入根门禁。
- `ci.yml` 含 e2e 步骤且集成测试在 CI 环境指向 mysql service。
