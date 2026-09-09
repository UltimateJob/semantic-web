# 未发布开发成果并入 v0.2.0（Web）

v0.1.4 没有形成正式 Release。以下已经完成并通过既有测试的内容继续作为 Semantic Studio v0.2.0 的开发基础；详细开发记录仍保留在 `changelog/v0.1.4/`。

## Conversation 与 Agent

- Conversation 支持历史恢复、自动命名、删除、流式消息和运行中停止或纠正。
- Agent 页面支持 Profile 模型配置；Conversation 内可以查看并调整各 Agent 的实际模型快照。
- 子 Agent 消息、活动和推理内容保持真实归属，不再把 `<think>` 内容显示为最终回答。
- 图片支持粘贴、拖入、上传、历史恢复和视觉 SubAgent 传递。

## Tool、Skill 与运行设置

- Tool 和 Skill 提供搜索、详情与当前 Conversation 有效范围视图。
- Skill 可以浏览 `scripts/`、`references/` 和 `assets/` 的实际资源，并按需预览文本。
- Conversation 运行检查器支持 `ask/auto/full` 和宿主执行开关；机器人运行确认将在 v0.2.0 使用独立界面。
- Approval 卡片修复了空文本系统行不渲染的问题，现有实现将作为统一结构化交互的 confirm 渲染器继续使用。

## Artifact 与 Trace

- Artifact 使用独立 Store，支持 Project 工作区登记、列表、预览、读取和删除。
- 图片使用按需 Blob URL，并在切换和卸载时释放。
- 实时与历史消息保存精确 Trace ID，可以从消息直接下钻，不依赖时间猜测。

## v0.2.0 中继续建设

- 建立 Project Hub 与统一可停靠 Studio 工作区。
- 增加 Plan Mode、Workflow、Task、SubTask 和结构化交互。
- 增加仿真 Robot Skill Stage/Action/Observation 时间线、停止和恢复。
- 页面状态改为读取 Server 保存的 Run、Task 和 Robot Execution，不再用发送或流式标志推断任务状态。
