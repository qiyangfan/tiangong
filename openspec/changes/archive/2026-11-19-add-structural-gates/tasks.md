# 任务清单：2026-11-19-add-structural-gates

## 1. 实现

- [x] 1.1 `eslint.config.js` 落地规则集与默认阈值；验证：`eslint --print-config apps/api/src/main.ts`
      实测 `complexity [2,20]`、`sonarjs/cognitive-complexity [2,15]`、`max-lines` / `max-lines-per-function`
      / `max-depth` / `max-params` / `max-statements` / `max-nested-callbacks` 均为 `[2]`（默认参数），
      `max-len [0]`（由 Prettier 接管）
- [x] 1.2 存量结构违规清零：`pnpm lint` exit 0（全仓 0 error）；全程无新增 `eslint-disable`、无阈值改写、
      无目录豁免。修复面覆盖 api / web（views、stores、router）/ miniapp / e2e / 集成测试夹具
- [x] 1.3 全仓格式达标：`pnpm format:check` exit 0（`All matched files use Prettier code style!`）
- [x] 1.4 循环依赖门禁真正生效：`import/no-cycle` 的依赖图默认只认 `.js/.mjs/.cjs`，须在
      `settings['import/parsers']` 声明 `.ts/.tsx` 否则对 TS 文件静默跳过；声明后立现 5 处真实循环
      （router/index ↔ guard ↔ stores/auth、login/profile → router → routes 动态回边），已以
      `router/navigator.ts`（惰性绑定 router 实例）断环，复跑 0 error
- [x] 1.5 管理端菜单树契约修正：`MenuTree` 改为 `MenuNodeWithMeta[]` 且子节点同构，与后端
      `menus.tree()` 实际返回一致；用户导航树保持 `UserMenus`（`MenuNode[]`）

## 2. CI 落点

- [x] 2.1 `ci.yml` 在 `pnpm lint` 后增加 `pnpm format:check`；验证：本地 `format:check` exit 0
- [x] 2.2 `ci.yml` 将 `pnpm build` 前移到 `typecheck`/`test` 之前：contracts 的 `dist` 类型产物是
      两者解析前提，全新检出 `pnpm install` 不构建 workspace 包（实测 install exit 0 且无 `dist`）；
      同时根 `package.json` 增加 `pretypecheck` / `pretest` 构建 contracts，本地裸跑同样自洽
- [x] 2.3 本地以 CI 同款顺序全绿：`pnpm lint` → `pnpm format:check` → `pnpm build` → `pnpm typecheck`
      → `pnpm test` → `pnpm --filter @tiangong/api test:integration` → `pnpm test:e2e`

## 3. 负向验收（探针植入 → 必须红 → 移除恢复绿）

- [x] 3.1 植入 13 条语句函数 → `max-statements` error（实测报 13 条 > 上限 10）；移除后 0 error
- [x] 3.2 植入 305 行文件 → `max-lines` error（`File has too many lines (305). Maximum allowed is 300`）；
      移除后 0 error
- [x] 3.3 植入双文件互相 import → `import/no-cycle` error（`Dependency cycle detected`，两文件各报一处）；
      移除后 0 error
- [x] 3.4 植入 `any` → `@typescript-eslint/no-explicit-any` error；移除后 0 error
- [x] 3.5 植入超宽行/乱格式 → `pnpm exec prettier --check <probe>` exit 1（`Code style issues found`）；
      移除后 `pnpm format:check` exit 0

## 4. 全量验证证据

- [x] 4.1 `pnpm test`：api 13/13、web 17/17、miniapp 31/31 通过
- [x] 4.2 集成：一次性 `mysql:8.4`（宿主 3308）下 6 文件 32/32 通过
- [x] 4.3 `pnpm build`：contracts / api / web / miniapp 全部成功（web 有既有 >500kB chunk 警告，非错误）
- [x] 4.4 `pnpm test:e2e`：5/5 通过（登录、RBAC 过滤、SampleRecord 纵向）；另以临时冒烟用例验证
      本次重构页面（dict / dev gen / permission / dev sample / setting）弹窗可打开且无 pageerror，
      通过后已删除临时用例

## 5. 分支保护 required

- [ ] 5.1 暂缓：owner 指示本批不处理 GitHub 分支保护 required check。2026-11-21 owner 指令归档，
      本项转入 `docs/BUILD_PLAN.md` §8 收尾队列跟踪
