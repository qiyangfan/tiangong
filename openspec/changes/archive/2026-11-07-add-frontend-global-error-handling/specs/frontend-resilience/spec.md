# 前端异常韧性 — ADDED

## ADDED Requirements

### Requirement: web 全局异常兜底

web 端 SHALL 注册 Vue `app.config.errorHandler`、window `unhandledrejection` 与 `error`
（仅 ErrorEvent）全局监听：任何未捕获异常 SHALL 输出原始堆栈到控制台，并向用户弹出一次性
通用错误提示；短时间内连续异常 SHALL 节流为一条提示，不刷屏。

#### Scenario: 组件异常不白屏

- **GIVEN** 已登录用户在任意页面
- **WHEN** 组件渲染或事件回调抛出未捕获异常
- **THEN** 用户收到一条通用错误提示，页面仍可继续操作，控制台保留原始堆栈。

#### Scenario: 异常风暴节流

- **WHEN** 3 秒窗口内连续发生多次未捕获异常
- **THEN** 用户仅收到一条提示，控制台记录全部异常。

### Requirement: web 动态路由构建失败兜底

路由守卫的动态路由构建（菜单接口）失败时 SHALL 中止本次导航、经全局异常通道提示用户，
并保持当前 URL 不变以便重试；同时 SHALL 注册 `router.onError` 收口导航链路异常。

#### Scenario: 菜单接口瞬时失败

- **GIVEN** 已恢复会话的用户整页刷新进入受保护路由
- **WHEN** 菜单接口请求失败
- **THEN** 导航被中止并出现错误提示，不产生 unhandled rejection，重试后正常进入。

### Requirement: miniapp 全局异常兜底

miniapp 端 SHALL 在 `App.vue` 注册 uni-app `onError` 与 `onUnhandledRejection`，并在
`main.ts` 注册 `app.config.errorHandler`：异常统一进入 `reportError`（控制台原始输出 +
节流 toast），生产环境错误不再完全静默。

#### Scenario: 小程序未捕获异常

- **WHEN** 小程序运行时发生 JS 错误或未捕获的 Promise 拒绝
- **THEN** 控制台保留原始错误，用户收到节流后的通用提示。

### Requirement: miniapp 错误链路 requestId 透传

miniapp 请求层的业务错误对象 SHALL 携带服务端错误 envelope 中的 `requestId`，与 web 端
`TgError` 字段对齐，支持用户报障时对齐服务端日志与审计记录。

#### Scenario: 业务错误携带 requestId

- **GIVEN** 服务端返回含 `requestId` 的错误 envelope
- **WHEN** miniapp 请求层抛出 `TgError`
- **THEN** `err.requestId` 与 envelope 中的值一致。
