# semantic-web

[English](README.md) | [简体中文](README.zh-CN.md)

Semantic Web is the Vue 3 + Vite frontend of Semantic Studio, and the system's only
web entry point.

The current v0.5 feature branch builds on the v0.4 simulation workbench already merged
into develop. The frontend always connects only to the Semantic Server, never directly
to Pilot, AbilityFramework, the Robot SDK, or a simulation Runtime.

## Project Structure

- `src/api/`: Server HTTP client.
- `src/components/` · `src/views/`: reusable components and pages.
- `src/stores/` · `src/router/`: state and routing.
- `src/devices/`: device display and subscriptions.
- `public/`: static assets.

## v0.5.0 Device Center

- `/devices` shows the multiple Pilots, Robots, and AbilityFrameworks managed by one Server.
- Project Studio shows Robot Execution, Stage, Action, Feedback, and Observation.
- Skill installation, Ability debugging, and Robot safety stop are all issued through the Server.
- The Web must wait for stop evidence reported by the Server and must not optimistically show stopped based on a button response.

Being able to view a Scene does not mean the Robot is executable; the device page shows each Robot Runtime's status and, when

Real product joint testing is orchestrated centrally by the Framework's
`make test-v050-real-gate`. It first builds this repository's production artifacts,
then uses `npm run test:framework:v050` against a real Server, verifying two Robots,
seven Abilities, three enabled Robot Skills, and the Execution's Stage, Action,
Feedback, Observation, Artifact, and refresh recovery. This command does not enable
Fixtures and does not connect directly to Pilot or AbilityFramework.
the Robot is not ready, it locks the execution and Ability debugging entries.

## v0.4.0 Simulation Features

- A Project stores a portable Runtime Profile; when actually starting a Scene, you pick a compatible Runtime Installation, and the local preference is remembered.
- Project Explorer manages public Scene references and multiple Project Layouts derived from native public templates.
- The Simulation activity bar shows only the current Runtime, Scene Instance, Robot, Sensors, and run records.
- Physics Viewer loads the GLB exported by the Runtime and updates live poses in Three.js over pose-stream; the Scene Editor and Semantic Map reuse the same visual content.
- Sensor Viewer shows RGB, Depth, Contact, Holding, and Robot State.
- Runtimes are started and stopped by the Framework under Project leases; the browser never runs install commands.
- Scene start, reset, Layout switching, and stable checkpoints drive deterministic Semantic Map synchronization.

## v0.2.0 Features

- Project Hub, a single active Project, and unified in-Project Studio routing.
- A Dockview workspace that can be dragged, split, floated, closed, and restored per Project.
- Conversation history, auto-naming, archiving, and Project-level WebSocket recovery.
- Image paste, drag-in, upload gating, and preview rendering.
- Agent, model service, Skill, and Tool configuration.
- Server Run status, Tool Call, SubAgent, Artifact, Interaction, and precise Trace display.
- A single Project Markdown Memory edited explicitly by the user.
- Project Snapshot, incremental events, disconnect reconciliation, and corrupted-layout fallback.

## Quick Start

```bash
npm ci
npm run dev
npm run test
npm run test:e2e
npm run test:release
npm run lint
npm run build
```

Node.js **22.12+** with npm is recommended; the project also allows Node 20 within the
version constraints. You can also copy the environment example before starting:

```bash
npm ci
cp .env.example .env
npm run dev
```

The frontend only talks to semantic-server. The HTTP and WebSocket addresses are configured by VITE_SERVER_HTTP and VITE_SERVER_WS respectively.

For a standalone frontend demo you may temporarily use `VITE_STUDIO_FIXTURES=true npm run dev`. The UI continuously shows a FIXTURE marker and this must never be enabled in production. Cross-repo joint testing connects directly to a normally started Semantic Framework and does not rely on a standalone Fixture Server.

### Joint Testing with the Official Runtime Pack

First install Semantic and a Runtime Pack built from a Plugin pinned Tag. The install
command validates the artifacts, creates an isolated uv environment, registers assets,
and runs a minimal-Scene smoke test; it does not install the Server and does not
require checking out the `plugin-mujoco` source:

```bash
semantic init
semantic runtime install native-mujoco@0.4.0 \
  --asset-root /data/semantic/mujoco-assets
semantic runtime doctor --all --smoke
SEMANTIC_ADMIN_PASSWORD=test-admin-pass semantic-server
```

Finally start the Web. After a Project is opened, the Framework Ensures the Runtime;
users do not need to run the Plugin by hand or export asset paths again:

```bash
cd /path/to/semantic-web
npm ci
VITE_SERVER_HTTP=http://127.0.0.1:8080 \
VITE_SERVER_WS=ws://127.0.0.1:8081 \
npm run dev
```

Visit `http://127.0.0.1:3000` and log in with `admin` and `SEMANTIC_ADMIN_PASSWORD`. When creating a Project, choose `Native MuJoCo`, then add a Scene from "Simulation Scenes" in Project Explorer and pick a Layout to start. The run view, sensors, and SDK debugging each open as standalone panels from the Simulation activity bar.

### Source Development Mode

Use source installation only when modifying the Plugin itself; it is marked as
`development` and cannot be used for an RC:

```bash
semantic runtime install \
  --dev-source /work/plugin-mujoco --profile native-mujoco \
  --asset-root /work/mujoco_asset \
  --scene-catalog /work/plugin-mujoco/runtime-packs/native-mujoco/catalog
semantic runtime doctor --id dev-native-mujoco --smoke
```

## CI Tiers

The pipeline is split into `ci/verify.yml` and `ci/release.yml`. Supervision is tiered
by development cadence: PR acceptance runs on the current feature branch first, and an
MR into `develop` follows once it passes. The comparison sources are the same as the
Framework's.

| Tier | When it runs | What it supervises |
|---|---|---|
| Development PR | Every `git push` on a feature branch (no merge MR opened yet) | lint, Vitest, `test:release`, gitleaks, production build |
| Merge MR | Merge Request targeting `develop` (or the default branch) | The same fast path, diffed against the target branch. Once an MR is open, branch pushes are not run again |
| Trunk | Pushes to `develop` after merging | The same fast path |
| Release | Proper SemVer tags | Fast path + packaging and uploading `dist/` |

Playwright E2E is not in CI. Use `npm run test:e2e` for local Fixtures, and
`npm run test:framework:v050` to connect to a real Server — do not mix them with
Fixtures. Cross-repo joint testing still goes through the Framework Fake Gate first,
then sets `V050_FRAMEWORK_HTTP` and `V050_FRAMEWORK_WS`.

The fast path uses domestic mirrors by default: Huawei Cloud SWR images for Docker
(`CI_IMAGE_NODE` / `CI_IMAGE_ALPINE`), npmmirror for npm, and `GITHUB_PROXY` for
GitHub release packages. These can be overridden with GitLab project variables.

## Documentation

System architecture, implementation design, user manuals, development guidelines, and
release plans spanning Framework, Web, and Pilot are maintained centrally in the
standalone [semantic-docs](https://github.com/insightos-community/semantic-docs)
repository.

This repository keeps only component contracts, generated docs, and test notes tightly
coupled to the frontend code.

## Development

- Development branches are created from develop and stay as Draft MRs until tests and user confirmation are complete.
- Commits use type(scope): with a Chinese summary.
- New components, key interactions, recovery logic, and tests must use complete Chinese comments.
- Detailed changes of the current branch go into changelog/v0.4.0/.

## Configuration and FAQ

- `VITE_SERVER_HTTP` and `VITE_SERVER_WS` are frontend build-time configuration; changing them in production requires a rebuild.
- Keep `VITE_STUDIO_FIXTURES=false` outside standalone demos and tests.
- `127.0.0.1` in a browser refers to the visitor's own computer, not the remote server. For LAN deployments, use the integrated gateway or a reachable backend address with an access policy configured.
- Do not set the WebSocket base address to the Pilot-specific `/ws/pilot`.
- A visible Scene does not mean the Robot is ready; also check the Runtime, Pilot, Bundle, and Skill status on the Server.

## Related Documents

[Detailed technical reference](README.reference.md) · [Environment configuration example](.env.example)

[CI and tag artifact releases](docs/ci-release.md)

## License

Copyright 2026 InsightOS. First-party code is licensed under [Apache-2.0](LICENSE); for
third-party components and assets, see [NOTICE](NOTICE) and the
[license scope](LICENSE_SCOPE.md).

## Reproducible Builds on Three Platforms

See the [glibc, musl, and macOS build instructions](README.build.md): pinned source
versions, actual script entry points, tool requirements, local and CI commands,
artifact locations, and platform validation scope.
