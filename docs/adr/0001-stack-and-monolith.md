# ADR-0001: TypeScript 全栈模块化单体

状态：Accepted（作为启动基准，具体版本实施时验证） | 日期：2026-11-07

## 背景

要求跨行业复用的 Web 后台 + 微信小程序 + API 平台，开发者熟悉多技术栈，以 AI 编码辅助、质量和成本平衡为目标。

## 决策

NestJS + Prisma + MySQL 8.4 LTS + Vue3 Element Plus + uni-app(Vue3) + pnpm workspace。使用单体模块化架构，不使用微服务；API 采用 OpenAPI/共享 DTO。版本以实际兼容测试确定。

## 对照选项

- Java + RuoYi：现成后台能力更完整、首版功能覆盖快，但官方代码/界面系统与 TS 目标不同；若大量系统管理能力都必要，时间优势可能很大。
- Node + NestJS：自建平台基础能力成本较高，但契约、交互和可重用骨架可以独立维护。
- Django/DRF：Admin 很成熟，但已决定交付定制 Vue 前端，Admin 无法直接替代交互界面。

## 后果

需对认证、RBAC、字典、日志、代码生成等负责，不得以 AI 能写 CRUD 就忽略这些固定成本。以可运行的对照样例核验成本目标，而非声称 TypeScript 一定最快。
