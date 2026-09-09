# 前端消息流时间线排序 + 已终结审批卡历史恢复（正确性修复）

日期：2026-08-05
里程碑：v0.1.2（正确性修复）
分支：feature/skill-system

## 为什么做这次变更

用户实测反馈两个正确性问题：

1. **卡片顺序混乱**：审批卡 / monitor 告警 / SubAgent 委派块不出现在对话
   的时间线位置，而是"悬浮"在消息流最底下——此前实现对
   interaction/alert/artifact/delegation/restored 行一律 `push` 到尾部，
   对账时本地未对账行也原样留在尾部。
2. **重启会话后审批卡丢失**：刷新/重进会话后，已批准/已拒绝/已超时的
   审批卡完全消失——R19 的 restoreInteractions 只恢复 pending，已终结
   记录没有历史呈现。

本 MR 让所有消息行（对话/工具/审批/告警/委派/产物）统一按服务端时间
ts 升序落位，并把已终结审批作为带结果徽标的历史行恢复到其 ts 对应的
原位（通常在某条用户消息后、助手回复前）。

## 包含内容

### 1. 时间线排序（chat store）

- 统一消息行模型本就有 `ts`（envelope.ts / REST created_at；本地乐观行
  用本地时间，对账命中后被服务端落库行整体替换——语义不变，本 MR 把
  它正式用作排序键）。
- 新增纯函数 `insertIndexByTs(list, ts)`（自尾向前线性扫描，页窗 ≤50
  代价可忽略）：落在最后一个 `ts ≤ 新行` 的既有行之后（同 ts 稳定）；
  新行无 ts 追加尾部；既有行无 ts 不越过（保持到达序）。
- `appendMessage` 更名为 **`insertSorted(msg, sid)`**：按 id 幂等去重后
  按 ts 落位。所有产生行的路径统一走该插入点——乐观用户消息
  （sendChatMessage）、interaction 入队（applyInteraction）、alert
  （applyAlert）、artifact（applyArtifact）、delegation（_applySubAgent
  首次 delta）、restored 历史行（_restoreInteraction）、无流式行的 done
  定稿（applyDialogue 补发乱序兜底）。
- **运行中例外**：流式中的 run（message.delta 聚合行）仍直接压尾，直到
  message.done 原地替换定稿；done 触发的 refreshTail 对账把它并进全局
  时间线。
- `reconcileMessages` 去重/对账语义不变（服务端行按 id 合并、本地乐观
  对话行按（收发侧, 文本）匹配丢弃、非 dialogue 本地行保留），输出改
  为整体按 ts 升序（`byTsAsc`，Array.sort 稳定；任一侧无 ts 返回 0 保持
  相对序——生产路径的行都带 ts，该兜底只为缺 ts 输入下行为确定）。
  分页前插（loadEarlierMessages）经同一路径合并，全局有序。
- 单测（tests/unit/chat-store.test.js，新增 7 例）：insertIndexByTs 定位/
  同 ts 稳定/无 ts 兜底；insertSorted 乱序落位与同 ts 到达序；先审批后
  用户消息回执（REST 对账后审批卡落在用户消息之后）；先 done 后 delta
  （done 已落位，更早 ts 的委派/审批仍插到其前，对账后次序保持）；
  流式中 run 保持尾部（运行中例外）；reconcile 分页合并本地行按 ts
  交错；loadEarlierMessages 前插合并后全局按 ts 有序（52 行断言全序）。

### 2. 已终结审批卡历史恢复（chat store + interactions API）

- 契约核查结论（internal/server/http/handlers/interactions.go）：status
  取值 pending/answered/expired/cancelled（非法 400），**空 status 不
  过滤、返回全部**——因此恢复无需 status=all 或两次调用，直接不带
  status 拉全量；reply 为 JSON 对象 `{"approved":bool}`
  （internal/interaction/service.go replyPayload）。
- `restoreInteractions` 改经 `_fetchAllInteractions(sid)`：不带 status
  分页拉全（page_size=100，total 超页自动翻页），倒序响应反转为创建
  升序（pending 队列按到达序、置顶卡取尾部最新一条的语义不变；消息行
  由 insertSorted 按 ts 落位，与遍历顺序无关）。
- `_restoreInteraction` 同时处理两类：
  - pending → 维持现有可操作逻辑（入待应答队列 + 可应答审批卡）；
  - 已终结 → `restInteractionResult(row)` 映射结果徽标：answered 看
    `reply.approved` → approved/rejected；cancelled → cancelled（新增
    `INTERACTION_RESULT.CANCELLED`）；expired 及未知状态兜底 expired
    （灰化，宁可见不可漏）。落 channel=interaction 历史行（id 仍
    `evt-restored-` 前缀），按 created_at 落在时间线原位。
- 去重语义不变：`interactionsById` 已有同 id 记录即跳过（WS 实时到达
  或上次恢复优先，本地状态不被 REST 行覆盖改判）；消息行按 id 幂等。
- ApprovalCard 补齐 cancelled 展示态：徽标文案"已取消"（info 色）；
  灰化条件 `expiredShown` 扩展为 `fadedShown`（倒计时耗尽，或已终结
  且结果为已超时/已取消），对应状态类 `is-expired` 更名 `is-faded`
  （opacity 0.65 不变；resolved 本就不渲染操作按钮——禁用+灰化达成）。
- 单测（tests/unit/interaction-restore.test.js，重写为 8 例）：全量恢复
  （pending 可答/answered 带已批准·已拒绝徽标/expired；不带 status 的
  调用形态；四行按 created_at 升序落行）、历史行 ts 落位（用户消息后、
  助手回复前）、cancelled/缺 reply/未知状态映射、本地已知不改判、空集、
  恢复失败不阻塞、重复恢复幂等、total 超页翻页拉全（101 条跨页合并后
  全局升序）。

## 影响面

- `src/stores/chat.js`：新增 tsMs/byTsAsc/insertIndexByTs/restInteractionResult
  与 `_fetchAllInteractions`；`appendMessage` → `insertSorted`（全部内部
  调用点同步）；reconcileMessages 输出按 ts 升序；done 兜底路径走
  insertSorted；restoreInteractions/_restoreInteraction 全量化；
  INTERACTION_RESULT 增 CANCELLED；相关注释同步。
- `src/components/chat/ApprovalCard.vue`：cancelled 文案与灰化（192 行，
  ≤300；视觉结构未动，仅状态类更名）。
- `src/api/interactions.js`：未改（调用方不再传 status 即全量）。
- 消息渲染组件（MessageRow/MessageStream/ChatView）：未改——排序在
  store 数据层完成，视图按列表顺序渲染（布局重构留给下一个 MR）。
- 无新增依赖，无 schema/契约变更（纯既有端点消费方式调整）。

## 测试内容与标准

- `npm run test`：17 文件 150 例全绿（新增 9 例：chat-store +7、
  interaction-restore 净 +2（重写 6 → 8 例））。
- `npm run lint`（eslint + prettier --check）：零告警。
- `npm run build`：成功（ChatView chunk 32.57 kB）。

## 遗留 TODO

- 真实联调冒烟（审批后刷新页面，审批卡在时间线原位显示"已批准"）建议
  随下次本机联调一并复核；本 MR 行为由单测锁定（历史行 ts 落位 + 徽标
  映射）。
- interactions 恢复按 page_size=100 翻页拉全；单会话审批数极大时恢复
  耗时下探，后续可评估按 created_at 窗口或服务端游标分页。
- 本地乐观用户消息在对账前用本地时钟 ts，与服务端时钟偏差大时短暂
  位置抖动（对账后即对齐服务端 created_at）；如实测可见再评估以
  done 事件 ts 预校正。
