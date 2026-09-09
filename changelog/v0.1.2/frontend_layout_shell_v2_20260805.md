# 布局重构 MR-A：AppShell v2（可折叠一级侧栏 + 紧凑工具密度 + 页面二级栏统一）

日期：2026-08-05 · 里程碑：布局重构（v0.1.2 技能系统周期）· 范围：semantic-web
设计依据：dev-ldm 调研结论（工具型布局骨架 + 页内二级侧栏同构 + 紧凑工具密度）

## 为什么

旧 AppShell 用 el-menu + 48px 顶栏 + Team 占位 chip，导航里混着三个长期禁用的
占位模块；各页面二级栏（Chat 会话列表 240px、Skills 左栏 280px）容器样式各自
手写、宽度不一。本 MR 按 dev-ldm 工具型布局模式统一骨架：40px 顶栏、184px/折叠
72px 自绘一级侧栏（选中态=主色圆角块）、页内二级侧栏统一容器 SideList（240px），
并把状态色收敛为 tokens 四元组。

## 内容

- **tokens.scss 扩展**（`src/styles/tokens.scss`）：
  - 密度令牌：`--sf-nav-h: 40px`（导航项/列表行高）、`--sf-sidelist-width: 240px`、
    `--sf-radius-s/m/l = 6/8/12`（旧 sm/md/lg 别名保留，存量组件不动）、
    `--sf-font-display: 18px`（字号阶梯补齐 12/13/14/16/18）。
  - 布局尺寸收紧：`--sf-nav-width 208→184px`、`--sf-nav-width-collapsed 64→72px`、
    `--sf-header-height 48→40px`。
  - **状态四元组**：`--sf-status-<name>-text/bg/border`，name ∈
    running/idle/starting/stopped/success/warning/danger（running=success 绿、
    idle=次级灰、starting=info 蓝、stopped=禁用灰；bg=12% 透明度、border=35%）。
- **AppShell v2 重写**（`src/views/AppShell.vue` 299 行，≤300）：
  - 100vh 纵向 flex：顶栏（40px）+ 主体（侧栏 + 主区 `overflow hidden`，页面自管滚动）。
  - 顶栏：品牌（S 标 + Semantic Studio）+ **面包屑**（当前功能域按路径前缀匹配
    + route.meta.title，如 Trace 页显示"对话 / Trace"）+ 右侧组件健康点
    （`.sf-status-dot` 取四元组色）+ 当前用户名。
  - 一级侧栏：五个功能域平铺（对话/Agent 设备/技能库/工具/系统设置，移除
    任务/地图/Studio 禁用占位），**自绘按钮 + element icons（不用 el-menu）**，
    选中态=主色填充圆角块；折叠后纯图标 + el-tooltip。
  - 底部次导航：帮助占位（disabled）+ 收起切换（184↔72，状态在 ui store
    `sidebarCollapsed`，pinia persistedstate 持久化 localStorage）+ **用户卡片**
    （头像占位=用户名首字母 + 用户名 + el-popover 退出登录）。
  - 健康轮询抽为 `src/composables/useHealth.js`（GET /system/healthz 30s，
    status 直接输出四元组名 success/danger/stopped）。
- **SideList 二级栏容器**（`src/components/base/SideList.vue` 140 行）：
  - 契约：slots = `title`（栏标题）/ `actions`（标题行右侧主操作）/ `search`
    （可选，有 slot 才渲染容器）/ 默认（列表主体，自滚动）/ `footer`（可选）；
    props = `width`（缺省取 `--sf-sidelist-width`）/ `collapsible`（默认 true，
    收起后变 32px 竖轨，展开即恢复；折叠态组件内本地，不持久化）。
  - 已迁移：**ChatView 会话列表**（grid 首列 240px→auto，容器交给 SideList）、
    **SkillsView 左栏**（280px→统一 240px）。页面其余内容不动。
  - ToolsView / SettingsView 左栏标 `TODO(layout-MR-B)` 后续跟进。
- **全局工具类**（`src/styles/index.scss`）：`.sf-panel`（面板底色+边框+圆角
  +内距）、`.sf-list-item`（40px 行高列表行，hover/active 两态）、
  `.sf-status-dot`（8px 状态点，`data-status` 取四元组 text 色，scss @each 生成）。

## 影响面

- 不动任何业务逻辑：store/API/路由表内容零改动（路由本就走 AppShell children）。
- 禁用占位导航（任务/地图/Studio）从侧栏移除；对应路由本就不存在，无死链。
- 旧令牌别名（--sf-radius-sm/md/lg、--sf-space-*、--sf-font-*）全部保留，
  存量页面样式不受影响；暗色主题（html.dark + 令牌）不变。
- 无新增依赖（图标全用 @element-plus/icons-vue；无全局 !important、无 min-width）。
- 偏差说明：设计稿顶栏右侧含"用户菜单"，受 300 行约束与侧栏用户卡重复，
  顶栏仅保留用户名展示，用户菜单（popover+退出）统一在侧栏底部用户卡。

## 测试

- `npm run test`：19 文件 159 用例全过（新增 9 例）：
  - `tests/unit/app-shell.smoke.test.js` 5 例：骨架渲染（品牌/五域导航/面包屑/
    健康点 data-status=success/用户卡）；选中态随路由切换 + Trace 归属对话域
    两级面包屑；点击导航项跳转；折叠切换写 ui store 且 localStorage 持久化；
    用户卡 popover 退出登录清态跳 /login（mock @/api/system、@/api/auth、
    vue3-toastify）。
  - `tests/unit/side-list.smoke.test.js` 4 例：四 slot 渲染 + 默认宽度令牌；
    折叠/展开交互；collapsible=false 无收起钮 + 无 slot 不渲染容器；
    width prop 覆盖。
- `npm run lint`：eslint 0 error + prettier --check 全过。
- `npm run build`：vite production 构建成功（AppShell 独立 chunk 3.89 kB；
  主 chunk 体积警告同 F1 既有 TODO）。

## TODO（留后续版本）

- **layout-MR-B**：ToolsView 来源树、SettingsView 分组菜单迁移到 SideList
  （SettingsView 需先把 el-menu 换成自绘列表）；AgentsView/TraceView 评估。
- SideList 折叠态目前组件内本地；如需记忆各页二级栏开合，接入 ui store 持久化。
- 状态四元组页面侧取用本轮只落了 `.sf-status-dot` 与 AppShell 健康点；
  AgentCard/CollabSidebar/ToolGroupTable 的旧状态色映射后续统一替换。
- 像素级视觉验收（折叠动画、tooltip、面包屑截断）未做真实浏览器手测，建议
  验收轮补一轮。
