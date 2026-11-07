# 变更提案：补齐两端前端全局异常处理（add-frontend-global-error-handling）

## 为什么变

1. **web 无全局兜底**：`apps/web/src/main.ts` 未注册 `app.config.errorHandler`，也无 window
   `error` / `unhandledrejection` 监听。组件渲染、生命周期、事件回调中的未捕获异常只进控制台，
   用户面对白屏或残缺 UI 无任何提示；生产环境问题完全不可感知。
2. **动态路由构建无失败路径**：`router/guard.ts` 的 `await auth.ensureRoutes()`（内部
   `apiGetMenus()`）无 try/catch，菜单接口网络抖动/5xx 时导航中止 + unhandled rejection，
   用户卡在空白页，且未注册 `router.onError` 兜底。
3. **miniapp 无全局兜底**：`apps/miniapp/src/App.vue` 仅剩脚手架 `console.log("App Launch")`
   残留，uni-app 的 `onError` / `onUnhandledRejection` 全局钩子与 `app.config.errorHandler`
   均未注册。小程序生产环境 JS 错误完全静默。
4. **排障链路缺口**：web `TgError` 携带服务端 `requestId`，miniapp `TgError` 丢弃该字段——
   用户报障时无法将小程序错误对齐到服务端日志与审计记录。

> 与在途变更 `unify-terminal-401-relogin` 无重叠：会话死亡语义已由该变更统一（HTTP 401
> 终局 → 清理回登录），本变更只处理「非会话类异常的全局兜底」与 `requestId` 透传。

## 范围与定级

- web 全局异常兜底（errorHandler / window 监听 / router.onError / guard 失败路径）：**P0 可靠性**。
- miniapp 全局异常兜底（onError / onUnhandledRejection / errorHandler）：**P0 可靠性**。
- miniapp `TgError.requestId` 透传：**P1 排障**。
- 全局错误提示节流（防异常风暴刷屏）与用户文案：**P1 体验**。
- 明确不做：错误上报到外部平台（Sentry 等）——脚手架阶段仅 console + 用户提示，
  `reportError` 单点收口即为后续接入预留。

## 契约与安全影响

- **不改任何对外契约**：无 API、DTO、DB schema 变更；纯客户端行为。
- **错误信息不得泄露内部细节**：全局提示一律 i18n 通用文案（`error.unexpected`），原始异常只进
  console，不含令牌/敏感个人信息。
- **web 新增 i18n 键** `error.unexpected`（zh-CN / en 成对），属前端资源，不影响 API 契约。

## 验收标准

- 组件内未捕获异常 / 未捕获 Promise 拒绝 / `ensureRoutes` 失败三类场景，用户均收到一次性
  全局提示且应用不中断（可继续操作），控制台保留原始堆栈。
- 提示节流：短时间内连续异常只弹一条提示。
- miniapp 业务错误对象的 `requestId` 与服务端 envelope 一致。
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；web 与 miniapp 单测纳入根门禁。
