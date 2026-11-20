# 任务

## 1. env 配置契约测试

- [x] 1.1 新增 `apps/api/src/config/__tests__/env.test.ts`：必填缺失与 secret 过短均退出码 1，
      提示含字段名且不回显取值
- [x] 1.2 默认值注入与 `METRICS_ENABLED` 字面量解析（`'false'` → false，非法值 → 退出）

## 2. 详情接口响应契约

- [x] 2.1 契约断言助手抽到 `apps/api/test/setup/contract.ts`，列表巡检改为复用
- [x] 2.2 新增 `contract-details.test.ts`：`GET /users/:id`、`GET /roles/:id`（权限点往返）、
      `GET /samples/:id`、404 错误 envelope
- [x] 2.3 探针角色键纳入 `CONTRACT_PROBE` 与 `cleanupFixtures`，失败重跑幂等

## 3. 构建体积预算

- [x] 3.1 新增 `scripts/bundle-budget.mjs`：web gzip 总量 ≤ 800KiB、小程序主包 ≤ 1MiB，
      产物缺失或超预算即非零退出
- [x] 3.2 根脚本 `size:check` 并接入 CI `pnpm build` 之后

## 4. 许可检查范围

- [x] 4.1 `license-check.mjs` 从 `apps/*`、`packages/*` 动态推导 workspace（现 6 个）

## 6. API 授权矩阵

- [x] 6.1 新增 `security-matrix.test.ts`：从 ModulesContainer 枚举全部路由，要求
      `@Public` 或非空权限点；自助端点白名单校验无过期条目；权限点格式校验
- [x] 6.2 首次运行发现 `GET /dicts/:dictKey/options` 未声明权限点，确认按登录态读取后入白名单
- [x] 6.3 负向验证：把 `GET /roles/:id` 的权限点改为空后测试 exit 1，恢复后通过

## 7. 覆盖率阈值收紧

- [x] 7.1 api 72/58/78/72、web 98/92/96/98、miniapp 80/89/81/80、contracts 99/98/64/99
      （均按 2026-11-20 实测略下方）

## 8. 验证与文档

- [x] 8.1 负向验证：体积预算注入超限文件 exit 1，移除后恢复 0
- [x] 8.2 全量门禁：lint / typecheck / test:coverage（含集成）/ build / size:check /
      license:check / format / arch / knip / md / dup / style
- [x] 8.3 DELIVERY_REPORT / CI_PLAN / BUILD_PLAN 同步，`openspec validate --strict` 通过
