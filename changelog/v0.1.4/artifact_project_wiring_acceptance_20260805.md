# Artifact Project 贯通验收

日期：2026-08-05

## 变更

- 对话 API 注释补充会话 `project_id` 契约，明确 Artifact 工作区登记所依赖的 Project 来源。
- 组件验收覆盖 `session.project_id` 从会话列表贯通到 Artifact 登记请求，防止登记入口因字段丢失而永久禁用。
- 验收新登记 Artifact 会立即进入右侧资源列表，无需再次刷新页面。

## 验证

- `npm test -- --run tests/unit/chat-view.smoke.test.js`
