# 任务清单：unify-terminal-401-relogin

- [x] 1. web `request.ts`：终局 401 收敛到单一清理出口（刷新失败/重放仍拒统一走
      `onSessionExpired`），终局路径不再叠加错误提示；同步更新 `request.test.ts` 断言
      并新增「并发终局各自触发清理」用例
- [x] 2. miniapp `request.ts`：判定基准从错误码改为 HTTP 401（覆盖 `AUTH_UNAUTHENTICATED`
      被停用/无凭据场景），终局收敛到单一 `clearSession + gotoLogin` 出口
- [x] 3. miniapp 测试基建：vitest + uni 桩（内存 storage / 脚本化 request / 导航与提示记录），
      七组用例（过期重放仍拒、被停用、无凭据、auth 路径豁免、silent、恢复成功、存取）
- [x] 4. 验证：`pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿（单测 42）；
      `pnpm --filter @tiangong/api test:integration` 26/26；`pnpm test:e2e` 5/5
- [x] 5. 文档：DELIVERY_REPORT 已知限制节更新、BUILD_PLAN §7.1 交接事实补充、
      identity-access spec 增补「终局 401 客户端恢复」要求
