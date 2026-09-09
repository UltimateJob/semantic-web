# F4 审批卡与 Phase 1 联调验收（W1.4）

日期：2026-08-03 · 里程碑：F4 · 范围：semantic-web（联调 semantic-server :8080/:8081，mock LLM + SEMANTIC_MOCK_SCRIPT）

## 为什么

F3 打通了对话消息流，但高风险工具（artifact.put，risk=high）触发 L4 审批时
前端只能干等：interaction.request 下行到 `applyInteraction` 就是终点（TODO）。
F4 把审批链路补全——审批卡渲染、倒计时、interaction.reply 上行、超时对账——
并以此为 Phase 1 总验收路径（登录→对话→审批→工具执行→落库查证）画上句号。
全部协议以代码为准（`internal/interaction/service.go`、
`internal/server/ws/chat.go`、`internal/agent/runtime/service.go`、
`internal/security/middleware.go`、`docs/api/ws.md`）。

## 内容

- **interaction 数据层（`src/stores/chat.js`）**：
  - `pendingInteractions[]` + `interactionsById{}`：`interaction.request` 入队
    （payload 以 service.go RequestPayload 为准：`interaction_id/type/question/
    risk/timeout_ts`，timeout_ts 为 Unix 秒），同一响应式记录对象同时被
    队列、置顶卡与消息流 interaction 行引用（一处定稿、三处同显）。
    断连补发与实时到达重叠按 `interaction_id` 幂等。
  - `replyInteraction(id, approved)`：上行 `interaction.reply`，发出即**乐观
    出队**并落定结果徽标（已批准/已拒绝）；离线或已终结返回 false 由卡片提示。
  - **对账出队**：后端无 `interaction.resolved` 下行（ws.md 下行清单以代码为准，
    14-frontend-api §4.3 的该类型是架构预留）——run 在 `awaitApproval` 阻塞至
    应答/超时（runtime service.go），故 `message.done` 到达时该会话全部待应答
    必已被服务端终结，本地未应答残留一律按**已超时**出队（防服务端 300s 超时
    reject 后卡片残留）；`interaction.resolved` 按预留契约先实现（无生产方）。
  - `INTERACTION_REPLY_FAILED` 兜底：errorReply **不携带 interaction_id**
    （以 chat.go errorReply 为准），改判当前会话最近一次应答过的记录
    （`repliedAt` 最新；单会话 run 串行，竞速场景下即目标），无应答记录则
    吞掉队列最老待办，均改徽标为已超时并 toast 告知。
  - **倒计时语义**：本地只按 `timeout_ts` 展示剩余并耗尽置灰，**不主动判
    超时**——超时以服务端为准（service.go 默认 300s 按拒绝处理，状态迁移
    Expired），卡片出队由应答或 message.done 对账驱动。
- **`ApprovalCard.vue`（components/chat/）**：confirm 审批卡——问题文本、
  risk 徽标（high/critical 用 danger 色）、mm:ss 倒计时（耗尽按钮置灰并提示
  "已超时，等待服务端按拒绝处理"）、批准/拒绝（点击 loading 防重复，失败
  toast）；resolved 态显示结果徽标（已批准 success/已拒绝 danger/已超时 info）。
- **MessageRow 扩展**：`channel=interaction` 行渲染 ApprovalCard（按
  `interactionId` 取共享记录），边条用 `--sf-channel-interaction` 令牌；
  消息行 id 用事件 id（evt-*）——本地未对账非 dialogue 行，REST 对账保留尾部
  （同 alert/artifact 既有路径）。
- **ChatView 接线**：存在 pending 时输入区上方**置顶当前会话最新一张**审批卡
  （`currentPendingInteraction` getter）；协作侧栏"任务卡片"区接 task store
  占位卡（标题/状态/百分比），其余三区改标 Phase 2。
- **任务卡片占位（progress 频道最小落地）**：新建 `src/stores/task.js`
  （`activeTasks[]` 占位模型，task.created/task.progress/task.done 按
  `parent.task_id` 聚合 upsert，payload 从宽解析 title/status/percent/
  current_step）；dispatcher 注册 `progress` 频道。**后端当前无 progress
  生产方**（ws.md 架构预留），本里程碑只打通"envelope→dispatcher→store→
  侧栏"链路，真实任务 Phase 2 接入。
- **测试**：
  - `tests/unit/interaction-store.test.js`（10 例，jsdom + 可控 FakeSocket 走
    生产 ws client）：入队字段/消息行/置顶 getter、幂等、应答上行帧与乐观出队、
    离线拒答、done 对账超时出队、done 不改判已应答、INTERACTION_REPLY_FAILED
    两种改判、预留 resolved 对账、跨会话置顶。
  - `tests/unit/approval-card.smoke.test.js`（6 例，jsdom 挂载真实组件）：
    pending 显示问题/risk 徽标/倒计时/按钮可用；resolved 三种结果徽标；
    倒计时耗尽置灰；点击批准调用 store.replyInteraction。
  - `tests/unit/task-store.test.js`（2 例）：created→progress→done 聚合、
    dispatcher 默认绑定路由。

## 影响面

- 纯前端变更，未要求后端改动；消费既有契约：interaction 频道下行
  `interaction.request`、上行 `interaction.reply`、`INTERACTION_REPLY_FAILED`
  错误应答。
- chat store 新增状态（pendingInteractions/interactionsById）为运行时状态，
  不进 persistedstate；`applyProtocolError` 对 INTERACTION_REPLY_FAILED 分流
  处理（不再误伤 sending/streaming），其余错误路径行为不变。
- 已知呈现行为：message.done 后 REST 对账把 interaction 行（evt-* 本地行）
  保留在尾部——审批卡在消息流中的位置会移到本轮助手回复之后（与 alert/
  artifact 行同一既有语义，F3 先例）。

## 测试

- `npm run test`：10 文件 62 用例全过。
- `npm run lint`：eslint 0 error + prettier --check 全过。
- `npm run build`：vite production 构建成功（ChatView chunk 310KB/gzip 120KB，
  主 chunk 体积警告同 F1，element-plus 全量引入留既有 TODO）。
- 联调实测（`make build` + `SEMANTIC_LLM_DEFAULT=mock SEMANTIC_MOCK_SCRIPT=
  '[tool_call artifact.put, 文本]…' semantic-server serve` + `npm run dev`，
  全程走 vite 代理 :3000；WS 侧用 node22 内置 WebSocket 驱动生产
  `createWsClient`，与浏览器同一代码路径）：
  - **批准路径**：登录 → 新建会话 → 发送"帮我把报告存起来" → mock 首轮返回
    artifact.put 工具调用 → security 中间件中断 → 收到 `interaction.request`
    （question="是否批准执行 artifact.put（风险等级：high）？"、risk=high、
    timeout_ts=now+300s）→ 上行批准 → 工具执行 → message.delta/done
    （turns=2，usage 60 tokens）→ DB 佐证：artifacts 表 1 行且内容文件写入，
    interactions 表 answered/`{"approved":true}`；立即重复应答吃
    `INTERACTION_REPLY_FAILED`（"交互已终结，无法应答"）。
  - **拒绝路径**：同上触发 → 上行拒绝 → done 正常渲染 → artifacts 表无新增
    （仍 1 行），interactions 表 answered/`{"approved":false}`，server 日志
    "审批结论 approved=false"；工具返回结构化拒绝（APPROVAL_REJECTED）供
    模型如实告知（mock 文本为脚本固定内容）。
  - **超时路径**：不应答等待 300s → server 日志"交互请求超时，按拒绝处理"，
    interactions 表状态 expired → run 继续 → message.done 到达 → 前端对账
    出队（单测覆盖同路径）。artifacts 表无新增。
  - **重启持久化**：SIGTERM 重启 server（同 DB）→ interactions 三行记录
    （approved/rejected/expired）原样保留可查。**注意：后端当前无交互记录
    REST 端点**（internal/server/http 无 interactions 路由）——"REST 可查"
    以 sqlite DB + server 日志佐证，REST 查询端点列为后端缺口（见 TODO）。
  - 实测完毕 server 与 dev 进程均已停止（8080/8081/3000 端口已释放）。

## TODO（留 Phase 2+）

- **交互记录 REST 端点**（后端缺口）：无 `/chat/sessions/{id}/interactions`
  之类端点——页面刷新后待应答审批卡丢失（请求事件已消费、sync 不补发、
  REST 无查询），run 将挂到 300s 超时按拒绝处理。需后端补端点后前端在
  selectSession 时恢复 pending 队列。
- **interrupt.resolved 下行**：如后端补该事件（14 §4.3 预留），前端已按契约
  实现对账，可直接切换为事件驱动出队。
- **多中断点**：runtime 逐个串行发起审批，前端队列/置顶卡已支持多张排队，
  但 single-run 场景实测只覆盖单张；表单类交互（confirm 以外类型）未实现。
- **esc 中断**（task.control cancel 语义）仍未接：审批等待期间输入区禁用，
  用户无法主动取消本轮 run（只能等超时或应答）。
- 任务卡片为占位模型：progress 事件无生产方，todo 列表/阶段视图 Phase 2。
