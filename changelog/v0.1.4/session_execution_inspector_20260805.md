# 会话执行权限检查器

日期：2026-08-05

## 变更

- 对话右侧运行检查器新增“执行权限”，显示并修改当前会话的 `ask/auto/full` 模式。
- 显示 Server 是否允许宿主执行；Server 硬开关关闭时禁用会话宿主开关并明确说明当前只能使用 Docker 沙箱。
- `full` 和开启宿主执行均要求用户再次确认，提示授权只对当前会话生效。
- 模型或工具运行期间锁定权限控件；后端返回 `SESSION_BUSY` 时恢复 Server 当前状态并提示稍后重试。
- 按模式说明实际行为：ask 全部询问、auto 只自动批准 Docker、full 跳过普通执行审批但不突破宿主硬开关。
- Agent 页面修正 Skill 文案，展示 Profile allowlist，而不是误称所有 Agent 共享全局 Skill。

## 验证

- ChatView 冒烟测试验证执行权限卡、Server 宿主状态和现有 IDE 工作台同时正常渲染。
- 会话执行策略 Store 单测继续通过。
- `npm test -- --run tests/unit/chat-view.smoke.test.js tests/unit/chat-execution.test.js`
