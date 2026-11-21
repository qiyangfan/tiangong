# 任务清单：2026-11-19-add-quality-gates-batch4

## 1. 运行时 a11y

- [x] 1.1 e2e 接入 `@axe-core/playwright`；`tests/a11y.spec.ts` 扫描登录页、仪表盘、系统用户页
      （WCAG 2A/2AA，serious/critical 阻断）
- [x] 1.2 修复真实违规：Navbar 两个图标按钮、RightToolbar 三个圆形按钮补 `aria-label`；
      用户表状态开关补行级可访问名；分页每页条数选择器由包装层补 `aria-label`（EP 未暴露）
- [x] 1.3 对比度：`--el-text-color-secondary/placeholder` 提深至 #6b7280（≥4.5:1）；
      仪表盘快捷入口由可点击 div 改 `router-link`
- [x] 1.4 负向证据：首跑即拦截 `button-name(2)`、`color-contrast(2)`、`label(2)`；修复后 2/2 通过

## 2. 架构分层（ArchUnit 对应物）

- [x] 2.1 `dependency-cruiser` + `.dependency-cruiser.cjs` + `scripts/arch-check.mjs`（逐 workspace
      用自身 tsconfig 解析别名），5 条分层规则 + 静态环检测
- [x] 2.2 存量修复：health 控制器直连 Prisma → 新增 `HealthService`；Sidebar/Navbar 与 auth store
      循环 → props/emit 下沉到 MainLayout；generator 依赖 layout → 动态路由改为命名 layout 根路由的
      子路由（`router.addRoute('layout', …)`），单一 layout 实例
- [x] 2.3 负向：`utils` 探针 import `views` → `web-utils-no-upward` exit 1；修复后 5 个 workspace 全绿
- [x] 2.4 行为回归：e2e 7/7（含菜单渲染、零权限过滤、纵向 CRUD）

## 3. i18n 键一致性

- [x] 3.1 web/miniapp 各一组单测：双语键集合、空值、插值占位符一致，源码字面量 `t('…')` 均可解析
- [x] 3.2 负向：zh-CN 增加 `common.probeOnlyZh` → 键集合不一致 exit 1；移除后通过

## 4. OpenAPI 契约漂移

- [x] 4.1 抽取 `apps/api/src/openapi.ts`（配置与文档构建单源），`main.ts` 复用
- [x] 4.2 `apps/api/test/openapi.snapshot.test.ts`：真实 AppModule + Prisma 打桩生成文档，
      键排序后与 `openapi.snapshot.json` 逐字节比对；`openapi:update` 显式更新
- [x] 4.3 负向：快照尾加空格 → 测试失败并提示执行 update；恢复后通过
- [x] 4.4 注意：快照含全部路由与 schema，契约变更必须人工确认后更新

## 5. 许可合规 + SBOM

- [x] 5.1 `scripts/license-check.mjs`：逐 workspace `licenses list --prod`，SPDX 表达式按
      AND/OR/WITH 拆分逐原子裁决；非标准写法归一（"Apache 2.0"）
- [x] 5.2 白名单逐条：permissive 全集 + MPL-2.0（弱 copyleft，仅 MPL 文件）+ CC-BY-4.0
      （数据型，需署名），理由写进脚本注释
- [x] 5.3 `scripts/sbom-generate.mjs`：CycloneDX（lockfile-only），fail-closed 校验
      bomFormat/components（实测 1866 组件）；`sbom.cdx.json` 不进库
- [x] 5.4 负向：移除 MIT → exit 1；SBOM 输出路径不可写 → exit 1
- [x] 5.5 CI：security.yml dependencies job 增 `license:check`、`sbom:generate` 与 artifact 上传

## 6. 容器加固与安全响应头

- [x] 6.1 compose：api/web `read_only` + `tmpfs /tmp` + `cap_drop: ALL` + `no-new-privileges`；
      api 命名卷 `api-storage`；web 补 healthcheck
- [x] 6.2 api 镜像预建 `/app/storage/uploads` 并 chown 1000（命名卷继承属主，只读根下可写）
- [x] 6.3 nginx：CSP（self + data: + inline style）、nosniff、X-Frame-Options DENY、
      Referrer-Policy、Permissions-Policy
- [x] 6.4 `scripts/check-headers.mjs`；CI images job 起全栈并校验响应头
- [x] 6.5 实测：web 容器 uid 101、只读根下静态与反代 200、响应头校验 exit 0；
      api 容器 uid 1000、health 200、迁移/seed 成功、存储卷可写
- [x] 6.6 负向：无头服务指向 8099 → 校验 exit 1

## 7. strictTypeChecked 真实启用

- [x] 7.1 启用后实测 151 项，全部清零。规则选项两处（写成配置而非 disable）：
      `restrict-template-expressions` 允许 number（数字插值类型安全）、
      `no-extraneous-class` 允许装饰器类（NestJS 模块靠元数据）
- [x] 7.2 代码修复：void 箭头改块体、冗余 String()/可选链/`??` 去除、守卫泛型补 undefined、
      非空断言改显式取值、动态 delete 改 Reflect、事件重载合并、泛型参数收敛
- [x] 7.3 一处按目录豁免：`apps/api/test/integration/**` 的 `no-unnecessary-type-parameters`
      —— `dataOf<T>(body: unknown): T` 是断言辅助函数，T 只能在返回位；改为 unknown+逐处 cast
      收益为负，配置内已注明
- [x] 7.4 全局 lint 0 error（含新增脚本的 sonarjs 规则：localeCompare、语句数拆分、正则线性化）

## 8. 收尾

- [x] 8.1 CI 接线：`lint:arch`、a11y 并入 e2e、OpenAPI 快照随单测、license/SBOM、全栈冒烟
- [x] 8.2 e2e 覆盖率阈值按新基线（新增用户页访问）重设 74/46/64/74，实测 76.97/49.44/67.35/76.93
- [x] 8.3 全量门禁：lint / lint:arch / lint:style / lint:md / lint:docker / dup / format / build /
      typecheck / test:coverage / e2e 7 例含覆盖率阈值 / license / sbom / actionlint / trivy /
      容器冒烟与响应头；openspec validate --strict
- [x] 8.4 文档：DELIVERY_REPORT / CI_PLAN / BUILD_PLAN 同步
