# 会话 Agent 有效工具展示

- 工具目录新增“当前会话”和“全局已安装”两种视图，默认优先展示当前会话 Leader 的真实有效工具。
- 当前会话视图支持切换 Agent，并展示 `ask_query`、`skill`、Project 文件工具及 ToolSearch 等运行时注入能力。
- 工具详情增加模型侧名称与交付方式，区分直接注入、ToolSearch、Eino Middleware 和 Eino AgentTool。
- 全局目录增加明确说明：工具已安装不等于当前 Agent 已启用；`execute_host` 只有满足 Server 与会话权限后才会进入有效工具集。
- 增加数据层和组件回归测试，覆盖 `execute_host` 未授权时不出现在当前有效工具中的场景。
