# 用户、角色、菜单及权限 — Target baseline specification

> TARGET / 尚待实现；验收后归档为已实现规范。

## Purpose

定义身份与访问管理的目标基线：会话认证与登录失败约束、服务端 RBAC 默认拒绝、用户生命周期管理，以及按权限过滤的菜单导航契约。

## Requirements

### Requirement: 身份认证

系统 SHALL 对每个受保护 API 校验有效会话，登录失败不得创建会话。

#### Scenario: 身份认证验收

- **GIVEN** 未认证用户
- **WHEN** 请求用户管理接口
- **THEN** 返回 401 且不泄露用户资料。

### Requirement: RBAC 默认拒绝

系统 SHALL 基于资源操作权限在服务端做授权判断，菜单显示状态不能代替 API 权限。

#### Scenario: RBAC 默认拒绝验收

- **GIVEN** 无 users:write 权限的已登录账户
- **WHEN** 直接调用写接口
- **THEN** 返回 403 且数据库不变。

### Requirement: 用户生命周期

系统 SHALL 支持用户创建、查询、启停与重置密码且验证唯一登录名。

#### Scenario: 用户生命周期验收

- **GIVEN** 已禁用用户
- **WHEN** 使用有效旧会话请求 API
- **THEN** 访问被拒绝。

### Requirement: 菜单导航

系统 SHALL 向客户端提供授权后的菜单树及按钮权限标识，菜单排序和层级校验。

#### Scenario: 菜单导航验收

- **GIVEN** 权限受限角色
- **WHEN** 获取菜单
- **THEN** 不返回其无权访问的管理入口。
