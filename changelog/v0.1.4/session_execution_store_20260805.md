# 会话执行策略数据层

日期：2026-08-05

## 变更

- Web 对话 API 接入会话执行策略读取与更新接口。
- Pinia 按会话缓存 `ask/auto/full`、宿主执行开关、Server 硬开关和忙碌状态。
- 执行模式与宿主开关始终在一次请求中原子提交，并只采用 Server 确认结果更新界面。
- 删除会话时同步清除对应的执行策略缓存，`full` 与宿主权限不会带到其他会话。

## 验证

- 验证默认策略读取、原子更新、Server 响应对账和会话删除清理。
- `npm test -- --run tests/unit/chat-execution.test.js`
