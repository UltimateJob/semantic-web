# F2 登录与主框架联调（W1.2）

日期：2026-08-03 · 里程碑：F2 · 范围：semantic-web（联调 semantic-server :8080）

## 为什么

F1 立起了骨架（request.js / stores / AppShell / LoginView 占位），F2 把登录鉴权链路
与主框架真正接到后端：本地账号登录、401 单飞刷新重放、组件健康轮询、会话列表读写，
使 /chat 成为可用的系统入口，为 F3 对话流铺平数据通路。

## 内容

- **auth API** `src/api/auth.js`：login / refresh / logout。后端契约以
  `internal/server/auth/handlers.go` 为准：login/refresh 响应均仅 `{token, expires_at}`，
  **无 me 端点、无独立 refresh_token**——登录用户标识由登录用户名回填（session.login），
  refresh 用 Bearer 旧 token 换新。
- **request.js 修正（对齐真实后端，非 F1 设计稿）**：
  - `doRefresh` 由「body 带 refresh_token」改为 `request.post('/auth/refresh')`
    （请求拦截器注入当前 Bearer；/auth/* 401 命中 isAuthRequest 白名单，不递归刷新）；
  - 刷新失败清态由 `session.logout()`（现为异步、会调注销 API）改为同步 `session.clearAuth()`，
    避免持死 token 再打一枪注销请求；
  - `parseApiError` 增加幂等守卫：已解析的 Error（带 code、无 response）原样返回，
    401 重放链路里 refresh 的拒绝不再被二次解析成 NETWORK_ERROR。
- **session store**：删去无用的 refreshToken 状态；新增 `login()`（成功写 token+user，
  失败原样抛 err.code/message）、`logout()`（尽力调后端注销——失败/未登录也照常清态）、
  `clearAuth()`（同步清态，供 401 兜底）。persistedstate 持久化不变（刷新页面登录态保持）。
- **LoginView**：el-form rules 校验（用户名/密码必填）、submit loading、错误 toast
  （展示后端 message，如"用户名或密码错误"）、成功后按 `?redirect=` 回跳（非法值兜底 /chat）。
  路由守卫同步升级：已登录访问 /login 重定向 /chat。
- **AppShell**：用户菜单显示登录用户名；退出登录 = `session.logout()`（API+清态）+ 跳 /login；
  顶部"组件健康"接 `GET /api/v1/system/healthz` 轮询（30s，挂载启动/卸载清理），
  绿点正常 / 灰点异常或不可达。
- **会话列表**：chat store 新增 `loadSessions()`（GET /chat/sessions，按 updated_at 倒序兜底）
  与 `createSession()`（POST /chat/sessions，置顶插入并选中）；ChatView 左栏渲染真实列表
  （标题 + 更新时间，当天 HH:mm / 跨天 MM-DD HH:mm）、"新建"按钮（loading 防重）、选中高亮；
  新增通用空态组件 `src/components/base/EmptyState.vue`。
- **测试**：`tests/unit/session.test.js`（6 例：login 写态/失败抛错、logout 调 API 清态/
  失败仍清态/未登录不调 API、clearAuth 同步清态）；`tests/unit/request-401.test.js`
  （6 例：401→refresh→重放、并发 401 单飞、refresh 失败清态跳 /login、/auth/* 401 不递归、
  _retried 防循环、非 401 直通解析）；`request.test.js` 补 parseApiError 幂等 1 例。

## 影响面

- 纯前端变更，未要求后端改动；消费既有契约：auth 三端点、healthz、chat/sessions 读写。
- session store 删 refreshToken：localStorage 旧持久化数据中的该字段无害残留，不影响运行。
- `session.logout()` 语义变更（同步清态 → 异步 API+清态）：F1 仅 AppShell 一处调用，已同步改；
  request.js 401 兜底改用新的 `clearAuth()`。

## 测试

- `npm run test`：4 文件 22 用例全过（vitest，node 环境）。
- `npm run lint`：eslint 0 error + prettier --check 全过。
- `npm run build`：vite production 构建成功（主 chunk 体积警告同 F1，element-plus 全量引入，见 F1 TODO）。
- 联调实测（`make build` + `SEMANTIC_LLM_DEFAULT=mock semantic-server serve` + `npm run dev`，
  全程走 vite 代理 :3000）：
  - healthz 公开 200 `{status:"ok"}`；
  - 错误密码 401 `AUTH_INVALID_CREDENTIALS`（"用户名或密码错误"，前端 toast 文案来源）；
  - 无 token 拉会话 401 `AUTH_TOKEN_REQUIRED`（路由守卫/request 401 链路的后端侧佐证）；
  - admin/admin123 登录 200 签发 token（server 日志"token 已签发"）；
  - 会话列表空 → POST 新建 201（server 日志"会话已创建"）→ 再拉列表返回该条目；
  - refresh 200 换新 token 且新 token 可用；logout 200（server 日志"用户已登出"）；
    注销后旧 token 再访问 401 `AUTH_TOKEN_INVALID`；
  - SPA /、/login、/chat 均 200；实测完毕 dev 与 server 进程均已停止。

## TODO（留 F3+）

- 登录态保持的浏览器端实测（localStorage persistedstate 刷新恢复）本次以 curl + 单测覆盖，
  未做真实浏览器点击验证。
- token 临近过期暂无主动 refresh（后端 TTL 24h，过期后由 401 链路兜底跳登录）。
- healthz 目前仅进程存活探活；后端 B3 接入依赖探活后，前端可扩展为多组件打点。
- ChatView 中栏消息流、右栏协作侧栏仍为 F3 占位。
