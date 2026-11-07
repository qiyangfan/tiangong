# ADR-0003: 数据库存储模型与公开 API 契约隔离

状态：Accepted | 日期：2026-11-07

## 决策

Prisma schema 是数据库存储模型的事实来源；`packages/contracts` 是 HTTP API DTO/校验的事实来源。转换在服务端显式完成。通过 OpenAPI diff、typecheck、integration tests 防止漂移。

## 原因

DB 模型含敏感字段、内部关联和 Prisma 专用类型；API 包含分页/格式化/权限脱敏，不能直接向 Web/miniapp 共享 Prisma entity。

## 代价

需要维护 mapper 或显式转换，收益是隔离性、可版本化和安全性。
