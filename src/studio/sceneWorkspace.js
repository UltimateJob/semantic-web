// Copyright 2026 InsightOS
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// 恢复的是仍存在的运行现场，而不是浏览器最后打开的 Viewer 标签。
export function hasLiveScene(store) {
  if (!store.instance || store.runtimeInterrupted) return false
  if (!['running', 'paused'].includes(store.instance.state)) return false
  const snapshot = store.sceneSnapshot
  if (!snapshot) return false
  return (
    (!snapshot.instance_id || snapshot.instance_id === store.instance.instance_id) &&
    (snapshot.generation == null || snapshot.generation === store.instance.generation)
  )
}

export function sceneWorkspaceView(requested, store) {
  if (requested === 'map') return 'map'
  if (!hasLiveScene(store)) return 'setup'
  return ['setup', 'live', 'sensors'].includes(requested) ? requested : 'live'
}
