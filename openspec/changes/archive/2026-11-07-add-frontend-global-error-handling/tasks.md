# 任务清单：add-frontend-global-error-handling

- [ ] 1. web `src/utils/global-error.ts`：`reportError`（console.error + 3s 节流提示）+
      `setupGlobalErrorHandlers(app)`（errorHandler / unhandledrejection / ErrorEvent error）；
      `main.ts` 接线
- [ ] 2. web 路由兜底：`router/index.ts` 注册 `router.onError`；`guard.ts` 的
      `ensureRoutes()` 包 try/catch（report + return false）
- [ ] 3. web i18n：zh-CN / en 增 `error.unexpected` 键（成对）
- [ ] 4. web 单测：`src/utils/__tests__/global-error.test.ts`（三入口走 report、节流窗口
      只弹一条、ErrorEvent 过滤资源错误；fake timers）
- [ ] 5. miniapp `src/utils/global-error.ts` + `App.vue` 注册 `onError` /
      `onUnhandledRejection`（移除脚手架 console.log）+ `main.ts` errorHandler
- [ ] 6. miniapp `request.ts`：`TgError` 增 `requestId`，`rawRequest` 透传 envelope 字段；
      `__tests__/request.test.ts` 增 requestId 断言（不破坏既有用例）
- [ ] 7. 验证：`pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿（含在途变更
      `unify-terminal-401-relogin` 的待验证任务一并核销）；浏览器与微信开发者工具手动走查，
      无法自动化的项如实标注
- [ ] 8. 文档：DELIVERY_REPORT 交接节同步；本变更验收后按 OpenSpec 流程归档
