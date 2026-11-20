# 变更提案：质量门禁批次 5（UI 闭环 / 全页 a11y / 响应契约 / 依赖与类型收紧）

## Why

批次 1-4 把静态门禁、运行时 a11y、架构分层、契约快照、许可与容器加固补齐后，仍有六项
「能推进但未落地」的缺口：

- 系统模块（角色/菜单/字典/参数/生成器/审计/个人中心）只有集成 API 测试与手工走查，
  UI 无 e2e；批次 5 实施时即通过新用例发现角色/用户/菜单删除按钮在确认后不执行的缺陷。
- 运行时 a11y 仅扫登录页、仪表盘、系统用户页，其余菜单页无人检查。
- contracts 已有 74 个 zod schema，但集成测试只做字段断言，响应多字段/少字段/类型变化抓不到。
- knip 在 CI 中只报告不阻断，存量真实告警长期无人处理。
- 依赖漏洞审计只看生产依赖，dev 工具链（vitest/uni 工具链等）的漏洞不进门禁。
- tsconfig 仍有 `exactOptionalPropertyTypes`、`noPropertyAccessFromIndexSignature`
  未评估，类型严格档未到顶。

## What Changes

- **系统模块 UI e2e**：新增 `system-crud.spec.ts`，覆盖角色/菜单/字典（含字典项抽屉）/
  参数/生成器（含预览）/审计日志查询/个人中心（改昵称并恢复）的完整 UI 闭环；
  删除动作等待并断言 DELETE 响应成功。发现并修复三处删除确认后直接 return 的真实缺陷
  （`confirmDelete()` 解析为 undefined 被当作失败）。
- **全页 a11y**：a11y 用例改为登录后经 `/auth/menus` 拉取菜单树、递归拼出所有 C 型页面
  逐页 axe 扫描，另覆盖 `/profile` 与 `/404`；发现并修复文件页 `el-upload` 触发器的
  嵌套交互违规（触发器改为纯文本容器，键盘与点击由 upload 容器承担）。
- **API 响应契约校验**：新增 `contract-responses.test.ts`，以 contracts zod schema 解析
  15 个只读接口与代表性写入（登录、字典、参数、示例、生成器、文件上传、错误 envelope），
  锁「实际响应形状 == 契约定义」；响应 schema 为 `strictObject`，多余字段（内部字段泄露）
  同样失败。
- **knip 收紧**：清除全部存量告警（未用导出/未用类型/未列二进制/冗余配置），
  CI 改为阻断；miniapp 因 uni-app easycom/自动导入误报仍排除，并在配置与文档注明。
- **dev 依赖审计**：`security.yml` 审计全量依赖；升级 vitest 4（api/web/contracts）、
  miniapp 保持 vitest 3 并将 tinypool 覆盖到 2.1.2；补齐 uni express 链补丁版覆盖；
  当前全量审计无 high/critical。
- **tsconfig 阈值提升**：启用 `exactOptionalPropertyTypes` 与
  `noPropertyAccessFromIndexSignature`，修复 54 处（Prisma 可选入参去 undefined、
  ConfigService `getOrThrow`、路由 meta 括号访问等）；新增 `defined()` 入参清洗单源。
- 无 API 契约与 DB migration 变更（`skip_specs: true`）；删除按钮行为修复与文件页
  触发器 DOM 变化由 e2e 覆盖。

## Impact

- e2e 从 7 例增至 14 例，全页 a11y 覆盖所有菜单页；覆盖率实测升至 84.33/60.58/77.5/84.3，
  阈值重设为 82/58/75/82。
- vitest 4 的 v8 统计口径变化：web 单测阈值按实测重定（100/95.94/100/100），
  api 分支阈值按实测重定（72.11/59.04/79.51/71.83 → 70/58/68/70）。
- CI：`lint:dead` 变为阻断；security 审计不再限定 `--prod`。
- 本地 e2e 新增 `AUTH_LOGIN_LIMIT` / `AUTH_REFRESH_LIMIT` 环境变量放大限流（默认值不变）。
- 类型严格档到顶；`defined()` 统一 Prisma 可选入参的 undefined 语义。
