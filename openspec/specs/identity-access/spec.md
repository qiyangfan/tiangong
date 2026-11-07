# 用户、角色、菜单及权限 — Implemented baseline specification

> 已实现并通过验收（Stage 2-6，2026-11-07；终局 401 客户端恢复语义 2026-11-07 增补，变更 unify-terminal-401-relogin）：验收证据见 docs/quality/DELIVERY_REPORT.md 与测试套件（单元 + 真库集成 26 例 + 浏览器 e2e 5 例）。

## Purpose

定义身份与访问管理的目标基线：会话认证与登录失败约束、服务端 RBAC 默认拒绝、用户生命周期管理、按权限过滤的菜单导航契约，以及客户端终局 401 恢复语义。

## Requirements

### Requirement: 身份认证

系统 SHALL 对每个受保护 API 校验有效会话，登录失败不得创建会话。

#### Scenario: 身份认证验收

- **GIVEN** 未认证用户
- **WHEN** 请求用户管理接口
- **THEN** 返回 401 且不泄露用户资料。

### Requirement: 客户端终局 401 恢复

web 与 miniapp 请求层 SHALL 以统一不变量处理会话级 401：非 auth 路径
（`/auth/login|refresh|logout` 之外）收到 HTTP 401 时先单飞刷新并重放一次；重放仍 401 或刷新
失败即会话终局，清理本地凭据并引导重登。判定 SHALL 以 HTTP 状态码为基准，不以错误码分支；
auth 路径的 401 SHALL NOT 触发会话清理；silent 模式仅抑制提示，SHALL NOT 豁免会话清理。
终局事件的提示 SHALL 恰好出现一次，且 SHALL 区分「带凭据并完成刷新重放后仍被 401 拒绝」
（停用/删除，码为 `AUTH_ACCOUNT_DISABLED`/`AUTH_UNAUTHENTICATED`）与「无凭据或刷新失败」
（过期/失效）两类文案；web 端无凭据终局不可达，按终局码判定等价，miniapp 端以是否完成刷新
重放为判定信号；refresh 端点 SHALL NOT 泄露账号停用状态（「停用且 access 同时已过期」窗口期
按过期文案提示，重登时得到明确停用提示）。

#### Scenario: 重放终局验收

- **GIVEN** access token 刷新成功但新 token 仍被服务端拒绝（如账号被停用）
- **WHEN** 受保护请求完成一次刷新重放后再次收到 401
- **THEN** 客户端清理本地会话并引导至登录页，提示为「账号已被停用」类文案，同一事件仅出现一次。

#### Scenario: 刷新失效终局验收

- **GIVEN** refresh token 已失效或被吊销
- **WHEN** 受保护请求刷新失败
- **THEN** 客户端清理本地会话并引导至登录页，提示为「登录状态已过期，请重新登录」类文案。

#### Scenario: 无凭据终局不误报停用验收

- **GIVEN** miniapp 本地凭据已被系统清理（存储无 access/refresh token，非账号停用）
- **WHEN** 页面触发受保护请求收到 HTTP 401（`AUTH_UNAUTHENTICATED`）且未发生刷新重放
- **THEN** 客户端清理本地会话并引导至登录页，提示为「登录状态已过期，请重新登录」类文案，SHALL NOT 误报「账号已被停用」。

#### Scenario: 登录失败不清理验收

- **WHEN** 登录接口返回 401（密码错误）
- **THEN** 客户端仅提示失败，不清理本地会话、不跳转。

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
