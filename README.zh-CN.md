# Semantic Web

[English](README.md) | [简体中文](README.zh-CN.md)

🎛️ Semantic Studio：基于 Vue 3 的项目、任务、机器人状态、仿真与执行追踪界面。前端连接 Semantic Server，不直接连接 Robot 或 MuJoCo 进程。

## 工程结构

- `src/api/`：Server HTTP 客户端。
- `src/components/` · `src/views/`：复用组件与页面。
- `src/stores/` · `src/router/`：状态与路由。
- `src/devices/`：设备展示与订阅。
- `public/`：静态资源。

## 🛠 开发与构建

建议使用 Node.js **22.12+** 与 npm；项目也允许满足版本约束的 Node 20。

```bash
npm ci
cp .env.example .env
npm run dev
```

另行启动 Semantic Server。示例连接 HTTP `http://127.0.0.1:8080` 和 WebSocket `ws://127.0.0.1:8081`。访问 `http://127.0.0.1:3000`，使用 Server 配置的管理员凭据登录。

```bash
npm test
npm run build
```

生产产物为 `dist/`，需要通过 HTTP 服务托管并配置 Server HTTP / WebSocket 路由；quick-start 的制品安装器已提供集成网关。

## 配置与常见问题

- `VITE_SERVER_HTTP`、`VITE_SERVER_WS` 是前端构建期配置，生产环境修改后需要重新构建。
- 独立演示与测试以外保持 `VITE_STUDIO_FIXTURES=false`。
- 浏览器中的 `127.0.0.1` 指访问者电脑，而非远端服务器。局域网部署请使用集成网关，或可达且配置了访问策略的后端地址。
- WebSocket 基地址不要填写 Pilot 专用的 `/ws/pilot`。
- 场景可见不代表 Robot 就绪；还需检查 Server 上的 Runtime、Pilot、Bundle 与 Skill 状态。

[详细技术参考](README.reference.md) · [环境配置示例](.env.example)

## 许可证

Copyright 2026 InsightOS。自有代码采用 [Apache-2.0](LICENSE)；第三方组件与资产请查看 [NOTICE](NOTICE) 和[许可范围](LICENSE_SCOPE.md)。
