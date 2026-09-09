# R14 前端委派块 + 协作侧栏（Team 状态区 + 告警分级渲染）

日期：2026-08-05 · 里程碑：R14（v0.1.2 委派与协同呈现）· 范围：semantic-web
（联调 semantic-server :38080/:38081，经 vite 代理 :3000）

## 为什么

R12/R13 后端已落地委派全链路：subagent.delta/subagent.result 下行
（envelope.agent 归因成员实例，如 query-1）、monitor 告警分级下行
（monitor.alert，payload.level 1-5）、审批卡归因正确。前端此前对 subagent
事件无呈现（delta/result 进 dispatcher 后按未知 dialogue type 静默丢弃），
右栏只有任务卡片占位。本 MR 把委派过程与协同状态落到 UI：消息流里的
SubAgentBlock 委派块 + 协作侧栏 Team 状态区与分级告警列表。全部契约以
代码为准（`internal/agent/runtime/events.go` SubAgent*Payload、
`internal/agent/monitor/alert.go`、`internal/server/aggregate/rules.go`、
`docs/api/ws.md`）。

## 内容

- **chat store 扩展（`src/stores/chat.js`）**：
  - **委派块模型**：`delegation{id, sessionId, runId, agentName(成员实例 id),
    agentRole(角色名), task, status(running/done), result, ts}`。state 新增
    `delegationsById`（消息行与 SubAgentBlock 共享同一响应式对象）与
    `activeDelegations`（进行中的委派索引，key=`${sid}:${runId}:${agentId}`）；
    getter `delegations` 给出当前会话的委派块列表（按创建序）。
  - `applyDialogue` 分流 subagent.delta/subagent.result 到 `_applySubAgent`：
    delta 建块并把增量聚合进 `result`（运行中即流式明细）；result 定稿
    `task` 与结果全文（覆盖流式聚合）、状态转 done、移出 active 索引——
    **同 run 同成员再次被委派时另起新块**（delta 到达已 done 的 key 时
    新建记录）。无 delta 直达 result 时补建块直接落成 done。
    `agentRole` 取 envelope.agent.name（publishSubAgent 填 def.Role），
    缺省从实例 id 去 `-N` 后缀兜底。
  - 委派块消息行：`{type:'delegation', delegationId}` 落桶与对话穿插
    （MessageRow 渲染为 SubAgentBlock）。行 id 用 `local-` 前缀 +
    channel=`subagent`——本地呈现产物无 REST 对应，对账时与
    alert/artifact 行同规则原样保留在尾部（reconcileMessages 不变）。
  - **alert 分级路由**（与聚合器 rules.go 同一套规则）：
    critical → 消息流 + 侧栏告警列表（ui.notify 仍由 dispatcher 负责）；
    normal → 消息流简述 + 侧栏列表；low → 仅侧栏列表（不打断对话流）。
    state 新增 `alerts[]`（最新在前，容量 `ALERT_LIST_LIMIT=50`，按事件 id
    幂等去重——断连补发与实时到达可能重叠）。分级判定 `alertImportance(env)`
    纯函数导出：envelope.importance 为线上权威（聚合器 normalize 重打标），
    缺失/非法时按 payload.level 本地复算（数值 ≥3→critical、1-2→low；
    字符串 critical/high→critical、warning/medium→normal、info/low→low；
    其余 normal——宁可见不可漏）。告警文本取 payload.message（monitor
    真实负载 `{rule,level,message,topic}`），description 为旧契约兜底。
  - dispatcher：critical 通知的判定与文案改经 `alertImportance` /
    payload.message（行为不变，分级与 store 同源）。
- **agents store（`src/stores/agents.js`）**：轮询改**引用计数**
  （`startPolling` +1 / `stopPolling` -1，归零才停表）——对话页协作侧栏与
  Agents 管理页共享同一定时器，路由切换时后卸载方不再误停先挂载方的
  轮询。roster/状态映射/角色色映射复用不变。
- **SubAgentBlock.vue（新增 191 行）**：委派块——角色色边条
  （`roleColor(agentRole)`，未定义角色由 CSS var fallback 落灰）+ 头部
  （状态点 running 转圈/done 绿、`Leader → <agentName>`、任务摘要
  （task 随 result 才到达，执行中显示"任务执行中…"）、时间戳）+ 结果区
  （running 时流式明细实时展开带闪烁光标；done 后默认折叠，点击头部
  展开结果全文；文本经 MessageBubbleText 的 markdown 安全管线渲染）。
- **MessageRow 扩展**：`type==='delegation'` 的行整块渲染为 SubAgentBlock
  （按 delegationId 取 store 记录）；其余行编排不变。
- **协作侧栏（新增 `CollabSidebar.vue` 270 行；ChatView 214 行，均 ≤300）**：
  - **Team 状态区**（顶部新增）：roster 成员列表（角色色点 + 实例 id +
    状态点与标签——agentStatusMeta 与 Agents 页同源：启动中/待命/运行中/
    已停止），空态提示单 leader 模式；
  - **告警列表**（新增）：全级别条目（级别徽标（数值级别显 L\<n\>，字符串
    原样，缺省按分级）+ 来源成员 + 时间 + 消息），critical 红边高亮、
    normal 黄边、low 蓝边；
  - 任务卡片区（task store，原样迁入）+ TODO 面板/产物列表占位保留。
  - ChatView 只挂 `<CollabSidebar />`；roster 加载与 30s 轮询随 ChatView
    生命周期启停（agents store 引用计数协调）。

## 影响面

- 消费 R12/R13 后端契约：dialogue 频道 subagent.delta/subagent.result
  （envelope.agent 归因成员实例）、alert 频道 monitor.alert（广播，
  session_id 为空，同一条 /ws/chat 连接收到）。
- `applyAlert` 行为变化：low 级告警不再落消息流（此前全级别落流）；
  critical/normal 消息行新增 `importance` 字段。
- agents store 轮询语义扩展为引用计数（单消费者场景行为不变；
  agents-store.test.js afterEach 相应改为释放双引用）。
- 无新增依赖。

## 测试

- `npm run test`：14 文件 116 用例全过（新增
  `tests/unit/chat-collab.test.js` 16 例：subagent 建块聚合/result 定稿/
  同成员再委派另起新块/多成员各自成块/result 直达补建/agentRole 兜底/
  会话隔离；alert critical/normal/low 三级路由/幂等/容量上限；
  alertImportance 权威值与 level 复算全映射。agents-store +1 例：轮询
  引用计数共享。chat-view.smoke +3 例：侧栏五区渲染、delegation 行
  SubAgentBlock 展开折叠、告警分级呈现）。
- `npm run lint`：eslint 0 error + prettier --check 全过。
- `npm run build`：vite production 构建成功（主 chunk 体积警告同 F1 既有
  TODO）。
- 联调实测（后端 `make build` 产物 + `SEMANTIC_LLM_DEFAULT=mock` +
  路由形态 SEMANTIC_MOCK_SCRIPT（leader 命中"团队指挥官"：轮 1 委派
  ask_query、轮 2 总结；第二轮消息调 `artifact_put`（净化名，模型侧名
  非 [a-zA-Z0-9_-] 字符替换为 '_'——kernel tools.go 规则）触发 L4 审批；
  query 命中"系统与产物查询助手"直接回答），隔离 sqlite（全新 DB 使
  settings_keys 无 deepseek key → 角色模型回退 mock），HTTP/WS 监听
  :38080/:38081（8080/8081 与 18080/18081 被本机早前遗留进程占用，
  未动它们）+ `VITE_SERVER_HTTP/WS` 指到该端口起 `npm run dev`，
  全程经 vite 代理 :3000，admin/admin123 登录，Node22 脚本驱动
  REST+WS）**15/15 通过**：
  - GET /agents 三成员 roster：leader:idle、monitor-1:running、query-1:idle
    （侧栏 Team 状态区线上形态）；
  - 发送"查一下有哪些产物"：subagent.delta 下行（1 帧，归因 query-1，
    聚合文本=query 脚本回答）→ subagent.result（task="查 artifact 列表"、
    text 全文，归因 query-1）→ message.done（leader 总结）——SubAgentBlock
    数据链路与契约逐字段一致；
  - 发送"把联调报告存起来"：interaction.request（importance=critical、
    risk=high）→ **monitor.alert 广播**（channel=alert、importance=critical、
    payload `{rule:"关键事件告警", level:4, message:"监测到 critical 事件
    [interaction.request] 来自 leader", topic:"agent.events"}`，归因
    monitor-1）——critical 告警进消息流 + ui.notify + 侧栏高亮条目的
    线上输入形态；批准应答后 run 恢复，message.done 收尾"报告已存好
    （批准）。"；
  - vite 编译 stores/chat、SubAgentBlock、CollabSidebar、MessageRow、
    ChatView 模块均 200；
  - 实测完毕 server 与 dev 进程均已停止（端口已释放，临时 DB 已清理）。

## TODO（留后续版本）

- 本次联调走 API/WS 级 + vite 模块编译级验证（环境有 firefox 但无
  playwright/puppeteer 驱动）；SubAgentBlock 与侧栏的 DOM 呈现由 jsdom
  冒烟用例覆盖，真实浏览器点击遍历建议在验收轮补一轮手测。
- 委派块在时间线中的位置是"首帧 delta 到达处"，而 leader 的助手消息按
  run 聚合为一条——同 run 内 leader 总结文本（后于委派产生）仍并入
  委派块上方的那条助手消息。按 run 粒度切分助手消息属消息模型改动，
  本轮按既有聚合语义从简。
- 同一 run 内对同一成员的**并发**委派在协议上无法区分（delta 只带
  run_id+agent 归因），当前合并为一块；顺序再委派已正确另起新块。
- monitor 现行规则表下只有 level≥3（critical）告警会真实下行；low/normal
  分支由单测与契约复算覆盖，待其他告警生产方落地后补线上验证。
- 告警列表容量 50 条封顶，无持久化与已读语义；告警中心（聚合历史 +
  已读管理）随 Phase 2 任务/产物区一起评估。
