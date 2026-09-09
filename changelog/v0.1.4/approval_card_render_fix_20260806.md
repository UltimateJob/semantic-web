# 审批卡片渲染修复

- 修复 `interaction.request` 已进入前端 Store，但对话时间线只显示空 Leader 行的问题。
- 交互消息正文为空时仍以审批记录作为渲染条件，完整显示风险、问题、倒计时以及批准/拒绝按钮。
- 新增真实 ChatView 组件树测试，覆盖 interaction 空文本系统行，避免仅测试独立 ApprovalCard 而遗漏 MessageRow 外层门禁。
