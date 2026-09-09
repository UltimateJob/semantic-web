# v0.1.4 稳定基线收敛（Web）

日期：2026-08-05

## 变更目标

从稳定提交 `02bfdb1491d4d6500f3d548303ee59a01da3ec1a` 重新建立 Web 主线，移除已冻结的任务与 Depth Model 界面，只保留后续 Agent 基础工作台需要的页面和状态。

## 主要变更

- 包版本调整为 `0.1.4-dev`。
- 删除 Task store、任务测试和协同侧栏中的任务卡占位实现。
- 删除 Agent 页的 Depth Model 配置；推理强度只保留 `auto/low/medium/high`，其中 auto 明确表示由当前模型决定。
- WS 客户端通道清单删除 `progress`，不再维护未实现任务系统的前端投影。
- Trace API 删除 `task_id` 别名，计量调用改为 `/metering/traces/{id}`。
- 清理不再使用的任务进度设计令牌和相关注释。

## 验证

- `npm test`：18 个测试文件、177 项测试全部通过。
- `npm run build`：生产构建通过。

