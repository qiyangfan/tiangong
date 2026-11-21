# ADR-0001: TypeScript 全栈模块化单体

状态：Accepted（作为启动基准，具体版本实施时验证） | 日期：2026-11-07

## 背景

要求跨行业复用的 Web 后台 + 微信小程序 + API 平台，开发者熟悉多技术栈，以 AI 编码辅助、质量和成本平衡为目标。

## 决策

NestJS + Prisma + PostgreSQL 18 + Vue3 Element Plus + uni-app(Vue3) + pnpm workspace。使用单体模块化架构，不使用微服务；API 采用 OpenAPI/共享 DTO。版本以实际兼容测试确定。

## 对照选项

- Java + RuoYi：现成后台能力更完整、首版功能覆盖快，但官方代码/界面系统与 TS 目标不同；若大量系统管理能力都必要，时间优势可能很大。
- Node + NestJS：自建平台基础能力成本较高，但契约、交互和可重用骨架可以独立维护。
- Django/DRF：Admin 很成熟，但已决定交付定制 Vue 前端，Admin 无法直接替代交互界面。

## 后果

需对认证、RBAC、字典、日志、代码生成等负责，不得以 AI 能写 CRUD 就忽略这些固定成本。以可运行的对照样例核验成本目标，而非声称 TypeScript 一定最快。

## 修订：MySQL → PostgreSQL 18（2026-11-20，owner 裁决）

初始选型的 MySQL 8.4 是建仓时的默认值，并非业务约束。owner 明确 portfolio 的统一技术栈为 PostgreSQL；本仓是全栈脚手架，保留 MySQL 只会制造第二套运维/迁移/备份口径。切换评估结论：

- **收益**：与锦官/孔明/虎符统一数据栈；Prisma 抽象完整，业务代码零 raw SQL（仅健康检查 `SELECT 1`）；迁移基线可重建。
- **成本**：重建初始迁移、CI service、compose、测试连接串与文档；本地库需重新建库播种。
- **兼容性**：MySQL 的 `utf8mb4_unicode_ci` 使用户名/邮箱与字典键值大小写不敏感。PostgreSQL 侧 `user.username` / `user.email` 与 `dict_type.dict_key` / `dict_item.dict_key|value` 改用 `citext` 保留唯一性与查询语义（长度仍由 contracts 校验）；`roleKey` / `settingKey` / 权限点 / 生成器模块名等契约本就只允许小写，无需额外处理。列表 keyword 搜索原先依赖 MySQL `LIKE` 的大小写不敏感，现统一显式 `mode: 'insensitive'`。
- **不做**：不保留 MySQL 双后端——脚手架只需一个权威口径；旧 MySQL 基线移入 `apps/api/prisma/migrations-mysql-archive/` 仅作审计。
