# 操作日志与登录日志 — Target baseline specification

> TARGET / 尚待实现；验收后归档为已实现规范。

## Purpose

定义通用后台脚手架中操作日志与登录日志的目标基线：哪些管理操作与登录事件必须留痕、记录哪些字段、非授权检索如何拒绝，以及日志的留存与清理策略，为审计能力验收提供依据。

## Requirements

### Requirement: 操作审计

系统 SHALL 对关键系统管理写操作记录操作者、动作、资源、结果、时间和请求ID。

#### Scenario: 操作审计验收

- **GIVEN** 管理员修改角色权限
- **WHEN** 操作完成
- **THEN** 可按操作人查询对应审计记录。

### Requirement: 登录审计

系统 SHALL 记录登录成功与失败且不记录密码或完整 token。

#### Scenario: 登录审计验收

- **GIVEN** 密码错误
- **WHEN** 登录
- **THEN** 失败被记录且日志不包含输入密码。

### Requirement: 检索与留存

系统 SHALL 支持管理员检索日志并定义留存及清理策略。

#### Scenario: 检索与留存验收

- **GIVEN** 非授权用户
- **WHEN** 请求审计列表
- **THEN** 返回 403。
