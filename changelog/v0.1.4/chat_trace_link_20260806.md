# 对话消息 Trace 精确下钻

- 对话数据层保留 REST 历史消息的 `trace_id`，并接收实时 `message.done.trace_id`。
- “追踪”按钮优先直接进入该消息对应的 Trace，不再按时间从最近 Trace 中猜测。
- 仅对没有 `trace_id` 的旧开发数据保留兼容查询路径。
- 增加实时定稿与历史恢复测试，覆盖 Trace ID 在 REST 对账后不丢失。
