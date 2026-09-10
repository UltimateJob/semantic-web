#!/usr/bin/env bash
# Copyright 2026 InsightOS
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
npm ci
npm test -- --maxWorkers=2 --minWorkers=1
VITE_STUDIO_FIXTURES=false VITE_DEVICE_FIXTURES=false npm run build
test -s dist/index.html
