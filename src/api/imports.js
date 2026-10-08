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

import request from './request'

const base = (projectId) => `/projects/${encodeURIComponent(projectId)}/imports`

export const listImports = (projectId) => request.get(base(projectId))
export const scanImports = (projectId) =>
  request.post(`${base(projectId)}/scan`, null, { timeout: 120000 })
export const retryImport = (projectId, id) =>
  request.post(`${base(projectId)}/${encodeURIComponent(id)}/retry`, null, { timeout: 120000 })
export const uploadImport = (projectId, file) =>
  request.post(base(projectId), file, {
    params: { filename: file.name },
    headers: { 'Content-Type': 'application/zip' },
    timeout: 1800000
  })

export const installImport = (projectId, id, options) =>
  request.post(`${base(projectId)}/${encodeURIComponent(id)}/install`, options)
export const cancelInstallation = (projectId, id) =>
  request.post(`${base(projectId)}/${encodeURIComponent(id)}/cancel`)
export const componentVersions = (projectId) =>
  request.get(`/projects/${encodeURIComponent(projectId)}/components`)
export const bindComponents = (projectId, selection) =>
  request.post(`/projects/${encodeURIComponent(projectId)}/components/bind`, selection)
export const applyComponents = (projectId, robotId) =>
  request.post(
    `/projects/${encodeURIComponent(projectId)}/components/apply`,
    { robot_id: robotId },
    { timeout: 240000 }
  )
export const removeComponent = (projectId, id) =>
  request.delete(`/projects/${encodeURIComponent(projectId)}/components/${encodeURIComponent(id)}`)
export const rollbackComponents = (projectId, robotId, revision) =>
  request.post(`/projects/${encodeURIComponent(projectId)}/components/rollback`, {
    robot_id: robotId,
    revision
  })
