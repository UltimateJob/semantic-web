# F3 对话页消息流（W1.3）

日期：2026-08-03 · 里程碑：F3 · 范围：semantic-web（联调 semantic-server :8080/:8081，mock LLM）

## 为什么

F1/F2 立起了骨架与登录会话列表，/chat 中栏仍是占位。F3 把对话主链路真正打通：
REST 分页历史 + /ws/chat 流式渲染 + 断连续传，使对话页成为可用的系统入口。
全部协议以代码为准（`internal/agent/runtime/events.go`、`internal/server/ws/`、
`internal/server/http/handlers/chat.go`、`docs/api/ws.md`），不与设计稿想当然对齐。

## 内容

- **消息数据层（`src/stores/chat.js` 重写）**：
  - `messagesBySession` 按会话分桶（`{list, earliestPage, total, loaded, loadingEarlier}`），
    `streaming`（当前流式中的助手消息引用）、`sending`、`connectionStatus` 状态齐备。
  - **分页**：`loadMessages()`（选会话加载最新一页）/ `loadEarlierMessages()`（滚顶/按钮向
    页首回退一页，前插并保持滚动锚点）。后端**无 before 游标**（page/page_size 升序分页，
    以 chat.go 为准）——升序页窗对尾部追加稳定，"加载更早"用页码回退实现，
    `earliestPage>1` 即还有更早页。
  - **delta 聚合**：`message.delta` 按 `payload.run_id` 聚合为一条进行中的助手消息
    （id `stream-<runId>`），文本按到达顺序拼接；`message.done` 定稿为正式消息
    （id 换事件 id，带 turns/usage/error），`streaming`/`sending` 复位，
    会话列表按 `updated_at` 置顶刷新。
  - **REST 对账**：runtime 先落库再发 done（service.go finishRun），故 done 后
    `refreshTail()` 拉末页合并——乐观用户消息（`local-*`）与 WS 定稿副本（`evt-*`）
    按（收发侧, 文本）一对一匹配落库行后被替换；未命中保留在尾部；
    非 dialogue 本地消息（alert/artifact）无 REST 对应原样保留。纯函数
    `reconcileMessages()` 独立可测。
  - **WS 生命周期**：`openChat(sessionId)`（连 `/ws/chat?token&session_id`，动态引入
    dispatcher 避免模块环，协议应答 `error` 单独走 `applyProtocolError`）/
    `closeChat()`（切会话、离开页面、退出登录时关）；重连 sync 续传由 client 内置
    （last_event_id 游标 + 事件 id 去重），store 无需再去重。
  - `sendChatMessage()`：乐观插入用户消息（服务端无 WS 回执，done 后 REST 对账对齐）→
    上行 `chat.message`；非 online 拒绝发送。
- **ws client（`src/ws/client.js` 修正，对齐 ws.md 定稿）**：默认不再上行应用层
  `{"type":"ping"}`（上行类型只有 chat.message/interaction.reply/sync，多发只会每 30s
  吃一个 `WS_UNKNOWN_TYPE`）——保活由服务端协议层 ping/pong 承担（浏览器自动回 pong）；
  同理默认关闭"90s 无入站判死"（静默健康连接没有应用层入站，会误杀）。
  `pingInterval/deadTimeout` 留作未来服务端支持应用层心跳时的开关。
- **渲染组件（`src/components/chat/`）**：
  - `MessageStream.vue`：顶部"加载更早"按钮 + 滚顶自动加载（store 防重入）；新消息
    贴底自动跟随（流式逐 delta 跟随），用户上翻则不强制拉底、亮"有新消息"浮钮；
    前插分页保持滚动锚点。虚拟滚动留 TODO（Phase 1 按 50/页真实分页控制渲染量）。
  - `MessageRow.vue`：角色色边条 + 徽标（user→品牌色"我"；agent 按名映射
    `--sf-role-*` 令牌，缺省 leader；alert/artifact→system 行）+ 时间戳 +
  流式闪烁光标 + error 态 + token 用量。
  - `MessageBubbleText.vue` + `src/utils/markdown.js`：markdown-it（`html:false` 禁内联
    HTML 第一道闸）→ highlight.js（`lib/common` 常用语言集，chunk 从 1080KB 降到 303KB）
    → DOMPurify 白名单消毒（第二道闸）。禁 v-html 直出未消毒串。
  - `ToolCallBlock.vue`：工具调用紧凑块（图标+名称+耗时+状态，点击展开参数/结果）。
    **不进生产渲染路径**（MessageRow 未引用）——后端下行事件只有 message.delta/done
    （events.go 以代码为准），14-frontend-api §4.3 的 trace `tool.called/tool.result`
    是架构预留、无生产方；组件契约按预留形态先行实现，待 trace 频道落地后接线。
  - `PromptInput.vue`：Enter 发送 / Shift+Enter 换行；发送中（含流式中）、无会话、
    连接断开均禁用（占位文案随态切换）；artifact 上传钮占位禁用（title="Phase 2 开放"）；
    esc 中断留 TODO（F4 task.control 语义）。
- **ChatView 接线**：选会话 → `selectSession`（先 openChat 防漏实时事件，再 loadMessages
  对账）；新建会话直接开 WS；离开页面 closeChat；连接状态 tag 真实化；右栏协作侧栏
  占位改标 F4。
- **测试**：
  - `tests/unit/chat-store.test.js`（12 例：delta 聚合×2、done 定稿/对账/乐观替换、
    error 收尾、appendMessage 去重、done 重发不重复、reconcile 合并/保留、
    末页加载、回退分页、重复选择对账）。
  - `tests/unit/markdown.test.js`（8 例，jsdom 环境——DOMPurify 需要真实 window 才真正
    过滤）：`<script>`/iframe/svg+script 剥除、`javascript:` 链接拒认、事件处理器标签
    不成形、hljs 高亮类名保留、行内代码/加粗/链接正常、空值安全。
  - `tests/unit/chat-view.smoke.test.js`（2 例，jsdom 挂载真实组件树）：三栏骨架/输入区/
    Phase 2 占位钮在位；选会话渲染历史消息 markdown 与 leader 徽标，未连接时输入禁用。
  - 新增 devDependency `jsdom`（仅测试用）。

## 影响面

- 纯前端变更，未要求后端改动；消费既有契约：chat sessions/messages REST、/ws/chat
  双向通道（chat.message / message.delta / message.done / sync / error 应答）。
- ws client 默认关闭应用层心跳：F1 设计稿的 30s ping/90s 判死与定稿协议不符，
  client 此前无生产调用方（F2 仅 REST），无存量影响。
- chat store 状态形状变化（`messages` → `messagesBySession` 派生 getter）：
  模板读取入口不变（`chat.messages`），dispatcher 入口签名不变。
- localStorage 无新增持久化字段（消息流为运行时状态，会话页每次进入重新拉取）。

## 测试

- `npm run test`：7 文件 44 用例全过（含 jsdom 环境的 markdown/ChatView 冒烟）。
- `npm run lint`：eslint 0 error + prettier --check 全过。
- `npm run build`：vite production 构建成功；ChatView chunk 303KB（gzip 118KB），
  主 chunk 体积警告同 F1（element-plus 全量引入，见 F1 TODO）。
- 联调实测（`make build` + `SEMANTIC_LLM_DEFAULT=mock semantic-server serve` +
  `npm run dev`，全程走 vite 代理 :3000；WS 侧用 node 驱动生产 `createWsClient`，
  与浏览器同一代码路径）：
  - 登录 → 新建会话 → WS 连接建立（:3000 代理 → :8081）→ 发消息 → `message.delta`
    流式下行（增量按序拼接 == done.text）→ done 带 turns/usage（mock 固定 30 tokens）；
  - 第二条消息独立 run（多轮）；REST 落库 4 条（2 用户 + 2 助手，角色交替升序）；
  - 会话隔离：B 连接给 A 发消息，B 收不到 A 的对话事件（hub 按 session 投递），
    A 订阅者照常收到；REST 两侧互不串（A=6 / B=2）；
  - 重启 server（SIGTERM）：旧 token 仍有效（token 落库），A/B 历史原样（6/2），
    连接自动重连 online（sync 无缺口 count=0）；
  - 断网（SIGKILL）：客户端判离线转 reconnecting（输入禁用路径），断网期间 send
    被拒绝；恢复后先用临时连接产生一轮缺口事件（1 delta + 1 done 落库），原连接
    退避重连触发 `sync(last_event_id)`——server 日志"断连续传补发 count=2"，
    缺口 done 实时+补发重叠按 id 去重恰好到达一次，全程事件 id 无重复，续传轮
    已落库（A=10）；
  - 实测完毕 server 与 dev 进程均已停止（8080/8081/3000 端口已释放）。

## TODO（留 F4+）

- **工具事件**：后端无 trace/tool 事件下行（events.go 仅 delta/done）；`ToolCallBlock`
  已按 14-frontend-api §4.3 预留形态实现并用 mock 数据自测，待 trace 频道落地后
  由 MessageRow 接线进生产渲染路径。
- **审批**：interaction.request 下行已到 store 入口（`applyInteraction` 留 TODO）；
  ApprovalCard 置顶/倒计时/interaction.reply 上行在 F4 接入。
- **中断**：esc / 停止按钮（task.control cancel 语义）随 F4；同会话在途期间前端
  以禁用输入兜底（后端会话锁串行）。
- **虚拟滚动**：MessageStream 留 TODO，消息量上量后换 VirtualMessageList 方案。
- **协作侧栏**：TODO 面板/任务卡片/告警列表/产物列表（progress/alert/artifact 频道）
  在 F4 接入；alert/artifact 事件当前以 system 行落入消息流（占位呈现）。
- WS 断线无应用层心跳时依赖 TCP 收帧判死：对"静默断网"（无 FIN/RST）检出不及时，
  待服务端支持应用层心跳后开启 client 的 pingInterval/deadTimeout。
- token 过期后 WS 重连会 401 空转（URL 在建连时固定）：后续把 openChat 的 URL
  改为按重连尝试动态取最新 token。
