# 字典与系统参数 — Implemented baseline specification

> 已实现并通过验收（Stage 2-6，2026-11-07）：验收证据见 docs/quality/DELIVERY_REPORT.md 与测试套件（单元 + 真库集成 26 例）。

## Purpose

定义字典与系统参数管理的目标基线：字典类型/字典项的维护与启用过滤、非机密参数的校验与审计留痕，以及禁止密钥入库的强制约束。

## Requirements

### Requirement: 字典类型与字典项

系统 SHALL 管理字典类型、字典项、排序、状态及只读查询。

#### Scenario: 字典类型与字典项验收

- **GIVEN** 已停用字典项
- **WHEN** 请求启用字典列表
- **THEN** 结果不包含该项。

### Requirement: 非机密系统参数

系统 SHALL 支持带校验的非秘密参数变更，并对写操作记录审计。

#### Scenario: 非机密系统参数验收

- **GIVEN** 管理员修改参数
- **WHEN** 读取参数
- **THEN** 返回新值并留存变更审计。

### Requirement: 禁止密钥入库

系统 MUST NOT 以明文系统参数存放私钥、数据库密码或生产 JWT secret。

#### Scenario: 禁止密钥入库验收

- **GIVEN** 提交已知敏感配置键
- **WHEN** 保存系统参数
- **THEN** 拒绝并提示使用环境变量。
