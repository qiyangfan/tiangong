/** 架构分层规则（ArchUnit 对应物）。路径均相对仓库根。 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: '静态初始化与动态 import 环一律不允许（dependency-cruiser 两种情况都计入）',
      from: {},
      to: { circular: true },
    },
    {
      name: 'api-platform-no-upward',
      severity: 'error',
      comment: 'common/security/prisma 是底层，不得反向依赖业务模块或应用入口',
      from: { path: '^apps/api/src/(common|security|prisma)/' },
      to: { path: '^apps/api/src/(modules/|main\\.ts$|app\\.module\\.ts$)' },
    },
    {
      name: 'api-module-no-app-entry',
      severity: 'error',
      comment: '业务模块不得依赖应用入口（避免循环初始化）',
      from: { path: '^apps/api/src/modules/' },
      to: { path: '^apps/api/src/(main\\.ts$|app\\.module\\.ts$)' },
    },
    {
      name: 'api-controller-no-direct-prisma',
      severity: 'error',
      comment: '控制器只做参数/编排，数据访问必须经 service 层',
      from: { path: '^apps/api/src/modules/.+\\.controller\\.ts$' },
      to: { path: '^(apps/api/src/prisma/|node_modules/@prisma/client/)' },
    },
    {
      name: 'web-api-no-upward',
      severity: 'error',
      comment: 'api 请求层不得依赖视图/组件/路由/状态层',
      from: { path: '^apps/web/src/api/' },
      to: { path: '^apps/web/src/(views|components|router|stores)/' },
    },
    {
      name: 'web-utils-no-upward',
      severity: 'error',
      comment: '工具层保持无业务依赖，可被任意层复用',
      from: { path: '^apps/web/src/utils/' },
      to: { path: '^apps/web/src/(api|views|components|router|stores)/' },
    },
    {
      name: 'miniapp-pages-isolated',
      severity: 'error',
      comment: '页面之间不互相 import，共享逻辑下沉到 stores/utils',
      from: { path: '^apps/miniapp/src/pages/([^/]+)/' },
      to: {
        path: '^apps/miniapp/src/pages/([^/]+)/',
        pathNot: '^apps/miniapp/src/pages/$1/',
      },
    },
    {
      name: 'e2e-src-no-tests',
      severity: 'error',
      from: { path: '^apps/e2e/src/' },
      to: { path: '^apps/e2e/tests/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: 'node_modules|/dist/|/coverage/|uni_modules|unpackage|playwright-report|test-results',
    },
    tsPreCompilationDeps: true,
  },
};
