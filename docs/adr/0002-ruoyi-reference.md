# ADR-0002: 将 RuoYi 作为功能与体验基准，而非代码基座

状态：Accepted | 日期：2026-11-07

## 背景

RuoYi 成熟的用户/角色/菜单/字典/参数/日志/定时任务/代码生成等能力非常值得参考；但目标是跨行业通用 TS 平台。

## 决策

- **必须逐项对照 RuoYi 官方能力矩阵**：`docs/requirements/FUNCTION_MATRIX.md`。
- 学习功能边界、常见管理交互、导航组织、权限语义和代码生成的交付体验。
- 采用原创 TS/Node 实现；不复制 RuoYi 源码、SQL、静态图标与品牌资产。
- 无证据不声称某能力“RuoYi 官方已支持”或“新版已取消”，实施前按明确官方分支验证。
- 多租户/组织/定时任务/监控控制台不因 RuoYi 有就默认实现。

## 结果

RuoYi 提供的是覆盖面参照，而不是每一项技术实现约束。产品行为差异要在 OpenSpec 明确记录。

## 参考

https://github.com/yangzongzhuan/RuoYi-Vue
