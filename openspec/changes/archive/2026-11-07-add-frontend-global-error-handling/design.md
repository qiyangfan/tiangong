# 设计：补齐两端前端全局异常处理

## 授权影响

- 无。全局异常处理不触碰鉴权路径：`JwtGuard`/`PermissionsGuard` 后端强制不变；web 路由守卫
  的会话判定（`tryRestore`/`routesAdded`）语义不变，仅为其失败路径补提示与中止。
- 守卫失败路径选择「中止导航（return false）+ 提示」而非「强制跳登录」：菜单接口失败多为
  瞬时网络问题，用户停留原地可重试；会话失效场景已由 request 层终局 401 语义（见
  `unify-terminal-401-relogin`）负责跳转，两条路径职责不重叠。

## 迁移影响

- 无 schema / API 变更。新增文件：web `src/utils/global-error.ts`、miniapp
  `src/utils/global-error.ts`；修改：两端 `main.ts`、web `guard.ts`/`router/index.ts`、
  miniapp `App.vue`/`request.ts`、web locales（`error.unexpected` zh-CN/en 成对）。
- 依赖零新增（web 已有 vitest；miniapp vitest 基建由在途变更建立）。

## 测试影响与分层原则

| 层 | 职责 | 本次内容 |
| --- | --- | --- |
| web 单元（vitest，node 环境） | 纯逻辑契约 | `global-error.ts`：errorHandler / unhandledrejection / error 三入口统一走 report，节流窗口内只弹一条提示（fake timers） |
| miniapp 单元（vitest + uni 桩） | 纯逻辑契约 | `request.test.ts` 增 requestId 透传断言；复用在途变更的 uni 桩模式 |
| 手动走查 | 组件树/平台运行时 | 浏览器 console 触发未捕获异常验证提示；微信开发者工具验证 onError 生效 |

- 不 mount 组件测 errorHandler（web 单测无 DOM 依赖的既定纪律）；`reportError` 设计为可独立
  断言的纯函数（入参 err + source，行为 = console.error + 节流 toast）。
- 断言纪律：锁「提示被弹/被节流、导航被中止、requestId 值」，不断言文案措辞与样式。

## 关键设计

1. **单点收口**：两端各一个 `reportError(err, source)`：`console.error` 原始异常（保留堆栈）
   + 节流弹一次用户提示（web `ElMessage.error(i18n error.unexpected)`；miniapp
   `uni.showToast`，文案常量，变更 `align-miniapp-ui` 落地文案单源时收编进 locales）。
   节流窗口 3s，窗口内丢弃后续提示但全量 console——不吞堆栈、不刷屏。
2. **web 三入口**：`app.config.errorHandler`（Vue 渲染/生命周期/侦听器异常）、window
   `unhandledrejection`（Vue 之外的 Promise 拒绝，含守卫 abort）、window `error`（仅
   `ErrorEvent`，资源加载失败不报）、`router.onError`（导航链路异常）。
3. **guard 失败路径**：`ensureRoutes()` 包 try/catch → `reportError` + `return false` 中止
   本次导航（URL 不变，可手动重试）；`tryRestore` 内部已自捕获（返回 false 走登录页），不动。
4. **miniapp 双入口**：`App.vue` 注册 `onError`（uni 运行时错误，回调参数可能为 string 化
   堆栈）与 `onUnhandledRejection`；`main.ts` 注册 `app.config.errorHandler`。二者统一走
   miniapp `reportError`。
5. **requestId 透传**：miniapp `TgError` 增加 `requestId?: string`，`rawRequest` 从错误
   envelope 透传；与 web `TgError` 字段对齐。

## 运行形态

- 全部纳入既有根门禁（`pnpm lint && pnpm typecheck && pnpm test && pnpm build`）；
  miniapp 测试经其在途 vitest 配置（node 环境）自动被 `pnpm -r run test` 覆盖。
- 真机/微信开发者工具行为为手动验证项，无法自动化处如实标注 NOT VERIFIED。
