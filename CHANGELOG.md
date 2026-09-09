# Changelog

## v0.3.0（开发中）

当前开发版本为 0.3.0-dev。新增显式 Plan Mode、Workflow/Task/SubTask 工作台、八类结构化 Interaction、Task SendScope，以及 simulation_map/real_map 隔离的 Semantic Map 2D/3D 工作台。Simulation、Pilot、AbilityFramework 和 Robot 执行不在本版本开放。

## v0.2.0（开发中）

Semantic Web v0.2.0 将现有 Agent 调试界面扩展为以 Project 为根的 Semantic Studio。

当前开发版本为 0.2.0-dev。v0.1.4 未作为正式版本发布，其中已经完成的会话、模型、图片、Artifact、Skill、Tool、审批和 Trace 展示统一纳入 v0.2.0。

### 已完成

- 会话历史、自动命名、删除和 WebSocket 恢复。
- 图片粘贴、拖入、上传门禁和历史预览。
- Agent、Skill、Tool、模型服务与端点配置。
- 工具、SubAgent、Artifact、审批和 Trace 展示。
- Project Hub、单活动 Project 和 Project 内统一 Studio 工作区。
- Dockview Tab、分栏、拖放、应用内浮动、关闭、重置和按 Project 布局恢复。
- Project、Conversation、Run、Interaction 与 Memory 独立状态管理。
- Studio Snapshot 后恢复布局，再建立唯一 Project 事件订阅。
- Run 状态来自 Server，Interaction 等待 Server 结果，Trace 只按明确 ID 打开。
- Conversation、Agent、Skill、Tool、SubAgent、Artifact、Run、Interaction 和 Trace 面板。
- Project Markdown Memory 明确编辑与 revision 冲突保护。
- v0.2 公共 Fixture、Playwright 主路径和发布版本精确校验。

### 当前限制

- Plan、Workflow、Task、Semantic Map、Simulation、Pilot、AbilityFramework 和 Robot Skill 不在 v0.2.0 开放。
- Plan、运行、地图和仿真预设仅显示后续版本说明，不产生业务操作。
