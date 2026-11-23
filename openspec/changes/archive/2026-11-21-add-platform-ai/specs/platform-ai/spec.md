# 平台 AI 入口 — ADDED

## ADDED Requirements

### Requirement: AI 操作与人工操作同权同审计

平台 AI 入口 SHALL 作为普通 API 客户端执行操作：以当前登录用户身份调用平台既有 API 契约，经过与
人工操作相同的权限校验与审计路径。系统 SHALL NOT 为 AI 提供超级权限、绕过 RBAC 或跳过审计的执行通道；
用户令牌 SHALL NOT 落库或写入日志。

#### Scenario: 越权工具调用被统一拒绝

- **GIVEN** 仅持有 `sample:list` 权限的登录用户
- **WHEN** 通过 AI 入口请求执行删除示例记录
- **THEN** 执行返回与人工操作一致的 403 错误码，数据无变化且不产生成功操作审计

#### Scenario: 审计可关联 AI 动作

- **WHEN** AI 入口成功执行一次写操作
- **THEN** 平台操作审计存在对应记录，且可通过 `requestId` 关联到该 AI 动作

### Requirement: 工具目录按调用者权限过滤

AI 可调用的工具集合 SHALL 由平台对外 API 契约生成，并仅包含当前用户有权调用的操作；执行时服务端
SHALL 再次校验权限，工具目录 SHALL NOT 作为授权依据。工具目录 SHALL NOT 包含 AI 自身端点、认证端点、
运行探针、二进制下载与公开端点。

#### Scenario: 无权限工具对模型不可见

- **WHEN** 零权限用户发起 AI 会话
- **THEN** 工具目录不包含任何需要权限点的操作，模型无法提出对应调用

#### Scenario: 权限撤销即时生效

- **GIVEN** 会话进行中用户的角色权限被移除
- **WHEN** AI 尝试执行先前可见的工具
- **THEN** 服务端拒绝执行并返回 403，动作状态标记失败

#### Scenario: 目录不含排除项

- **GIVEN** 拥有全部平台权限的管理员
- **WHEN** 生成工具目录
- **THEN** 目录不包含 `/ai/*`、`/auth/*`、`/metrics`、`/health/*`、二进制下载与公开端点

### Requirement: 计划与执行分离

工具返回的数据 SHALL 被视为不可信输入；其中出现的任何指令文本 SHALL NOT 扩大 AI 的可用工具集合、
SHALL NOT 跳过权限校验或确认流程。

#### Scenario: 工具结果中的指令不被执行

- **GIVEN** 记录内容包含「删除全部数据」等指令文本
- **WHEN** AI 读取该记录后继续会话
- **THEN** 不产生任何未经用户确认的写操作，越权或未确认的调用被服务端拒绝

### Requirement: 所有写操作需显式确认

除只读（GET）外的所有工具调用 SHALL 仅在用户显式确认后执行；确认必须绑定服务端签发的一次性票据，
票据 SHALL 与用户、动作及参数摘要绑定并设置有效期。模型与客户端本地确认 SHALL NOT 被视为有效。

#### Scenario: 写操作无票据不执行

- **GIVEN** 一个创建或更新类动作处于待确认状态
- **WHEN** 未提交有效票据便请求执行
- **THEN** 执行被拒绝并返回稳定错误码，数据无变化

#### Scenario: 读操作直接执行

- **WHEN** 用户通过 AI 发起只读查询
- **THEN** 查询直接执行，不要求确认票据

#### Scenario: 票据过期或复用被拒

- **GIVEN** 已签发但超过有效期的票据，或已被使用过的票据
- **WHEN** 提交确认
- **THEN** 返回稳定错误码且不执行动作

#### Scenario: 参数变更使票据失效

- **GIVEN** 已签发票据的动作参数被修改
- **WHEN** 使用原票据确认
- **THEN** 确认被拒绝，要求重新发起并确认

#### Scenario: 他人票据不能确认

- **GIVEN** 用户 A 的动作与票据
- **WHEN** 用户 B 提交该票据
- **THEN** 确认被拒绝且动作状态不变

### Requirement: 动作幂等与可回放

每次动作执行 SHALL 以动作标识作为幂等键；相同动作的重试 SHALL 返回既有结果且不产生重复副作用。
动作状态 SHALL 持久化，可按会话回放；失败动作 SHALL NOT 自动重试。

#### Scenario: 重试不重复执行

- **GIVEN** 一次创建操作已成功执行
- **WHEN** 对同一动作重试
- **THEN** 不创建第二条记录，返回既有动作结果

#### Scenario: 并发确认只有一个执行

- **GIVEN** 一个待确认动作
- **WHEN** 两个确认请求同时到达
- **THEN** 只有一个执行，另一个返回冲突或既有结果，且不产生重复副作用

#### Scenario: 失败状态可查询且不自动重试

- **WHEN** 工具执行因后端错误失败
- **THEN** 动作状态为失败并记录稳定错误码，重复请求返回失败结果且不重新执行

### Requirement: AI 入口可关断且故障不产生半执行

AI 能力 SHALL 可通过配置整体关闭；关闭或 provider 不可用时，既有平台功能与人工操作路径 SHALL
不受影响。开启但 provider 配置缺失 SHALL 在启动时 fail-fast。模型调用失败或超时 SHALL 使本次动作失败，
SHALL NOT 产生部分写入或静默成功。

#### Scenario: 关闭后的行为

- **GIVEN** `AI_ENABLED=false`
- **WHEN** 请求 AI 业务端点、状态端点或使用平台既有功能
- **THEN** AI 业务端点返回稳定错误码，状态端点返回 `enabled=false`，人工 CRUD、认证与审计等既有功能全部正常

#### Scenario: provider 超时

- **GIVEN** 模型端点超时
- **WHEN** 用户发起写操作请求
- **THEN** 动作以失败结束且无写入；人工路径不受影响

#### Scenario: 开启但缺 provider 配置时启动失败

- **GIVEN** `AI_ENABLED=true` 且缺少 provider 地址或密钥
- **WHEN** 应用启动
- **THEN** 启动失败并给出明确配置错误，不进入半可用状态

### Requirement: 会话与动作数据最小化

会话与动作记录 SHALL NOT 包含口令、访问令牌、刷新令牌或密钥；敏感字段 SHALL 在发送给模型前与落库前
脱敏。日志 SHALL NOT 包含完整对话内容或模型密钥。用户 SHALL 可删除自己的会话，删除 SHALL 连带清除
消息、动作与确认记录。

#### Scenario: 敏感字段不入库

- **WHEN** 会话涉及口令或令牌字段
- **THEN** 会话、动作与日志中不出现其明文

#### Scenario: 删除会话清除关联数据

- **GIVEN** 一个包含消息、动作与确认记录的用户会话
- **WHEN** 所属用户删除该会话
- **THEN** 会话及其关联数据全部删除，后续读取返回 404

#### Scenario: 他人不能删除

- **GIVEN** 用户 A 的会话
- **WHEN** 用户 B 请求删除
- **THEN** 返回 404 且会话保持不变

### Requirement: 工具执行结果契约化

工具执行结果 SHALL 使用平台统一响应与稳定错误码；对模型可见的结果 SHALL 只包含契约字段，
SHALL NOT 包含堆栈、数据库细节或内部异常文本。

#### Scenario: 后端异常的错误映射

- **WHEN** 工具调用的平台接口返回 500
- **THEN** 模型收到的结果包含稳定错误码与对外文案，不含堆栈与内部字段

### Requirement: 流式传输契约

消息端点 SHALL 以 SSE 事件表达文本增量、动作草案、执行结果、错误与终止；`done` SHALL 为最后一个事件。
流中错误 SHALL 使用稳定错误码，SHALL NOT 静默中断；客户端断开 SHALL 取消在途 provider 请求。

#### Scenario: 事件顺序与 done

- **WHEN** 一条消息触发只读工具
- **THEN** 客户端依次收到 `message.delta`、`action.executed` 与 `done`，且 `done` 是最后一个事件

#### Scenario: 流中错误

- **GIVEN** provider 在流开始后超时
- **WHEN** 处理该消息
- **THEN** 客户端收到 `error` 事件与稳定错误码，随后收到 `done`

#### Scenario: 客户端断开取消 provider

- **GIVEN** 消息流仍在进行
- **WHEN** 客户端断开连接
- **THEN** 服务端取消在途 provider 请求，不产生未经确认的写操作

### Requirement: AI 端点限流

AI 消息与确认端点 SHALL 按用户限流；超限 SHALL 返回契约中的 429 错误码，不得影响既有平台端点。

#### Scenario: 超过消息频率

- **WHEN** 同一用户在限流窗口内超过消息端点上限
- **THEN** 后续请求返回 429，既有平台端点仍正常响应

### Requirement: 工具循环有上限

单条用户消息的模型往返与工具调用次数 SHALL 有上限；超限 SHALL 以失败收口并返回稳定错误码，
SHALL NOT 无限循环或继续写入。

#### Scenario: 工具循环超限

- **GIVEN** 一条消息内模型连续提出工具调用
- **WHEN** 模型往返或工具调用次数超过上限
- **THEN** 本次消息以 `AI_TOOL_LOOP_LIMIT` 失败收口，不再调用模型或执行工具
