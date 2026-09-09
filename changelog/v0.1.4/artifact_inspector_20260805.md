# Artifact 工作台检查器

日期：2026-08-05

## 变更

- 对话右侧 Artifact 检查器改为读取持久化资源列表，不再只从当前消息临时汇总图片。
- 支持将当前 Project workspace 中的相对路径显式登记为 Artifact，并可填写资源摘要。
- Artifact 卡片展示媒体类型、大小和工作区来源；图片通过鉴权 API 按需获取并支持预览，普通文件仅在下载时读取本体。
- 支持删除未引用 Artifact；已被消息引用时提示用户保留，或二次确认后仅强制删除文件本体并保留历史缺失标记。
- 修正图片 Blob URL 的异步代次管理，避免请求成功后仍停留在加载状态，并在切换资源或卸载组件时及时释放内存。

## 验证

- Artifact Store 单测覆盖列表、显式登记、普通删除与强制删除。
- Artifact 卡片单测覆盖鉴权读取、图片预览和 Blob URL 释放。
- ChatView 冒烟测试覆盖 Artifact 分栏、持久化列表和工作区登记入口。
- `npm test -- --run tests/unit/artifacts-store.test.js tests/unit/artifact-card.test.js tests/unit/chat-view.smoke.test.js`
