# R17 前端工具目录页（来源分组树 + 工具表格 + 统计条）

日期：2026-08-05 · 里程碑：R17（v0.1.2 技能系统）· 范围：semantic-web
（联调 semantic-server :8080，tools REST 经 vite 代理 :3000）

## 为什么

R16 后端落地工具目录只读端点（GET /api/v1/tools：builtin 组 + mcp 组，
MCP 工具含 server/health/updated_at，失联 server 的条目保留并标
unavailable——见后端 changelog `mcpregistry_inject_20260805.md`）。
本 MR 把工具目录落到 UI：左列来源分组树（内置工具 / 各 MCP server，
健康点）+ 右列该组工具表格 + 顶部统计条，让用户能看到"系统当前有哪些
工具、来自哪里、风险等级与在线状态"。全部契约以代码为准
（`internal/server/http/handlers/tools.go`、
`internal/mcpregistry/entry.go`）。

## 内容

- **tools API（`src/api/tools.js`）**：`listTools()` → GET /tools，
  响应 `{sources:[{kind(builtin|mcp), tools:[…]}]}`（builtin 组在前）；
  统一工具形状 `{name(<命名空间>.<动作>), namespace, description, risk,
  schema?, health}`，mcp 组工具另带 `server` 与 `updated_at`；内置工具
  无健康概念、health 恒为 healthy（形状统一，前端不按来源特判字段）。
- **tools store（`src/stores/tools.js`）**：
  - state：`sources[]`（原始分组快照）、`loading`/`error`（首屏）、
    `activeKey`（选中来源组：`builtin` | `mcp:<server>`）。
  - 纯函数导出（与单测同源）：
    - `groupSources(sources)`：builtin 单组（标题"内置工具"）；**mcp 组
      按 server 再拆成左列来源树分组**（server 缺省回退 namespace），组间
      按 server 名升序、组内保持服务端排序（FullName 升序）；组级
      `updatedAt` 取组内最大。
    - `healthOf(tools)`：健康聚合——任一 unavailable 即组级 unavailable
      （健康按 server 维护，正常全组一致，聚合规则兜底防御）。
    - `summarize(groups)`：总数 / 各来源（builtin|mcp）计数 / 异常
      （unavailable）计数。
  - `load()`：首屏置 loading、失败写 error 并原样抛出；**加载后选中兜
    底**——当前选中组已消失（server 下线/配置删除）则落到首个组。目录是
    慢变数据（服务端对账节奏 30s），不做轮询（与 skills 域同一从简纪律，
    与 agents 域 30s 轮询不同）。
  - `select(key)`：纯本地切换（无详情请求），右列表格随 activeGroup 联动。
- **工具目录页（`src/views/ToolsView.vue` 285 行 +
  `src/components/tools/ToolGroupTable.vue` 95 行，均 ≤300 行）**：
  - 左列：pane-header（标题 + 工具总数）+ 来源分组树（"内置"/"MCP 服务"
    两节，无 MCP server 时 MCP 节不渲染）；MCP 组带**健康点**（healthy
    绿 / unavailable 红，悬浮文案说明）；条目含名称 + 工具计数，选中高亮
    品牌色。
  - 右列顶部**统计条**：工具总数 / 内置 / MCP / 异常（异常 >0 时红色）。
  - 右列 `ToolGroupTable`（el-table）：名称（等宽）/ 描述（单行截断，
    `show-overflow-tooltip` 悬浮全文）/ **risk 徽标**（el-tag plain：
    low 灰 info / medium 蓝 primary / high 橙 warning / critical 红
    danger，el 色板已映射 --sf-* 令牌）/ 健康状态（点 + 文案：健康/失联）
    / updated_at（本地化时间，内置工具无此字段显示 `--`）；MCP 组标题旁
    附组级"目录更新于"时间。
  - 空态：无内置工具且无 MCP 条目时引导文案（内置随启动注册；MCP 经
    mcp_servers 声明后对账发现，失联保留标失联）；加载失败 toast + 页内
    el-alert（同技能库页纪律）。
- **导航与路由**：AppShell 导航在 "技能库" 之后新增 "工具"（图标
  Tools，启用态）；路由注册 `tools`（AppShell 子路由，非 public——守卫
  自动要求登录），标题 "工具"；路由文件头注释同步（R17）。

## 影响面

- 消费 R16 后端契约 GET /api/v1/tools（受保护路由，401 单飞刷新链路
  复用 request.js 既有能力）。
- AppShell 仅改导航数组一项 + Tools 图标导入；路由 +1 子路由。
- 无新增依赖（el-table/el-tag 均为 Element Plus 既有全量注册组件）。

## 测试

- `npm run test`：15 文件 129 用例全过（新增
  `tests/unit/tools-store.test.js` 13 例：load 写入+自动选中首组/
  失败抛出+error 落态/空目录空态/重新加载选中保留+消失兜底/select 联动；
  groupSources builtin 在前+mcp 按 server 拆分升序+组内保序、server 缺省
  回退 namespace+updatedAt 取最大、健康聚合、非法输入兜底；healthOf 两态；
  summarize 总数/各来源/异常计数、空分组全零、stats getter 同源）。
- `npm run lint`：eslint 0 error + prettier --check 全过。
- `npm run build`：vite production 构建成功（ToolsView 独立 chunk
  5.89 kB；主 chunk 体积警告同 F1 既有 TODO）。
- 联调实测（后端 feature/mcp-integration `make build` +
  `SEMANTIC_LLM_DEFAULT=mock` + `SEMANTIC_MCP_SERVERS` 声明 demo http
  server（go-sdk 写的 echo/weather 双工具 demo，:18082/mcp）+
  `npm run dev`，全程经 vite 代理 :3000，admin/admin123 登录取 token）：
  - GET /tools 200：**builtin 组 5 个工具**（artifact.get/put、
    system.calc/echo/time，risk 分级正确、health 恒 healthy、无
    server/updated_at 字段）——**注意**：任务描述的"内置组 8 个（含
    skill.list/skill.search）"是后端两分支合并后的形态；当前联调分支
    （feature/mcp-integration）内置注册表只有 5 个，skill.list/
    skill.search 在后端 feature/skill-system 分支（该分支无 tools
    端点），前端按 API 实际返回渲染，合并后无需改动；
  - **mcp 组 demo server 2 个工具**（demo.echo/demo.weather）：server
    字段=命名空间、risk=medium（config per-server 覆盖生效）、
    updated_at 存在（对账写入时间）；
  - **失联降级实测**：杀掉 demo MCP server 约 40s 后重查——条目保留
    （warning 不清仓）且 health=unavailable、updated_at 不变，即左树
    红点 / 统计条"异常 2" / 表格"失联"的线上数据源形态；
  - 未带 token GET /tools → 401（受保护路由佐证）；
  - vite dev 编译 ToolsView/ToolGroupTable/stores/tools/api/tools 模块
    均 200，SPA 路由 /tools 200；
  - 实测完毕本次启动的 demo-mcp / semantic-server / vite 进程均已停止
    （另发现一条更早会话遗留的 semantic-server（:28080/:28081，R12 手
    测环境变量），非本次启动、未占用 :8080，未处置）。

## TODO（留后续版本）

- 本次联调走 API 级 + vite 模块编译级验证（环境无 headless 浏览器），
  未做真实浏览器点击遍历；页面交互细节（分组选中高亮、tooltip 截断全文、
  徽标配色、空态文案）建议在验收轮补一轮手测。
- 目录无手动刷新/轮询：健康变化（对账 30s 收敛）需刷新页面感知；后续可
  加刷新按钮或接 WS 广播（本轮按慢变数据从简，同技能库页）。
- 工具参数 schema（`schema` 字段）仅透传未展示；调试向展开行（参数表
  jsonschema 渲染）随 Studio/调试页里程碑再评估。
- `mcp_servers[].namespace` 预留字段 R16 未消费（命名空间=server 名），
  前端按 server 分组已与之解耦；后端评审移除或启用后前端无需改动。
