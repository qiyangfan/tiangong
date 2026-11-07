# 文件与附件 — Target baseline specification

> TARGET / 尚待实现；验收后归档为已实现规范。

## Requirement: 受控上传

系统 SHALL 对附件进行大小、类型、扩展名与内容一致性检查，生成非用户控制的存储键。

### Scenario: 受控上传验收

- **GIVEN** 带路径遍历文件名的上传
- **WHEN** 提交
- **THEN** 不允许写入目标存储目录之外。

## Requirement: 授权下载

系统 SHALL 对受控文件下载执行服务端权限校验。

### Scenario: 授权下载验收

- **GIVEN** 无读取权限账户
- **WHEN** 请求私有附件
- **THEN** 返回 403。

## Requirement: 存储边界

系统 SHALL 将文件元数据与物理存储分离，首版仅需本地存储适配。

### Scenario: 存储边界验收

- **GIVEN** 成功上传
- **WHEN** 查询文件元数据
- **THEN** 有生成ID、类型、大小和所有者。
