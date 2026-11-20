# 变更提案：关闭门禁盘点剩余缺口（配置契约 / 详情接口 / 体积预算 / 许可范围）

## Why

批次 1-5 与随后的门禁代码评审后，逐项对照 Java 侧门禁清单（spotless / spotbugs / pmd /
jacoco / ArchUnit 等）仍剩 4 项「本地可推进但未落地」的缺口：

- `apps/api/src/config/env.ts` 的 fail-fast 配置契约没有任何测试：缺必填、secret 过短、
  `METRICS_ENABLED` 只认字面 true/false 这些行为改坏不会被门禁发现。
- 响应契约巡检只覆盖列表与代表性写入；`GET /users/:id`、`GET /roles/:id`、`GET /samples/:id`
  三个详情接口无契约断言，其中角色详情是 Web 角色编辑页的真实依赖，权限点映射也没有行为断言。
- 构建产物无体积预算：web 打包产物与微信小程序主包（平台硬限 2MB）膨胀只能在部署后暴露。
- `scripts/license-check.mjs` 的 workspace 清单硬编码 4 个包，新增 workspace 会静默逃过
  生产依赖许可证检查。

## What Changes

- **env 配置契约测试**：新增 `apps/api/src/config/__tests__/env.test.ts`，覆盖必填缺失 /
  secret 过短的 fail-fast（退出码 1、提示字段名、不回显取值）、默认值注入、
  `METRICS_ENABLED` 字面量解析（`'false'` 不得被当成真值）。
- **详情接口契约**：契约断言助手抽到 `apps/api/test/setup/contract.ts`；新增
  `contract-details.test.ts` 覆盖用户/角色（含权限点 `resource:action` 往返）/示例详情与
  404 统一错误 envelope；探针角色键纳入 `cleanupFixtures` 保证重跑幂等。
- **体积预算门禁**：新增 `scripts/bundle-budget.mjs` 与根脚本 `pnpm size:check`，按
  web 产物 gzip 总量（800KiB）与微信小程序主包原始字节（1MiB，平台硬限 2MB）判定；
  CI 在 `pnpm build` 之后执行。
- **许可检查动态化**：`license-check.mjs` 从 `apps/*`、`packages/*` 的 package.json
  推导 workspace 清单（现为 6 个），新增包自动纳入。
- **API 授权矩阵**：新增 `security-matrix.test.ts`，从已装配应用的模块容器枚举全部路由，
  要求每个路由显式声明 `@Public` 或权限点；自助端点（登录后即可访问）用白名单管理并校验
  无过期条目，权限点必须符合 `resource:action` 格式。首次运行即发现
  `GET /dicts/:dictKey/options` 未声明权限点（确认为按登录态读取的自助端点后入白名单）。
- **覆盖率阈值收紧**：四包阈值按 2026-11-20 实测重新贴线（web 60→98 语句、api 函数
  68→78 等），消除「测试已 100%、阈值仍 60%」的松口径。
- 无 API 契约与 DB migration 变更（`skip_specs: true`）。

## Impact

- 门禁新增一次 build 后体积检查；现有产物实测 web 715KiB、小程序主包 334KiB，均在预算内。
- 集成测试新增 4 例、api 单测新增 4 例，测试库清理逻辑增加探针角色。
- 不影响对外 API 与数据库结构。
