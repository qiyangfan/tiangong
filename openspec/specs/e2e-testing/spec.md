# 端到端浏览器验收 — Implemented baseline specification

> 已实现并通过实测（2026-11-07，变更 add-e2e-test-hardening）：验收证据见 docs/quality/DELIVERY_REPORT.md 验证记录节（`pnpm test:e2e` 5/5）。

## Purpose

定义端到端浏览器验收的目标基线：真实浏览器驱动真实 api 与 web 服务，覆盖认证流、
SampleRecord Web UI 纵向操作与零权限用户的可见行为，并由 CI 执法。

## Requirements

### Requirement: e2e 一键运行

系统 SHALL 提供自动化端到端测试，以真实浏览器驱动真实 api 与 web 服务，命令一键运行，
数据源指向测试库（`TEST_DATABASE_URL ?? 本地共享栈 tiangong_test`），自动完成迁移与种子。

#### Scenario: 一键 e2e

- **WHEN** 执行 `pnpm test:e2e`（本地共享栈可用）
- **THEN** 自动拉起 api 与 web dev 服务、执行 migrate + seed，并全部用例通过。

### Requirement: e2e 覆盖最小纵向集

e2e SHALL 至少覆盖：认证流（错误密码不进入、成功登录、登出回登录页、未登录访问受保护路由
重定向登录页）、SampleRecord 的 Web UI 纵向新增→编辑→删除、零权限用户登录后菜单被服务端
过滤且未注册路由落到 404。

#### Scenario: 零权限用户 UI 行为

- **GIVEN** 零权限角色与用户（经 API 创建的 e2e fixture）
- **WHEN** 该用户经 UI 登录并直接访问 `/system/user`
- **THEN** 侧栏无任何受权限保护的菜单项，且导航结果为 404 页。

#### Scenario: SampleRecord UI 纵向

- **GIVEN** admin 经 UI 登录
- **WHEN** 在示例数据页新增、编辑、删除一条记录
- **THEN** 列表实时反映新增值（两位小数金额）、编辑结果，删除后记录消失。

### Requirement: CI 执法 e2e

CI SHALL 在单元、集成、构建之后执行 e2e，失败时上传 Playwright 报告；集成与 e2e 在 CI 环境
SHALL 经 `TEST_DATABASE_URL` 指向 mysql service。

#### Scenario: CI e2e 步骤

- **WHEN** CI 全流程执行
- **THEN** e2e 在 build 后运行，集成与 e2e 均使用 `TEST_DATABASE_URL`。
