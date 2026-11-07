# 代码生成器与示范模块 — Target baseline specification

> TARGET / 尚待实现；验收后归档为已实现规范。

## Purpose

定义代码生成器与示范纵向闭环的目标基线：模板化确定性生成 CRUD 全套产物、对手工修改文件的防覆盖保护，以及 SampleRecord 示范模块的跨端读写一致性要求。

## Requirements

### Requirement: 确定性生成

系统 SHALL 根据版本化模板和输入模型生成完整的 CRUD 代码与迁移/测试骨架。

#### Scenario: 确定性生成验收

- **GIVEN** 合法模型描述
- **WHEN** 执行生成
- **THEN** 可得到 API、DTO、Web 表单与列表、迁移和测试文件。

### Requirement: 防止覆盖

生成器 MUST NOT 静默覆盖已存在手工修改的文件，应提供预览/diff 或显式覆盖选项。

#### Scenario: 防止覆盖验收

- **GIVEN** 文件已有修改
- **WHEN** 再次生成
- **THEN** 默认保留原文件并报告冲突。

### Requirement: 示范纵向闭环

系统 SHALL 包含通用示例实体 SampleRecord，完整实现 Web CRUD、小程序查询/更新、DB 持久化。

#### Scenario: 示范纵向闭环验收

- **GIVEN** Web 新增 SampleRecord
- **WHEN** 小程序查询
- **THEN** 返回同一条数据库记录。
