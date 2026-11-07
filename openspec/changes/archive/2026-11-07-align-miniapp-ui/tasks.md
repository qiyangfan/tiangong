# 任务清单：align-miniapp-ui

- [ ] 1. 依赖：web / miniapp `dependencies` 增 dayjs；miniapp `devDependencies` 增
      unocss、unocss-applet；`pnpm-lock.yaml` 同步
- [ ] 2. web `utils/datetime.ts` 换 dayjs 实现（导出契约不变，`formatCost` 保持纯 JS）；
      既有测试原样通过
- [ ] 3. miniapp `src/utils/datetime.ts`（同签名 dayjs 实现）+ `datetime.test.ts`；
      三页删除本地 `formatDate` 接入单源（修时区 bug）
- [ ] 4. UnoCSS：`uno.config.ts`（tgTokens 常量 + theme + 字号/圆角阶梯）+
      `vite.config.mts` 挂插件（presetApplet + presetRemRpx + transformerApplet）
- [ ] 5. 三页样式 utility 化：login / sample / mine（卡片、按钮、弹层、tag、间距、字号
      全部走 token；scoped style 退到遮罩等必要场景）；`uni.scss` 瘦身为同值映射；
      `pages.json` 色值对齐（页面底 `#f2f3f5`）
- [ ] 6. ~~文案单源~~：移交 `add-miniapp-state-i18n`（owner 决策 2026-11-07 改走 vue-i18n
      双语资源，随 pinia 状态基线一并落地）
- [ ] 7. 验证：根门禁全绿；`build:h5` / `build:mp-weixin` 编译通过；微信开发者工具走查
      标注（真机 NOT VERIFIED 如实声明）
- [ ] 8. 文档：UI_STYLEGUIDE 增补「miniapp 参照执行」章节（token 事实源、字号映射、
      pages.json 同步纪律、图标与暗色策略）；DELIVERY_REPORT 交接节重写
