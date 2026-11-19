# 变更提案：质量门禁批次 4（运行时 a11y / 分层 / i18n / 契约 / 许可 / 容器）

## Why

批次 1-3 把主流静态门禁补齐后，仍有六类缺口无法靠静态 lint/构建覆盖，另有一条严格档未真正启用：

- ESLint 的 a11y 规则只看模板写法，渲染后的可访问性问题（无名按钮、表单控件无标签、
  对比度不足）无人检查；实测首次运行即命中 `button-name`、`label`、`color-contrast`。
- 结构规则只有 `import/no-cycle`，没有分层约束；实测发现 health 控制器直连 Prisma、
  Sidebar/Navbar ↔ auth store 经 layout/generator 形成的 Vue 循环。
- `en: typeof zhCN` 只在类型层保证键一致，插值占位符、空值、源码引用到不存在的键
  都没有运行时检查。
- OpenAPI 只在运行时 `/docs` 暴露，无提交的契约快照，DTO 改动可静默改变对外契约。
- 生产依赖许可证无人裁决；无 SBOM 产物。
- 容器以默认权限运行（根文件系统可写、保留 capability），nginx 未下发安全响应头。
- strictTypeChecked 从未真实启用，其余量未知。

## What Changes

- **运行时 a11y**：e2e 引入 `@axe-core/playwright`，登录页、仪表盘、系统用户页扫描
  WCAG 2A/2AA，serious/critical 违规阻断；顺带修复真实问题（图标按钮补 `aria-label`、
  用户状态开关补行级可访问名、分页每页条数选择器补 `aria-label`、EP 二级/占位文本色
  提深到 4.8:1 对比度、仪表盘快捷入口改 `router-link`）。
- **架构分层**：新增 `dependency-cruiser` 规则（`.dependency-cruiser.cjs` + `lint:arch`）：
  api platform 层不得反向依赖 modules/入口、controller 不得直连 Prisma、web api/utils
  不得依赖上层、miniapp 页面互不引用、e2e src 不得依赖 tests。存量修复：health 增加
  service 层；动态路由改为挂在命名 layout 根路由下（单一 layout 实例），generator 不再
  依赖 layout，消除跨层循环。
- **i18n 键一致性**：web/miniapp 各加一组单测，校验双语键集合、空值、插值占位符一致，
  以及源码中字面量 `t('…')` 引用均可解析。
- **OpenAPI 契约漂移**：抽取 `src/openapi.ts` 作为文档单源；提交
  `apps/api/openapi.snapshot.json`；单测从真实 AppModule（Prisma 打桩）生成文档并比对，
  `openapi:update` 显式更新。
- **许可合规 + SBOM**：`license:check` 逐 workspace 检查生产依赖许可证（SPDX 表达式按
  AND/OR/WITH 拆分裁决；MPL-2.0、CC-BY-4.0 逐条注明理由）；`sbom:generate` 生成
  CycloneDX 并 fail-closed 自检（非 JSON/零组件即失败）。
- **容器加固**：api/web 只读根文件系统、`cap_drop: ALL`、`no-new-privileges`、tmpfs /tmp；
  api 存储卷预建并归属运行用户；web 补 healthcheck；nginx 下发 CSP、X-Content-Type-Options、
  X-Frame-Options、Referrer-Policy、Permissions-Policy；CI images job 起全栈后执行
  响应头检查脚本。
- **strictTypeChecked**：真实启用并清零 151 项存量（含数字插值、装饰器类两个规则选项；
  集成测试的断言辅助函数一处按目录说明豁免，见 tasks）。
- 无 API 契约与 DB migration 变更（`skip_specs: true`）；路由内部结构、UI 对比色与容器
  运行参数有行为变化，由 e2e 与容器冒烟覆盖。

## Impact

- CI 新增必过项：`lint:arch`、e2e 运行时 a11y（并入 e2e 套件）、OpenAPI 快照测试、
  `license:check`、`sbom:generate`（artifact）、容器全栈冒烟与响应头检查。
- e2e 覆盖率因新增用户管理页访问，实测基线变为 76.97/49.44/67.35/76.93（语句/分支/函数/行），
  阈值重设为 74/46/64/74。
- 容器：web 继续以 uid 101 运行、宿主端口 8080 不变；api 运行用户 uid 1000 且根文件系统只读，
  上传目录经命名卷持久化。
- 视觉：EP `--el-text-color-secondary/placeholder` 提深为 #6b7280，满足 WCAG AA 对比度。
- 已知边界：分页每页条数选择器的可访问名称由包装层在挂载后补写（EP 未暴露该属性）。
