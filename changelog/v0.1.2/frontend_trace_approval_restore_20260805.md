# R19 前端 Trace 视图 + 审批卡刷新恢复

日期：2026-08-05
里程碑：v0.1.2 / R19（观测前端 + 审批恢复）
分支：feature/skill-system

## 为什么做这次变更

R18 把 traces/metering/interactions 三张表补了只读 REST 面，但前端还没有
消费方：Trace 视图缺失（验收③债的页面半），F4 审批卡也还留着硬伤——
页面刷新后 WS 补发不含历史 interaction.request，pending 审批卡永久丢失
（服务端 run 仍阻塞在 awaitApproval，用户却无处可点）。本 MR 把两条链路
接到 R18 的端点上，并补齐刷新后的会话重入体验。

## 包含内容

### 1. 审批卡刷新恢复（chat store + ChatView）

- 新增 `src/api/interactions.js`：`listInteractions({sessionId, status})` →
  `GET /interactions?session_id=&status=`（契约以
  internal/server/http/handlers/interactions.go 为准：按创建时间倒序，
  payload 为 JSON 对象）。
- chat store 新增 `restoreInteractions(sid)`：selectSession 流程在
  loadMessages 之后拉 `status=pending` 的交互，映射 REST 行为
  ApprovalCard 记录（`payload.question/risk/timeout_ts` →
  question/risk/timeoutTs，顶层 `agent` → agentName、`type` → kind），
  端点倒序响应反转为升序入队（置顶卡取尾部最新一条的语义不变）。
  只重建服务端仍 pending 的记录（已 answered/expired/cancelled 端点
  不返回、本地再兜底过滤）；本地已知记录（WS 实时到达或上次恢复）以
  本地状态为准跳过，不改判。恢复的记录同 WS 路径落一行 interaction
  消息行（id 用 `evt-restored-` 前缀——本地未对账的非 dialogue 行，
  REST 消息对账原样保留）。恢复失败不阻塞会话打开，仅 warning 提示
  （实时审批仍走 WS）。
- `ChatView.vue` onMounted：会话列表加载后若无选中会话，自动选中最近
  活跃会话——刷新页面后落到列表顶部会话，pending 审批卡随
  selectSession 一并恢复，无需手工点选。
- 单测 `tests/unit/interaction-restore.test.js`（6 例）：pending 重建
  （字段映射/倒序转正序/消息行/置顶卡）、本地已知 resolved 不改判、
  非 pending 行兜底忽略、无 pending 空集、恢复失败不阻塞且告警、
  重复恢复幂等。

### 2. Trace 视图（`/chat/:sessionId/trace/:traceId`）

- 新增 `src/api/traces.js`：`listTraces({traceId, taskId, page, pageSize})`、
  `getSpans(traceId)`、`getTaskMetering(id)`（{id} 即链路 ID，与 trace_id
  同义——handlers/metering.go）。
- 新增路由 `chat/:sessionId/trace/:traceId`（AppShell 子路由，title
  "Trace"）。
- 新增组件（均 ≤300 行）：
  - `src/views/TraceView.vue`（248 行）：顶部元信息（链路名/kind 徽标/
    trace_id/开始时间/合计耗时/跨度数）+ 左 span 树右详情（选中 span 的
    id/parent/开始时间 + attrs JSON 展开）；默认选中根跨度；三数据源
    并行加载（traces 元信息、spans、metering）。
  - `src/components/trace/SpanTree.vue`（132 行）：parent_id 组树压平为
    缩进行，名称 + kind 徽标 + 相对最长跨度的耗时条 + 耗时文本。
  - `src/components/trace/TraceSummary.vue`（211 行）：顶部耗时三分解条
    （推理/工具/等待按 kind 聚合：ChatModel→推理、Tool→工具、其余→等待；
    口径与后端一致 duration_ms 直加、嵌套不去重）+ metering 卡（该
    trace 的模型/Agent/用途/输入输出 token/成本估算 + 合计行）。
  - `src/components/trace/spans.js`：组树压平（孤儿跨度按根兜底不丢行）、
    kind 聚合、耗时格式化，纯函数供单测。
- 单测 `tests/unit/trace-spans.test.js`（6 例）：组树深度/兄弟序、孤儿
  兜底、空集、三段聚合与占比、耗时格式化。

### 3. "追踪"入口（run 维度）与取迹路径结论

入口做在消息行：助手行 done/error 后行首右侧显示"追踪"链接
（`MessageRow.vue`）。

取迹路径结论（契约核查后的刻意选择）：

- `message.done` 的 payload **只有 `run_id`，没有 `trace_id`**
  （internal/agent/runtime/events.go MessageDonePayload，实测复核确认）；
- `trace_id` 是 BuildAgent 时为会话 runner 生成的 uuid（kernel/agent.go
  NewTraceHandler，runner 级——同会话多次 run 共享同一 trace），与
  run_id 无映射，store 无 run→trace 索引，span attrs 也不含 run/session
  字段，REST /traces 只能按 trace_id 精确过滤或按开始时间倒序列全部；
- 因此点击"追踪"时拉最近一页 traces，取 `started_at ≤ 本行 done 时刻`
  的最新一条：本 run 的跨度必在开始之后、done 之前写入其 runner 的
  trace（两侧同为服务端时钟）；列表为空则提示"暂无链路数据"。
- **已知边界**：多会话/多 Agent 并发时，若另一 runner 的首个跨度落在
  （本行 run 开始, done] 窗口内，可能误取该 runner 的 trace。v1 单用户
  串行 run 场景下该路径可靠；彻底解需后端在 done payload 带 trace_id
  或在 run_sessions 记录 trace_id（遗留 TODO）。

### 4. 联调实测记录（2026-08-04，本机）

后端：`semantic-server`（`SEMANTIC_LLM_DEFAULT=mock` +
`SEMANTIC_MOCK_SCRIPT` 三条脚本：普通回复 → artifact_put 工具调用 →
总结；独立临时 sqlite）；前端：`npm run dev`（:3000，/api 与 /ws 代理到
:8080/:8081）。驱动脚本严格按前端调用形态（REST 路径参数、WS 上行帧
`{type,...}`）全程走 vite 代理，20 项断言 ALL PASS：

1. 登录 → 建会话 → WS 发"你好" → message.done（payload 有 run_id、
   无 trace_id——契约事实复核）。
2. "追踪"取迹：GET /traces 后按 started_at ≤ done 时刻命中会话 trace；
   GET /traces/{id}/spans 与前端组树一致（parent_id 闭合无孤儿、升序、
   含 ChatModel 跨度）；GET /metering/tasks/{id} 明细归属本 trace
   （mock/leader/chat，30 tokens/次）。
3. 发"帮我把报告存起来" → interaction.request 到达（risk=high，
   question/timeout_ts 齐备）；REST pending=1。
4. **刷新恢复场景**：关闭 WS（页面关闭）→ 全新"页面"只凭 REST
   `interactions?session_id=&status=pending` 仍取回同一张卡，字段可
   1:1 映射为 ApprovalCard 记录（payload.question/risk/timeout_ts 与
   WS 下行一致、reply=null）→ 恢复成立。
5. 新 WS 连接上行 interaction.reply(approved) → run 恢复并完成
   （done 文本"报告已为您存好。"）→ REST pending 归 0、answered 为 1。
6. run 2 跨度追加进同一 trace（2 → 5），计量记录同步增长（2 → 5）。
7. Trace 路由 SPA 直达（vite 回退 index.html）；新增前端模块经 vite
   dev 按需编译全部 200。

实测附注（后端观测缺口，非本 MR 范围）：mock 的 artifact_put 执行经
审批中断/恢复路径，不触发 eino 组件回调，TraceHandler 无 Tool 跨度
落库（span 全为 ChatModel）；前端对 Tool kind 的渲染与聚合由单测覆盖。

## 影响面

- `src/stores/chat.js`：新增 restoreInteractions/_restoreInteraction，
  selectSession 串接恢复（既有 WS 实时路径行为不变）。
- `src/views/ChatView.vue`：onMounted 自动选中最近活跃会话。
- `src/components/chat/MessageRow.vue`：done/error 助手行新增"追踪"
  链接与取迹跳转。
- `src/router/index.js`：注册 Trace 路由。
- 新增：api/interactions.js、api/traces.js、views/TraceView.vue、
  components/trace/{SpanTree,TraceSummary}.vue、components/trace/spans.js、
  tests/unit/{interaction-restore,trace-spans}.test.js。
- `tests/unit/chat-view.smoke.test.js`：补 @/api/interactions mock 与
  memory 路由（MessageRow 注入 router）。
- 无新增依赖，无 schema/契约变更（纯 R18 端点消费方）。

## 测试内容与标准

- `npm run test`：17 文件 141 例全绿（新增 12 例）。
- `npm run lint`（eslint + prettier --check）：零告警。
- `npm run build`：成功（TraceView 懒加载 chunk 8.06 kB）。
- 联调实测：见上节（20 项断言 ALL PASS；实测后进程已杀）。

## 遗留 TODO

- "追踪"取迹在并发多 runner 场景有理论误取窗口（见 §3 已知边界）；
  根治需后端在 message.done payload 带 trace_id（或在 run_sessions 落
  trace_id 并开放查询），随任务系统里程碑一并评估。
- mock/真实工具执行（含审批恢复后）不写 Tool 跨度：eino 工具节点回调
  未挂 TraceHandler，后端观测缺口，建议下个人 MR 在 kernel 工具调用
  处补跨度（届时前端三分解条的"工具"段即有真实数据）。
- 后端 span name 对 mock 模型恒为 "unknown"（RunInfo.Name/Type 均空），
  真实 OpenAI 兼容端点正常；如需美化可在 TraceHandler 以归因 model 名
  兜底。
- Trace 视图为只读单链路视图；trace 列表页（跨链路检索/时间窗过滤）
  与任务卡片入口随任务系统里程碑落地。
