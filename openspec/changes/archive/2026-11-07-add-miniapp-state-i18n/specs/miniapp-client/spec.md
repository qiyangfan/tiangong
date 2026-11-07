# miniapp 客户端基线 — ADDED

## ADDED Requirements

### Requirement: 状态管理基线

miniapp 端 SHALL 引入 pinia 并以 store 管理跨页共享状态（会话身份、全局偏好）；会话凭据的
本地存储读写 SHALL 收敛单源（utils/auth.ts）；终局 401 恢复语义（identity-access spec）
MUST NOT 因状态层引入而改变。

#### Scenario: 会话状态经 store 流转

- **GIVEN** 合法账号
- **WHEN** 在登录页登录、在「我的」页读取身份并退出登录
- **THEN** 会话身份经 auth store 写入/读取/清理，本地凭据存储同步一致，登出后回登录页。

### Requirement: 文案资源单源与语言偏好

miniapp 端用户可见文案 SHALL 收敛于 vue-i18n 资源（zh-CN 默认 + en），键结构以类型约束
一致；导航栏标题与 tabBar 文案 SHALL 随当前语言运行时同步（pages.json 编译期文案仅作
首帧默认）；语言选择 SHALL 持久化并在启动时恢复，非法持久化值 MUST 回落 zh-CN。

#### Scenario: 语言切换全端生效

- **GIVEN** 用户在「我的」页切换语言
- **WHEN** 浏览任一页面并重启应用
- **THEN** 页面文案、导航标题与 tabBar 文案均为目标语言且重启后保持；持久化值被篡改为
  非法值时启动回落 zh-CN。
