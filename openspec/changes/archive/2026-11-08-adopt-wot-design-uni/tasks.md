# 任务清单：adopt-wot-design-uni

- [x] 1. 依赖接入：wot-design-uni 1.14.0 官方 tarball 内联
      `apps/miniapp/src/uni_modules/wot-design-uni/`（版本自记录）；miniapp
      devDependencies 增 `sass@1.78.0`（精确锁版）；`pnpm-lock.yaml` 同步
- [x] 2. typecheck 隔离：tsconfig `exclude: ["src/uni_modules"]` + locale
      类型垫片 `src/shims/wot-locale.ts`（paths 指向，.ts 形态）+ 深路径
      type-only 导入约定写入垫片注释
- [x] 3. 主题桥接：`src/theme.ts` 导出 `wotThemeVars`（ConfigProviderThemeVars，
      派生自 tgTokens，零裸 hex；另含 `inputInnerHeightNoBorder` 控件档）；
      三页根节点包裹 `wd-config-provider`
- [x] 4. login 页替换：`wd-input` ×2（密码 `show-password`）+ `wd-button`
      （block/loading/disabled）；`Locale.use('en-US', enUS)` 注册 + 随
      `appStore.locale` 切换接线（装配期 main.ts watch）
- [x] 5. sample 页替换：弹层换 `wd-popup`；表单 `wd-input` ×2 + `wd-switch`；
      四按钮换 `wd-button`（删除 danger、保存 loading）；列表卡片与空态保留工具类
- [x] 6. mine 页替换：资料行 `wd-cell-group` + `wd-cell` ×4（语言切换行保留
      点击）；退出登录 `wd-button`（loading）
- [x] 7. 验证：根门禁全绿（lint/typecheck/test/build）；`build:h5` /
      `build:mp-weixin` 编译通过；既有 70 单测原样通过
- [x] 8. 走查：DevTools automator 三页走查 + 截图对照 PoC 前基线
      （before/after）；`console.error` 为 0；真机预览 NOT VERIFIED 如实标注。
      实施记录：IDE 自动化桥对 virtualHost 上提树无 tag 查询/打字/可靠几何
      （见 BUILD_PLAN §7.1 已知坑 14），mp 侧交付渲染截图 + console=0，
      登录打字/弹层/语言/登出全交互环由 H5 playwright 驱动同一套组件补验
      （真 3000 api，console=0）
- [x] 9. 文档：UI_STYLEGUIDE miniapp 节增补（组件选用清单、theme-vars 桥接
      纪律、内联更新流程）；BUILD_PLAN §7.1 已知坑 + §8 交接节重写；
      DELIVERY_REPORT 验证记录
- [x] 10. （owner 走查反馈轮，超出原范围如实补记）tabBar 图标：EP 同源字形
      栅格 PNG（`scripts/gen-tab-icons.mjs` 可复现，色值与 token 同值）+
      pages.json iconPath；登录/弹层输入框 46px 控件档统一（内层定高 24px
      经 `inputInnerHeightNoBorder` 桥接拉齐，文字垂直居中）
- [x] 11. （owner 问询裁决记录）「v1 冻结 ≠ 断更」证据链与 uview-plus/nutui
      对比数据补入 ADR-0008 维护性证据节，决策维持不变
