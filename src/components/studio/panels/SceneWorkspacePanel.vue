<!--
Copyright 2026 InsightOS
SPDX-License-Identifier: Apache-2.0

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <section class="scene-workspace" data-testid="scene-workspace">
    <header class="scene-toolbar">
      <el-select
        v-model="selectedSceneId"
        placeholder="选择场景"
        size="small"
        @change="view = 'setup'"
      >
        <el-option
          v-for="item in store.projectScenes"
          :key="item.project_scene_id"
          :value="item.project_scene_id"
          :label="store.catalogById(item.catalog_scene_id)?.name || item.catalog_scene_id"
        />
      </el-select>
      <el-button size="small" :type="view === 'setup' ? 'primary' : ''" @click="view = 'setup'">
        场景配置
      </el-button>
      <el-button
        size="small"
        :disabled="!liveAvailable"
        :type="view === 'live' ? 'primary' : ''"
        @click="view = 'live'"
      >
        现场
      </el-button>
      <el-button size="small" :type="view === 'map' ? 'primary' : ''" @click="view = 'map'">
        地图
      </el-button>
      <el-button
        size="small"
        :disabled="!store.sensors.length"
        :type="view === 'sensors' ? 'primary' : ''"
        @click="view = 'sensors'"
      >
        传感器
      </el-button>
      <div class="spacer" />
      <el-button size="small" @click="ui.openSettings('simulation')">运行环境</el-button>
    </header>
    <div v-if="store.loading && !liveAvailable" class="scene-preparation-state" role="status">
      正在读取场景与运行环境…
    </div>
    <div
      v-else-if="store.error && !store.projectScenes.length"
      class="scene-preparation-state"
      role="alert"
    >
      <b>场景准备信息加载失败</b>
      <span>{{ store.error }}</span>
      <el-button size="small" @click="reloadPreparation">重试</el-button>
    </div>
    <div v-else-if="view === 'setup'" class="scene-setup">
      <div v-if="store.instance?.state === 'starting'" class="scene-notice" role="status">
        正在加载场景与 Robot…
      </div>
      <div v-else-if="store.runtimeInterrupted || store.error" class="scene-notice" role="status">
        <span>{{ store.recoveryDiagnostic || store.error }}</span>
        <el-button size="small" @click="reloadPreparation">重新连接</el-button>
      </div>
      <SceneDetailsPanel
        v-if="selectedSceneId"
        :key="selectedSceneId"
        :panel-params="{ resourceId: selectedSceneId }"
      />
      <ProjectSimulationSceneResources v-else />
    </div>
    <PhysicsViewerPanel v-else-if="view === 'live'" />
    <MapPanel v-else-if="view === 'map'" />
    <SensorViewerPanel v-else-if="view === 'sensors'" />
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { hasLiveScene, sceneWorkspaceView } from '@/studio/sceneWorkspace'
import { useSimulationStore } from '@/stores/simulation'
import { useUiStore } from '@/stores/ui'
import ProjectSimulationSceneResources from '@/components/studio/ProjectSimulationSceneResources.vue'
import SceneDetailsPanel from './SceneDetailsPanel.vue'

const props = defineProps({ panelParams: { type: Object, default: () => ({}) } })
const store = useSimulationStore()
const ui = useUiStore()
const selectedSceneId = ref('')
const liveAvailable = computed(() => hasLiveScene(store))
const view = ref(sceneWorkspaceView('', store))
const PhysicsViewerPanel = defineAsyncComponent(() => import('./PhysicsViewerPanel.vue'))
const MapPanel = defineAsyncComponent(() => import('./MapPanel.vue'))
const SensorViewerPanel = defineAsyncComponent(() => import('./SensorViewerPanel.vue'))
async function reloadPreparation() {
  try {
    await store.hydrate(store.projectId)
  } catch {
    /* 具体错误由 Store 原位展示。 */
  }
}

watch(
  () => [props.panelParams.resourceId, store.projectScenes],
  () => {
    const requested = props.panelParams.resourceId
    if (requested && store.projectScenes.some((item) => item.project_scene_id === requested)) {
      selectedSceneId.value = requested
    } else if (
      !store.projectScenes.some((item) => item.project_scene_id === selectedSceneId.value)
    ) {
      selectedSceneId.value =
        store.projectScenes.find(
          (item) => item.catalog_scene_id === store.instance?.catalog_scene_id
        )?.project_scene_id ||
        store.projectScenes[0]?.project_scene_id ||
        ''
    }
  },
  { immediate: true }
)
watch(
  () => props.panelParams,
  ({ viewMode: mode }) => {
    if (mode) view.value = sceneWorkspaceView(mode, store)
  },
  { immediate: true }
)
// 同一个现场窗口跟随实例生命周期；新一轮启动不会创建新的 Editor。
watch([() => store.instance?.instance_id, () => liveAvailable.value], ([, available], previous) => {
  if (available && !previous?.[1]) view.value = 'live'
  else if (!available && view.value !== 'map') view.value = 'setup'
})
</script>

<style scoped>
.scene-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.scene-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid var(--sf-border-light);
}
.scene-toolbar .el-select {
  width: 190px;
}
.scene-toolbar .el-button + .el-button {
  margin-left: 0;
}
.spacer {
  flex: 1;
}
.scene-setup {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.scene-preparation-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  color: var(--sf-text-secondary);
}
.scene-setup > .simulation-resources {
  padding: 16px;
}
.scene-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 16px 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--sf-bg-tertiary);
  color: var(--sf-text-secondary);
  font-size: 13px;
}
.scene-workspace > :not(.scene-toolbar) {
  flex: 1;
  min-height: 0;
}
</style>
