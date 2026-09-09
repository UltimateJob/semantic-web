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
  <div class="project-hub">
    <header class="hub-header">
      <div>
        <span class="eyebrow">SEMANTIC STUDIO</span>
        <h1>打开一个 Project</h1>
        <p>Project 保存 Conversation、Memory、Run、Trace 与 Studio 工作布局。</p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/settings')">全局设置</el-button>
        <el-button type="primary" :icon="Plus" @click="create">新建 Project</el-button>
      </div>
    </header>

    <el-alert
      v-if="project.isFixture"
      class="fixture-alert"
      title="当前为 v0.2 Fixture 模式：界面中的数据不是实际 Server 状态。"
      type="warning"
      show-icon
      :closable="false"
    />
    <el-alert v-if="project.error" :title="project.error" type="error" show-icon />

    <nav class="project-filter" aria-label="Project 列表范围">
      <button type="button" :class="{ active: scope === 'active' }" @click="scope = 'active'">
        进行中 <span>{{ activeProjects.length }}</span>
      </button>
      <button type="button" :class="{ active: scope === 'archived' }" @click="scope = 'archived'">
        已归档 <span>{{ archivedProjects.length }}</span>
      </button>
    </nav>

    <main v-loading="project.loading" class="project-grid">
      <article
        v-for="item in visibleProjects"
        :key="item.id"
        class="project-card"
        :class="{ active: item.is_active, archived: item.archived }"
        @dblclick="open(item)"
      >
        <div class="card-head">
          <span class="project-mark">{{ item.name?.slice(0, 1).toUpperCase() || 'P' }}</span>
          <div>
            <h2>{{ item.name }}</h2>
            <code>{{ item.id }}</code>
          </div>
          <el-tag v-if="item.is_active" size="small" type="success">活动 Project</el-tag>
          <el-tag v-else-if="item.archived" size="small" type="info">已归档</el-tag>
        </div>
        <dl>
          <div>
            <dt>工作模式</dt>
            <dd>{{ item.mode === 'running' ? '运行' : '开发' }}</dd>
          </div>
          <div>
            <dt>最近更新</dt>
            <dd>{{ formatDate(item.updated_at) }}</dd>
          </div>
          <div>
            <dt>{{ item.archived ? '归档时间' : 'Revision' }}</dt>
            <dd>{{ item.archived ? formatDate(item.archived_at) : item.revision || 0 }}</dd>
          </div>
        </dl>
        <footer v-if="!item.archived">
          <el-button size="small" @click.stop="rename(item)">重命名</el-button>
          <el-button
            v-if="!item.is_default"
            size="small"
            type="danger"
            text
            @click.stop="archive(item)"
          >
            归档
          </el-button>
          <span v-else class="protected-project">系统保留，不能归档</span>
          <el-button size="small" type="primary" @click.stop="open(item)">打开 Studio</el-button>
        </footer>
        <footer v-else class="archive-note">
          数据已保留；当前版本暂不支持恢复或打开已归档 Project。
        </footer>
      </article>
      <button v-if="scope === 'active'" type="button" class="new-project-card" @click="create">
        <Plus />
        <b>创建 Project</b>
        <span>开始新的 Agent 开发工作</span>
      </button>
      <section v-if="scope === 'archived' && visibleProjects.length === 0" class="empty-archive">
        <span>暂无已归档 Project</span>
        <small>归档后的 Project 会保留在这里，不会物理删除。</small>
      </section>
      <el-dialog v-model="createDialog" title="新建 Project" width="520px">
        <el-form label-position="top">
          <el-form-item label="Project 名称" required>
            <el-input v-model="createForm.name" placeholder="例如：拆码垛演示" />
          </el-form-item>
          <el-form-item label="默认 Runtime Profile">
            <el-select
              v-model="createForm.runtimeProfileId"
              clearable
              placeholder="暂不选择；也可加入首个场景后自动采用"
            >
              <el-option
                v-for="profile in runtimeProfiles"
                :key="profile.id"
                :value="profile.id"
                :label="`${profile.name} · ${profile.engine}/${profile.loader}`"
              />
            </el-select>
            <small class="runtime-binding-help">
              Profile 描述 Project 需要的运行能力，不固定某台机器上的 Runtime 安装。
            </small>
          </el-form-item>
          <el-form-item v-if="createForm.runtimeProfileId" label="本机启动偏好（可选）">
            <el-select
              v-model="createForm.preferredInstallationId"
              clearable
              placeholder="启动场景时再选择"
            >
              <el-option
                v-for="installation in profileInstallations"
                :key="installation.installation_id"
                :value="installation.installation_id"
                :label="installation.name || installation.installation_id"
                :disabled="!installation.enabled"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="createDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="creating"
            :disabled="!createForm.name.trim()"
            @click="confirmCreate"
          >
            创建并打开
          </el-button>
        </template>
      </el-dialog>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useProjectStore } from '@/stores/project'
import * as simulationApi from '@/api/simulation'
import { useUiStore } from '@/stores/ui'

const project = useProjectStore()
const router = useRouter()
const ui = useUiStore()
const scope = ref('active')
const activeProjects = computed(() => project.items.filter((item) => !item.archived))
const createDialog = ref(false)
const creating = ref(false)
const runtimeInstallations = ref([])
const createForm = reactive({
  name: '',
  runtimeProfileId: '',
  preferredInstallationId: ''
})
const runtimeProfiles = computed(() => {
  const profiles = new Map()
  for (const installation of runtimeInstallations.value) {
    const id = installation.profile_id
    if (!id || profiles.has(id)) continue
    profiles.set(id, {
      id,
      name: installation.name || id,
      engine: installation.engine || 'unknown',
      loader: installation.loader || 'unknown'
    })
  }
  return [...profiles.values()]
})
const profileInstallations = computed(() =>
  runtimeInstallations.value.filter((item) => item.profile_id === createForm.runtimeProfileId)
)
const archivedProjects = computed(() => project.items.filter((item) => item.archived))
const visibleProjects = computed(() =>
  scope.value === 'archived' ? archivedProjects.value : activeProjects.value
)

async function load() {
  try {
    await project.load({ includeArchived: true })
  } catch (error) {
    ui.notify({ type: 'error', message: error.message || 'Project 加载失败' })
  }
}

function create() {
  createForm.name = ''
  createForm.runtimeProfileId = ''
  createForm.preferredInstallationId = ''
  createDialog.value = true
}

async function confirmCreate() {
  creating.value = true
  try {
    const created = await project.create(createForm.name, {
      runtimeProfileId: createForm.runtimeProfileId,
      preferredInstallationId: createForm.preferredInstallationId
    })
    createDialog.value = false
    if (created) await open(created)
  } catch (error) {
    ui.notify({ type: 'error', message: error.message || 'Project 创建失败' })
  } finally {
    creating.value = false
  }
}

async function open(item) {
  if (item.archived) return
  try {
    if (!item.is_active) await project.activate(item.id)
    router.push(`/projects/${item.id}/studio`)
  } catch (error) {
    ui.notify({ type: 'error', message: error.message || 'Project 激活失败' })
  }
}

async function rename(item) {
  let value
  try {
    ;({ value } = await ElMessageBox.prompt('修改 Project 名称', '重命名', {
      inputValue: item.name,
      inputValidator: (text) => Boolean(text?.trim()) || 'Project 名称不能为空'
    }))
  } catch {
    return
  }
  try {
    await project.rename(item.id, value)
  } catch (error) {
    ui.notify({ type: 'error', message: error.message || 'Project 重命名失败' })
  }
}

async function archive(item) {
  try {
    await ElMessageBox.confirm(
      `归档 Project“${item.name}”？归档后不能继续编辑或运行；Conversation、Run、Trace 和 Artifact 数据不会被物理删除。`,
      '归档 Project',
      {
        type: 'warning',
        confirmButtonText: '归档',
        cancelButtonText: '取消'
      }
    )
    await project.archive(item.id, { includeArchived: true })
    scope.value = 'archived'
    ui.notify({ type: 'success', message: 'Project 已归档，可在“已归档”中查看' })
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ui.notify({ type: 'error', message: error.message || 'Project 归档失败' })
  }
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString('zh-CN')
}

onMounted(async () => {
  await load()
  try {
    const response = await simulationApi.listRuntimeInstallations()
    runtimeInstallations.value = response.runtime_installations || []
  } catch (error) {
    ui.notify({ type: 'warning', message: error.message || 'Runtime 安装清单加载失败' })
  }
})
</script>

<style scoped lang="scss">
.project-hub {
  height: 100%;
  padding: 32px clamp(24px, 5vw, 72px);
  overflow: auto;
  background:
    radial-gradient(
      circle at 72% -10%,
      color-mix(in srgb, var(--sf-brand) 12%, transparent),
      transparent 38%
    ),
    var(--sf-bg-primary);
}

.hub-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  max-width: 1320px;
  margin: 0 auto 28px;

  h1 {
    margin: 5px 0;
    color: var(--sf-text-primary);
    font-size: 27px;
  }

  p {
    margin: 0;
    color: var(--sf-text-secondary);
    font-size: 13px;
  }
}

.eyebrow {
  color: var(--sf-brand);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.header-actions {
  display: flex;
  gap: 9px;
}

.fixture-alert {
  max-width: 1320px;
  margin: 0 auto 16px;
}

.project-filter {
  display: flex;
  max-width: 1320px;
  gap: 6px;
  margin: 0 auto 16px;

  button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--sf-text-secondary);
    cursor: pointer;

    span {
      min-width: 19px;
      padding: 1px 5px;
      border-radius: 9px;
      background: var(--sf-bg-tertiary);
      color: var(--sf-text-disabled);
      font-size: 10px;
    }

    &:hover,
    &.active {
      background: var(--sf-brand-soft);
      color: var(--sf-brand);
    }
  }
}

.project-grid {
  display: grid;
  max-width: 1320px;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
  margin: 0 auto;
}

.project-card,
.new-project-card {
  min-height: 215px;
  padding: 20px;
  border: 1px solid var(--sf-border-light);
  border-radius: 13px;
  background: var(--sf-bg-secondary);
  box-shadow: var(--sf-shadow-sm);
}

.project-card {
  &.active {
    border-color: color-mix(in srgb, var(--sf-success) 38%, var(--sf-border));
  }

  &.archived {
    opacity: 0.82;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 24px 0 20px;
  }

  dl div {
    padding: 9px;
    border-radius: 7px;
    background: var(--sf-bg-tertiary);
  }

  dt,
  dd {
    margin: 0;
    font-size: 10px;
  }

  dt {
    color: var(--sf-text-disabled);
  }

  dd {
    margin-top: 4px;
    color: var(--sf-text-primary);
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 5px;
  }
}

.protected-project,
.archive-note {
  color: var(--sf-text-disabled);
  font-size: 10px;
}

.archive-note {
  justify-content: flex-start !important;
  line-height: 1.5;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 11px;

  > div {
    min-width: 0;
    flex: 1;
  }

  h2 {
    overflow: hidden;
    margin: 0 0 4px;
    color: var(--sf-text-primary);
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  code {
    color: var(--sf-text-disabled);
    font-size: 9px;
  }
}

.project-mark {
  display: grid;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 9px;
  background: linear-gradient(145deg, var(--sf-brand), #6c82eb);
  color: white;
  font-weight: 750;
  place-items: center;
}

.new-project-card {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  border-style: dashed;
  color: var(--sf-text-secondary);
  cursor: pointer;

  svg {
    width: 30px;
    color: var(--sf-brand);
  }

  span {
    color: var(--sf-text-disabled);
    font-size: 11px;
  }

  &:hover {
    border-color: var(--sf-brand);
    background: color-mix(in srgb, var(--sf-brand-soft) 35%, var(--sf-bg-secondary));
  }
}

.empty-archive {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 215px;
  flex-direction: column;
  gap: 7px;
  border: 1px dashed var(--sf-border-light);
  border-radius: 13px;
  color: var(--sf-text-secondary);

  small {
    color: var(--sf-text-disabled);
  }
}

@media (max-width: 760px) {
  .hub-header {
    align-items: stretch;
    flex-direction: column;
    gap: 18px;
  }
}
</style>
