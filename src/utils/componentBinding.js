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

// UI 提前解释兼容性；服务端以安装收据和真实 Robot 描述重新校验，不信任前端选择。
export function modelCompatibilityReason(model, robotModel, profile, abilities) {
  if (!(model.robot_models || []).includes(robotModel)) return '机器人型号不匹配'
  const contract = model.model_compatibility
  if (!contract) return '需重新构建以补齐兼容性声明'
  if (!(contract.runtime_profiles || []).includes(profile)) return 'Runtime 不匹配'
  const role = abilities
    .flatMap((item) => item.abilities || [])
    .find((a) => a.role === contract.role)
  if (!role || role.ability_name !== contract.ability_name) return '请先选择匹配的 Ability'
  if (!(role.model_backends || []).includes(contract.backend)) return 'Ability 尚不支持此推理后端'
  return ''
}
