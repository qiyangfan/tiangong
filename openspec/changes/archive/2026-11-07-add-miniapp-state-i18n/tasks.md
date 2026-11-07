# 任务清单：add-miniapp-state-i18n

- [x] 1. OpenSpec：本变更 proposal/tasks/spec delta；`align-miniapp-ui` 划界小修
      （任务 6 文案单源移交本变更）
- [x] 2. 依赖：miniapp dependencies 增 pinia、vue-i18n（版本对齐 web 已锁线）；
      `pnpm-lock.yaml` 同步
- [x] 3. locales：`src/locales/{zh-CN.ts,en.ts,index.ts}`（zh-CN 分组收编全部硬编码文案；
      en 以 `typeof zhCN` 锁键结构；模块顶层不碰 uni 全局，保持测试桩后置注入前提）
- [x] 4. stores：`src/stores/app.ts`（locale 持久化/恢复/切换 + 导航标题与 tabBar 同步）、
      `src/stores/auth.ts`（applySession/refreshProfile/logout；存储单源仍为 utils/auth.ts）
- [x] 5. 装配：`main.ts` 接线 createPinia → app store init → use(i18n)（对齐 web 顺序）；
      `vitest.config.ts` 补 `@` 别名
- [x] 6. 页面接入：login/mine/sample 文案走 t()；mine 页语言切换项；request.ts 兜底文案与
      global-error.ts 提示文案收编资源
- [x] 7. 测试：`stores/__tests__/auth.test.ts`（6 例）、`app.test.ts`（6 例，锁行为契约与
      分类枚举，不锁文案措辞）；既有 `request.test.ts` 原样语义通过（文案断言按 owner 纪律
      改为分类枚举 + 次数不变量）
- [x] 8. 验证：根门禁四件套全绿（lint/typecheck/test 67/build）；`build:h5` /
      `build:mp-weixin` 编译通过；真机/微信开发者工具走查 **NOT VERIFIED**（本机无工具，
      如实标注）
- [x] 9. 文档：UI_STYLEGUIDE 文案约束补 miniapp 适用；BUILD_PLAN 依赖/完成度/已知坑；
      ADR-0007 修订（miniapp 单源升级 vue-i18n）；DELIVERY_REPORT 更新
