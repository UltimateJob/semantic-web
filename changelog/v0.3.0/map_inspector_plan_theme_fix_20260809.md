# 地图、Inspector、Plan 与主题可用性修复

## 结果

- Semantic Map 3D 视图支持拖拽旋转、右键平移和滚轮缩放；2D 顶视支持拖拽平移和缩放。
- 区分点击选择与拖动视角，拖动不会误选物品。
- 删除地图面板内重复详情栏；物品或区域的状态、位姿、尺寸、标签、来源、证据和关系
  统一显示在 Studio 右侧 Inspector，且不混入 Workflow 进度。
- Planning 失败时在 Conversation Plan 卡片显示原因和重新规划入口；没有 Task 的失败计划也可重试。
- 当前对话若被其他对话遗留的未结束 Workflow 阻塞，会显示来源对话以及“查看原对话”和
  “放弃旧计划/停止旧 Workflow”入口；Planning 失败的计划也可直接放弃，不再形成无法解除的阻塞。
- “规划”改为 Conversation 消息意图：Leader 可以先只读调查、正常回复和提出结构化问题，
  只有信息充分并提交计划后才出现 Workflow 计划卡；现有草案的反馈也沿用同一对话入口。
- Agent 主模型选择框会显示“继承系统 Default”及当前实际模型，不再显示为空选择。
- Project Hub 保留全局设置页；Project 内设置改为不离开 Studio 的模态编辑器，并提供当前
  Project、模型服务和外观分组。
- 浅色和深色主题显式覆盖 Dockview 活动、未活动分组及选中、未选中 Tab 的文字颜色。

## 验证

- Vitest 覆盖失败计划重新规划、放弃旧计划、跨 Conversation Workflow 冲突与现有 Map 状态语义。
- Playwright 覆盖规划多轮澄清后创建 Workflow、继承 Default 模型显示、Project 内设置不跳转、
  新对话结束旧 Workflow、地图人工标注、全局 Inspector 分流、视角操作提示以及浅色/深色多 Tab 可读性。
- 生产构建验证 Three.js 与 OrbitControls 按地图面板懒加载。
