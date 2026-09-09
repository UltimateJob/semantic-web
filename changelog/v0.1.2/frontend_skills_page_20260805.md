# R11 前端技能库页（清单分组 + 详情渲染 + 空态引导）

日期：2026-08-05 · 里程碑：R11（v0.1.2 技能系统）· 范围：semantic-web
（联调 semantic-server :8080，skills REST 经 vite 代理 :3000）

## 为什么

R9/R10 后端已落地技能系统（SKILL.md 加载、skill store 热更、内核渐进披露
注入），R11 后端补齐只读数据面（GET /api/v1/skills 清单 +
GET /api/v1/skills/{name} 详情，见后端 changelog
`skills_rest_20260805.md`）。本 MR 把技能库落到 UI：左栏 category 分组
清单 + 右栏详情（frontmatter 字段表 + 正文 markdown 渲染），让用户能看到
"系统当前有哪些技能、技能指导内容是什么"。全部契约以代码为准
（`internal/server/http/handlers/skills.go`、`internal/skill/skill.go`）。

## 内容

- **skills API（`src/api/skills.js`）**：`listSkills()` → GET /skills，
  响应 `{skills:[{name, category, description, when_to_use}]}`（服务端
  已按 category 分组排序，清单不含正文）；`getSkill(name)` →
  GET /skills/{name}（name 经 encodeURIComponent），响应 `{skill:{…,
  body, extensions?}}`。
- **skills store（`src/stores/skills.js`）**：
  - state：`skills[]`（清单快照）、`loading`/`error`（首屏清单）、
    `activeName`（选中项）、`detail`/`detailLoading`/`detailError`（详情）。
  - `load()`：首屏置 loading、失败写 error 并原样抛出；**重新加载清空
    选中与详情**（避免详情与清单快照不一致）。技能是慢变数据（服务端
    热更颗粒度为文件变更），不做轮询——与 agents 域的 30s 轮询不同。
  - `select(name)`：**选中态立即切换**（左栏高亮不等待网络），详情按需
    拉取；同名重复点选不重复请求；**慢响应竞态防护**——返回时选中项已
    切换则丢弃过期详情；失败写 detailError 由右栏展示（不抛错轰炸）。
  - 纯函数导出（与单测同源）：`groupSkills(skills)` 按 category 保序
    分组（排序由服务端负责），缺省 category 回填 general。
- **技能库页（`src/views/SkillsView.vue` 132 行 +
  `src/components/skills/SkillList.vue` 89 行 +
  `src/components/skills/SkillDetail.vue` 199 行，均 ≤300 行）**：
  - 左栏 `SkillList`：pane-header（标题 + 技能计数）+ category 分组
    清单（组标题 + 名称/描述摘要单行省略 + description title 悬浮全文 +
    选中高亮品牌色）。
  - 右栏 `SkillDetail`：frontmatter 字段表（name/category 标签/
    description/when_to_use + **扩展字段透传**：键名升序、值 JSON 缩进
    渲染、字符串原样）+ 正文 markdown 渲染——**安全纪律同
    MessageBubbleText：html 只能来自 `renderMarkdown`**（markdown-it
    禁内联 HTML + DOMPurify 白名单消毒），排版样式同一套令牌约定。
  - 首屏 `load` 后**自动选中清单首个技能**；清单失败 toast + 页内
    el-alert；**空态**（无技能形态）引导文案：将 SKILL.md 放入服务端
    skills.dir（默认 configs/skills）后刷新，并说明技能是上下文增强项、
    未配置时服务端按无技能形态运行。
- **导航与路由**：AppShell 导航在 "Agent 设备" 之后新增 "技能库"
  （图标 Collection，启用态）；路由注册 `skills`（AppShell 子路由，
  非 public——守卫自动要求登录），标题 "技能库"；路由文件头注释同步。

## 影响面

- 消费本 MR 同轮交付的后端契约 GET /api/v1/skills[/name]（受保护路由）。
- AppShell 仅改导航数组一项 + Collection 图标导入；路由 +1 子路由。
- 无新增依赖（markdown-it/DOMPurify/highlight.js 均为 F1 既有管线）。

## 测试

- `npm run test`：13 文件 96 用例全过（新增
  `tests/unit/skills-store.test.js` 10 例：load 写入/groups 分组/
  首屏失败抛出+error 落态/空清单空态/重新加载清选中详情、groupSkills
  保序分组+缺省 category 回填+空数组、select 选中即切+详情写入/
  同名不重复请求/404 detailError 落态/慢响应竞态丢弃过期详情）。
- `npm run lint`：eslint 0 error + prettier --check 全过。
- `npm run build`：vite production 构建成功（SkillsView 独立 chunk
  5.34 kB；主 chunk 体积警告同 F1 既有 TODO）。
- 联调实测（后端 `make build` + `SEMANTIC_LLM_DEFAULT=mock
  semantic-server serve` + `npm run dev`，全程经 vite 代理 :3000，
  admin/admin123 登录取 token）：
  - GET /skills 200：**两个种子技能齐全**——artifact-usage、echo-guide
    （general 组内 name 升序），条目仅四标准字段无 body；
  - GET /skills/echo-guide 200：frontmatter 四字段 + body 原文完整
    （点选后右栏渲染的数据源即此响应；markdown 渲染管线有
    markdown.test.js 单测覆盖）；
  - 未带 token GET /skills 与 GET /skills/echo-guide → 均 401
    `AUTH_TOKEN_REQUIRED`（受保护路由佐证）；
  - GET /skills/no-such → 404 `SKILL_NOT_FOUND`（detailError 分支的
    线上形态）；
  - vite dev 编译 SkillsView/SkillList/SkillDetail/stores/skills/
    api/skills 模块均 200，SPA 路由 /skills 200；
  - 实测完毕 dev 与 server 进程均已停止。

## TODO（留后续版本）

- 本次联调走 API 级 + vite 模块编译级验证（环境无 headless 浏览器），
  未做真实浏览器点击遍历；页面交互细节（选中高亮、markdown 排版、
  空态文案）建议在验收轮补一轮手测。
- 技能清单无搜索/过滤：技能量为几十量级，量级增长后再评估（左栏结构
  已按分组组织，加过滤框是小改）。
- 技能热更后的 UI 感知：当前需手动刷新页面重新 load；后续可接
  WS agent-events 或加手动刷新按钮（本轮按慢变数据从简）。
- 扩展字段值固定 JSON 缩进渲染；具身扩展字段（goal/safety_rules 等）
  语义化展示随 Phase 3 消费方落地再评估。
