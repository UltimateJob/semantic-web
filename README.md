# Semantic Web

[English](README.md) | [简体中文](README.zh-CN.md)

🎛️ The Semantic Studio: a Vue 3 application for projects, tasks, robot state, simulation, and execution traces. It talks to Semantic Server, not directly to Robot or MuJoCo processes.

## Structure

- `src/api/` — Server HTTP clients.
- `src/components/` · `src/views/` — reusable UI and pages.
- `src/stores/` · `src/router/` — state and navigation.
- `src/devices/` — device presentation and subscriptions.
- `public/` — static assets.

## 🛠 Develop and build

Use Node.js **22.12+** and npm (the package also permits compatible Node 20 releases).

```bash
npm ci
cp .env.example .env
npm run dev
```

Start Semantic Server separately. The example connects to HTTP `http://127.0.0.1:8080` and WebSocket `ws://127.0.0.1:8081`. Open `http://127.0.0.1:3000` and log in with the administrator credentials configured on Server.

```bash
npm test
npm run build
```

The production output is `dist/`. Serve it with an HTTP server and configure the Server HTTP/WebSocket routes; quick-start's artifact installer provides the integrated gateway.

## Configuration and troubleshooting

- `VITE_SERVER_HTTP` and `VITE_SERVER_WS` are build-time frontend settings; rebuild production files after changing them.
- Keep `VITE_STUDIO_FIXTURES=false` outside isolated demos/tests.
- Browser `127.0.0.1` means the browser's machine, not a remote server. For LAN deployment use the integrated gateway or reachable backend URLs with the required access policy.
- The WebSocket base URL is not Pilot's `/ws/pilot` endpoint.
- A visible scene is not a ready Robot: verify Runtime, Pilot, Bundle, and Skill status on Server.

[Detailed technical reference](README.reference.md) · [Environment example](.env.example)

[CI and Tag releases](docs/ci-release.md)

## License

Copyright 2026 InsightOS. First-party code: [Apache-2.0](LICENSE). See [NOTICE](NOTICE) and [license scope](LICENSE_SCOPE.md) for third-party components and assets.
