# Claude 原生端点配置

日期：2026-08-05

## 变更

- Anthropic 预设改为 `claude` 原生组件，不再伪装为 OpenAI 兼容端点。
- Anthropic 默认服务地址调整为 `https://api.anthropic.com`，由原生组件调用 Messages API。
- 设置页保存模型服务时读取预设的组件类型；未声明组件的服务继续使用 `openai` 兼容驱动。
- Claude 端点继续声明图片和工具调用能力，但不错误声明 `reasoning_effort`。

## 验证

- 模型预设单元测试验证 Anthropic 的组件、Base URL 和模型清单。
- `npm test`
- `npm run build`
