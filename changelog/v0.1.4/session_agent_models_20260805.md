# 会话 Agent 模型配置界面

日期：2026-08-05

## 变更

- Agent Store 接入会话模型快照列表和单 Agent 模型覆盖接口。
- Agent 工作台明确区分 Agent Profile 与已有会话：Profile 保存只影响新会话。
- Agent Profile 可以清除固定模型并恢复继承系统 Default；目录卡片和详情页显示继承状态。
- 对话页在创建、选择和删除后切换会话时同步加载对应的多 Agent 模型快照。
- 右侧 Agent 检查器显示每个 Agent 的实际 endpoint、model 和配置来源，并可独立切换当前会话端点。
- 仅模型端点声明支持时允许选择 `low/medium/high`；不支持原档位的跨模型切换显式恢复为 `auto`。
- 有历史消息时切换前提示新模型将在下一轮重新读取同一历史，不创建或展示 ContextEpoch。
- 活动 Run 返回 `SESSION_BUSY` 时保留原配置并提示等待当前模型或工具调用结束。

## 验证

- 会话快照加载、Query 独立覆盖和 `SESSION_BUSY` 错误透传单测通过。
- Agent Default 继承、会话切换同步和 IDE 检查器组件冒烟测试通过。
- `npm test`
- `npm run build`
