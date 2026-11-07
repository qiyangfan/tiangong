# OpenSpec 使用说明

本目录附带的是**基线能力 specs 草案**，供真实仓库初始化后使用。请先按官方文档运行 `openspec init`（根据官方当前 CLI 版本选择实际命令）；OpenSpec 的 Agent skills / 命令是 CLI 生成，不可手工声称已安装。

- `openspec/specs/<capability>/spec.md`：当前系统的已验收行为。**初始文件属于 target specification，实施前不能声称已实现。**
- `openspec/changes/<change>/proposal.md`：为什么变
- `openspec/changes/<change>/design.md`：怎么变
- `openspec/changes/<change>/tasks.md`：执行清单
- `openspec/changes/<change>/specs/`：ADDED/MODIFIED/REMOVED 规范差量

建议：先按 M0-M4 创建 baseline implementation change，逐步交付；各模块验证后再把目标规范正式转为当前 truth。流程参见 https://github.com/Fission-AI/OpenSpec 。
