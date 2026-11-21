# 变更提案：P0-2 结构类质量门禁（ESLint 默认阈值 + Prettier）

## Why

现有门禁（eslint 基础推荐集 / typecheck / 单测 / 集成 / e2e / build）只能阻断语法与类型错误，拦不住
PMD 一类代码结构问题：上帝方法、深嵌套、超长文件、循环依赖、`any` 逃逸、未使用变量。这些问题不会让
构建变红，却持续抬高维护成本。本仓据此引入 ESLint 生态中与 PMD 对应的主流规则集，阈值全部采用规则
默认值，不做目录豁免。

## What Changes

- `eslint.config.js`：
  - typescript-eslint `recommendedTypeChecked` 仅挂 `**/*.ts`（`projectService`），补齐异步/断言/浮空
    Promise 等类型感知规则；`.vue` 仍由 vue-eslint-parser + vue-tsc 覆盖。
  - `eslint-plugin-sonarjs` recommended：认知复杂度（15）、重复函数（3 行）等。
  - `eslint-plugin-import` recommended + `import/no-cycle: error`（循环依赖）。
  - 结构规则 7 条全部 `error` 且用默认阈值：`complexity 20`、`max-depth 4`、`max-lines 300`、
    `max-lines-per-function 50`、`max-nested-callbacks 10`、`max-params 3`、`max-statements 10`。
  - 行长与格式以 Prettier（`printWidth 100`）为单源，`eslint-config-prettier` 关闭冲突规则。
- 存量清零：按最小责任层拆分热点函数/文件、收敛类型断言，不改接口、不改业务语义；过程中不新增
  `eslint-disable`、不改规则阈值、不按目录豁免。
- CI（`.github/workflows/ci.yml`）在 `pnpm lint` 之外补 `pnpm format:check`，使格式与行长成为执行点。
- 修复两处「配了但不生效」的门禁缺口：
  - `import/no-cycle` 的依赖图只认声明过的扩展名，TS 仓须补 `settings['import/parsers']`；补齐后
    真实检出 router/store 循环，以 `router/navigator.ts` 惰性绑定 router 断环。
  - contracts 的类型产物是 typecheck/test 的解析前提，而 `pnpm install` 不构建 workspace 包；
    CI 将 `pnpm build` 前移，根脚本补 `pretypecheck`/`pretest`。
- 不改产品行为，不新增或修改产品规格（`skip_specs: true`）；无 API、DB migration、依赖语义变更。
  `MenuTree` 契约类型修正为 `MenuNodeWithMeta[]`（仅类型层，对齐后端既有返回）。

## Impact

- 新增 CI 必过检查项 `format:check`；`lint` 的失败面从语法级扩大到结构级。
- 存量源码有较大范围结构改动（拆分生成器模板渲染、测试夹具、web store/router、小程序请求层、e2e
  辅助函数），均为等价重构；生成器产物以夹具前后 dump 逐字节比对证明不变。
- 分支保护 required 的更新暂缓（owner 指示本批不处理）。
- 已接受的边界：ESLint 无 PMD「上帝类」直接等价规则，以 `max-lines 300` 近似；`sonarjs/no-duplicate-string`
  在 recommended 中默认关闭，按「用推荐默认」不另行开启。
