# R6 前端 Agent/Team 管理页（Team 概览 + 成员卡片 + 30s 轮询）

日期：2026-08-04 · 里程碑：R6（v0.1.1 设置系统）· 范围：semantic-web（联调 semantic-server :8080，agents REST 经 vite 代理 :3000）

## 为什么

R4 后端已交付 Team 组建（leader/monitor-1/query-1 三成员）与 GET /api/v1/agents
（roster：id/role/mode/status/model/activity），但前端导航栏 "Agent 设备" 仍是灰色
禁用态，用户无法看到 Team 成员与实时状态。R6 把 Agent 目录落到 UI：Team 概览 +
成员卡片（角色色令牌/状态点/当前活动/模型名）+ 30s 轮询。全部契约以代码为准
（`internal/server/http/handlers/agents.go`、`internal/agent/runtime/roster.go`、
`internal/bootstrap/wire_settings.go`）。

## 内容

- **agents API（`src/api/agents.js`）**：`listAgents()` → GET /agents，响应
  `{agents:[{id, role, mode, status, model, activity?}]}`（服务端按 id 升序，
  activity 无活动时缺省）。
- **agents store（`src/stores/agents.js`）**：
  - state：`agents[]`（roster 快照）、`loading`（仅首屏）、`error`、`polling`；
    getter `runningCount`（status=running 计数）。
  - `load({silent})`：首屏置 loading、失败原样抛出；**轮询静默刷新**不触碰
    loading、失败保留旧数据不抛出（防 30s 一次的闪烁与错误弹窗轰炸）。
  - `startPolling()/stopPolling()`：30s 轮询（`POLL_INTERVAL=30000`，与 AppShell
    组件健康轮询一致），start 幂等不叠加定时器；定时器为模块级句柄（非响应式、
    不可序列化，不入 state）。
  - 纯函数导出（与单测同源）：`agentStatusMeta(status)` 状态映射——
    **starting 黄（--sf-warning）/ idle 灰（--sf-text-disabled）/
    running 绿（--sf-success）/ stopped 红（--sf-danger）**，未知状态回退灰
    原样展示；`roleColor(role)` 角色徽标色——`var(--sf-role-<role>,
    var(--sf-text-disabled))`，优先 --sf-role-* 令牌，令牌未定义的角色
    （如 query）经 CSS var fallback 落灰，均不写死色值。
- **Agent/Team 页（`src/views/AgentsView.vue` 172 行 +
  `src/components/agents/AgentCard.vue` 149 行，均 ≤300 行）**：
  - 顶部 Team 概览卡：Team 名（session.teamName，与 AppShell 头部同源）/
    成员数 / 运行中计数 + 手动刷新按钮（loading 防重）+ 轮询说明文案。
  - 成员卡片栅格：`AgentCard` 角色徽标（角色色令牌圆形首字母）+ id/role/mode
    标签 + 状态点（含 title）+ 当前活动文本（无则 --）+ 模型名。
  - 轮询随页面可见性启停：`visibilitychange` 隐藏即 stopPolling，回前台立即
    补一次静默刷新并重启轮询；卸载时 stopPolling + 移除监听。
  - 首屏失败 toast + 页内 el-alert（可关闭）；空 roster 时 EmptyState
    （说明 teams_dir 未配置 Team 的单 leader 模式）。
- **导航与路由**：AppShell "Agent 设备" 菜单项由禁用态启用为 `/agents`；
  路由注册 `agents`（AppShell 子路由，非 public——守卫自动要求登录），
  标题 "Agent 设备"。

## 模型分配探测结论（本轮为何禁用编辑）

**结论：role.yaml 的 model 是 profile 层字段，不经 settings PATCH 可写——本轮只做
"每角色默认模型展示 + 编辑入口 disabled（title 提示 M2.x 开放）"。**

依据（以代码为准）：

- PATCH 链路 `settingsController.Patch`（internal/bootstrap/wire_settings.go）：
  merge patch 后 `config.DecodeTree` → `validateYAML` **fail-closed schema 校验，
  未知键逐段比对拒绝**；主配置树 `Config.Agents` 只有 `profiles_dir`/`teams_dir`
  （pkg/config/config.go AgentsConfig），配置树不含 `agents.<role>.model` 路径。
- 角色 model 声明在 profile 层 `configs/agents/<role>/role.yaml`（由
  `agents.profiles_dir` 的 profile loader 加载），roster 的 `model` 字段即
  `prof.Model` 投影；其存在性校验走 "profile model ∈ llm 注册表" 的语义校验，
  与 settings PATCH 的配置写回是两条独立链路。
- **联调实证**：PATCH `{agents:{leader:{model:"mock"}}}`（合法 base_hash）→
  400 `BAD_REQUEST`："配置 schema 校验未通过，共 1 处问题: - agents.leader:
  未知配置键"；写回未发生（后端仓 git status 干净）。
- 因此 AgentCard 模型行的编辑按钮 `disabled`，title 注明 "角色模型分配属
  profile 层（role.yaml），settings PATCH 不含该路径，M2.x 开放编辑"。

## 影响面

- 纯前端变更，未要求后端改动；消费既有契约 GET /api/v1/agents（受保护路由）。
- AppShell 仅改导航数组一项（`/agents` 禁用 → 启用）；路由注释同步更新。
- 观察到的事实（非本 MR 引入）：roster `model` 是 profile 声明的端点名
  （如 deepseek-chat），与 settings 的 `llm.default`（全局默认，本次联调经
  `SEMANTIC_LLM_DEFAULT=mock` 覆盖为 mock）是两个概念——卡片展示的是前者，
  二者不一致不属异常。

## 测试

- `npm run test`：12 文件 86 用例全过（新增 `tests/unit/agents-store.test.js`
  10 例：load 写入/loading 复位/runningCount、首屏失败抛出+error 落态、
  静默失败保留旧数据、静默刷新不触碰 loading、状态映射四态+未知回退、
  roleColor 令牌与 fallback、轮询 30s 节拍/stop 后无请求/start 幂等/
  轮询失败吞掉且恢复后清 error）。
- `npm run lint`：eslint 0 error + prettier --check 全过。
- `npm run build`：vite production 构建成功（AgentsView 独立 chunk 4.60 kB；
  主 chunk 体积警告同 F1 既有 TODO）。
- 联调实测（`make build` + `SEMANTIC_LLM_DEFAULT=mock semantic-server serve` +
  `npm run dev`，全程经 vite 代理 :3000，admin/admin123 登录取 token）：
  - GET /agents 200：**三成员齐全且与后端代码一致**——
    leader（leader/coordinator/idle/待命）、monitor-1（monitor/observer/
    **running**/订阅事件流）、query-1（query/service/idle/待命：service 角色
    （M2.5 接入 agent-as-tool））；model 均为 deepseek-chat（profile 声明值）；
  - 未带 token GET /agents → 401（受保护路由佐证）；
  - PATCH agents.leader.model → 400 "未知配置键"（模型分配探测结论实证，
    见上节）；
  - vite dev 编译 AgentsView/AgentCard/stores/agents/api/agents 模块均 200；
  - 30s 轮询不闪烁：由 store 单测覆盖（静默刷新不置 loading、失败保留旧数据），
    页面级与 R3 同限（环境无 headless 浏览器）；
  - 实测完毕 dev 与 server 进程均已停止；后端仓 git status 干净
    （400 在 schema 校验阶段拒绝，配置写回未发生）。

## TODO（留后续版本）

- 角色模型分配编辑：待后端把 role model 纳入可写配置面（profile 层写回或
  配置树扩展），预计 M2.x；届时 AgentCard 编辑按钮接通 PATCH 或新端点。
- 本次联调走 API 级验证（环境无 headless 浏览器），未做真实浏览器点击遍历；
  页面交互细节（状态点色、轮询可见性联动、空态）建议在后续验收中补一轮手测。
- query 等无 --sf-role-* 令牌的角色当前回退灰色徽标；若角色清单固定，可在
  tokens.scss 增补角色色令牌。
- Team 名取自 session.teamName 占位（"默认 Team"）；Team 定义（teams_dir 的
  name 字段）未暴露在 GET /agents 响应中，真实 Team 名展示待后端扩展或
  Team 切换里程碑接入。
