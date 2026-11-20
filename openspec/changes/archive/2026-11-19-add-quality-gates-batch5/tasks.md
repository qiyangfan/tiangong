# 任务清单：2026-11-19-add-quality-gates-batch5

## 1. 系统模块 UI e2e

- [x] 1.1 `apps/e2e/tests/system-crud.spec.ts`：角色/菜单/字典（类型+项抽屉）/参数/
      生成器（含预览）/审计双日志/个人中心（改昵称并恢复）
- [x] 1.2 删除动作等待 DELETE 响应并断言成功；fixture 统一 `E2E-` 前缀，beforeAll/afterAll 回收
- [x] 1.3 发现并修复缺陷：角色/用户/菜单页 `confirmDelete()` 解析 undefined 被 `if (!ok)` 判失败，
      确认删除后直接 return；统一改为 `.then(() => true).catch(() => false)`
- [x] 1.4 全量 e2e 14/14 通过

## 2. 全页运行时 a11y

- [x] 2.1 a11y 用例改为按 `/auth/menus` 菜单树递归遍历全部 C 型页面，另扫 `/profile`、`/404`
- [x] 2.2 修复 `/system/file` 上传触发器 `nested-interactive`：触发器改纯文本 span（EP 容器本身是 role=button）
- [x] 2.3 负向证据：首跑命中 `/system/file` nested-interactive；修复后全页扫描 0 违规

## 3. API 响应契约校验

- [x] 3.1 `apps/api/test/integration/contract-responses.test.ts`：15 个只读接口 + 登录/字典/参数/
      示例/生成器/文件上传 + 错误 envelope，全部用 contracts zod schema 解析
- [x] 3.2 失败信息输出 zod issues；23 例通过

## 4. knip 收紧

- [x] 4.1 清除存量：未用导出（openApiConfig/API_PORT/WEB_PORT/buildTreeSelectData/GenDefinitionRequest 再导出）、
      未用类型（ToolbarColumn/ThemeMode/LocaleCode/TgError）、未列二进制（hadolint/trivy）、冗余配置
- [x] 4.2 `knip` 实测 exit 0；CI 去掉 `continue-on-error`，改为阻断
- [x] 4.3 miniapp 保留 `ignoreWorkspaces`（uni easycom/自动导入误报），配置与文档注明

## 5. dev 依赖审计

- [x] 5.1 security.yml 审计改为全量依赖（含 dev），`--audit-level=high` 阻断
- [x] 5.2 vitest 4.1.12 升级（api/web/contracts），miniapp 因 uni 钉 vite 5 保留 vitest 3
- [x] 5.3 overrides：`vitest@3.2.7>tinypool=2.1.2`、`body-parser@1.20.3=1.20.9`、
      `path-to-regexp@0.1.10=0.1.13`、`@dcloudio/uni-automator>ws=^8.21.0`
- [x] 5.4 全量审计当前无 high/critical；新增根脚本 `audit:deps`
- [x] 5.5 vitest 4 统计口径迁移：contracts 100/100/100/100；web 补 utils 单测至 100/95.94/100/100；
      api 分支阈值按实测重定 58（其余保持 70/68/70）

## 6. tsconfig 严格开关

- [x] 6.1 启用 `exactOptionalPropertyTypes` 与 `noPropertyAccessFromIndexSignature`，实测 54 处
- [x] 6.2 修复：Prisma 可选入参收敛到 `defined()`（新增 `apps/api/src/common/defined.ts`）；
      ConfigService `getOrThrow`；`process.env`/`RouteMeta`/`FormRules` 等索引签名改括号访问；
      可选字段改条件展开
- [x] 6.3 全部 workspace typecheck 通过，lint 0 error

## 7. 收尾

- [x] 7.1 e2e 覆盖率阈值按新基线重设 82/58/75/82（实测 84.33/60.58/77.5/84.3）
- [x] 7.2 全量门禁：lint / format / lint:arch / lint:style / lint:md / dup / knip / typecheck /
      build / test:coverage（150 例）/ e2e:coverage（14 例）/ license / sbom / audit / actionlint /
      hadolint
- [x] 7.3 文档：DELIVERY_REPORT / CI_PLAN / BUILD_PLAN 同步；openspec validate --strict 通过

## 8. 门禁代码评审修复（同日）

- [x] 8.1 响应契约 schema 改 `z.strictObject`（含 envelope/角色详情 extend/菜单递归），
      多余字段（如 passwordHash）不再静默通过；新增严格性单测
- [x] 8.2 契约探针键纳入 `cleanupFixtures`，失败重跑幂等
- [x] 8.3 文件上传触发器补 `:disabled="uploading"`，恢复上传中禁用语义
- [x] 8.4 compose mysql 健康检查口令与 `MYSQL_ROOT_PASSWORD` 同源（实测覆盖后 config 正确）
- [x] 8.5 tinypool override 放宽为 `vitest@^3.0.0`，避免小版本升级后漏洞覆盖失效
- [x] 8.6 dependabot dev 分组排除 `@dcloudio/*`
- [x] 8.7 gitleaks 移除 docs 整目录豁免（历史扫描无假阳性）
- [x] 8.8 `no-circular` 注释纠正（动态 import 环同样计入，探针实测）
- [x] 8.9 `openapi:update` 追加 prettier，更新后 format:check 不再必红
- [x] 8.10 CI images job 显式 `ADMIN_INITIAL_PASSWORD` 哑值，避免随机口令进日志
- [x] 8.11 pre-commit 的 gitleaks rev 钉提交 SHA（防可变 tag）
- [x] 8.12 复验：架构负向探针 4/4 + 动态循环命中；测试 153/153；e2e 14/14；
      lint/format/typecheck/arch/knip/md/dup/build 全绿；gitleaks/compose config exit 0
