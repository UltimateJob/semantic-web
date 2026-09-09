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
  <div class="app-shell">
    <!-- 顶栏：品牌 + 面包屑（随路由）+ 右侧动作区（组件健康点 / 当前用户） -->
    <header class="shell-topbar">
      <div class="topbar-left">
        <span class="brand"><span class="brand-mark">S</span>Semantic Studio</span>
        <nav class="breadcrumb" aria-label="当前位置">
          <template v-for="(crumb, i) in breadcrumbs" :key="crumb">
            <span v-if="i > 0">/</span>
            <span class="crumb" :class="{ 'is-current': i === breadcrumbs.length - 1 }">{{
              crumb
            }}</span>
          </template>
        </nav>
        <span class="environment-chip">LOCAL WORKSPACE</span>
      </div>
      <div class="topbar-right">
        <span class="health-chip" :title="healthTitle">
          <i class="sf-status-dot" :data-status="health.status" />组件健康 · {{ health.text }}
        </span>
        <span class="user-entry">{{ session.userName }}</span>
      </div>
    </header>

    <div class="shell-body">
      <!-- 一级侧栏：功能域平铺（自绘按钮，选中态=主色圆角块；折叠时纯图标+tooltip） -->
      <aside class="shell-nav" :class="{ 'is-collapsed': ui.sidebarCollapsed }">
        <nav class="nav-list" aria-label="主导航">
          <el-tooltip
            v-for="item in navItems"
            :key="item.path"
            :content="item.title"
            placement="right"
            :disabled="!ui.sidebarCollapsed"
          >
            <button
              type="button"
              class="nav-item"
              :class="{ 'is-active': isActive(item.path) }"
              @click="router.push(item.path)"
            >
              <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
              <span v-show="!ui.sidebarCollapsed">{{ item.title }}</span>
            </button>
          </el-tooltip>
        </nav>

        <!-- 底部次导航：帮助占位 + 收起切换（184↔72）+ 用户卡片（退出 popover） -->
        <div class="nav-footer">
          <button type="button" class="nav-item" title="帮助（待开放）" disabled>
            <el-icon class="nav-icon"><QuestionFilled /></el-icon>
            <span v-show="!ui.sidebarCollapsed">帮助</span>
          </button>
          <button type="button" class="nav-item collapse-toggle" @click="ui.toggleSidebar()">
            <el-icon class="nav-icon">
              <component :is="ui.sidebarCollapsed ? Expand : Fold" />
            </el-icon>
            <span v-show="!ui.sidebarCollapsed">收起</span>
          </button>
          <el-popover placement="top-end" trigger="click" :width="160">
            <template #reference>
              <button type="button" class="nav-item user-card">
                <span class="user-avatar">{{ userInitial }}</span>
                <span v-show="!ui.sidebarCollapsed" class="user-name">{{ session.userName }}</span>
              </button>
            </template>
            <div class="user-pop-name">{{ session.userName }}</div>
            <el-button size="small" @click="onLogout">退出登录</el-button>
          </el-popover>
        </div>
      </aside>

      <!-- 主区：不滚动，页面自管滚动 -->
      <main class="shell-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
// AppShell v2（布局重构 MR-A）：100vh 纵向 flex = 顶栏（40px）+ 主体（一级侧栏 + 主区）。
// 一级侧栏 184px/折叠 72px，自绘导航按钮（不用 el-menu），折叠状态存 ui store（持久化）；
// 面包屑 = 当前功能域（路径前缀匹配）+ route.meta.title；用户菜单在侧栏底部用户卡（popover）。
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Cpu, Expand, Files, Fold, QuestionFilled, Setting } from '@element-plus/icons-vue'
import { useHealth } from '@/composables/useHealth'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const ui = useUiStore()

const navItems = [
  { path: '/projects', title: 'Project', icon: Files },
  { path: '/devices', title: '设备', icon: Cpu },
  { path: '/settings', title: '系统设置', icon: Setting }
]

// 选中态按路径前缀匹配（/chat/:sessionId/trace/:traceId 归属"对话"域）
const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`)

const breadcrumbs = computed(() => {
  const domain = navItems.find((item) => isActive(item.path))
  const title = route.meta.title || ''
  const crumbs = domain ? [domain.title] : []
  if (title && title !== domain?.title) crumbs.push(title)
  return crumbs
})

const userInitial = computed(() => (session.userName || '?').slice(0, 1).toUpperCase())

const { health, healthTitle } = useHealth()

async function onLogout() {
  await session.logout()
  ui.notify({ type: 'info', message: '已退出登录' })
  router.push('/login')
}
</script>

<style scoped lang="scss">
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--sf-bg-secondary);
}

.topbar-left,
.topbar-right,
.brand,
.brand-mark,
.breadcrumb,
.health-chip,
.user-avatar {
  display: inline-flex;
  align-items: center;
}

.shell-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--sf-header-height);
  flex: none;
  padding: 0 14px;
  background: color-mix(in srgb, var(--sf-bg-secondary) 92%, var(--sf-bg-tertiary));
  border-bottom: 1px solid var(--sf-border-light);
}

.topbar-left,
.topbar-right {
  gap: var(--sf-space-4);
}

.brand {
  gap: var(--sf-space-2);
  font-size: var(--sf-font-lg);
  font-weight: 700;
  color: var(--sf-text-primary);
}

.brand-mark {
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(145deg, #4777ff, #284fd9);
  color: #fff;
  font-size: var(--sf-font-md);
  box-shadow: 0 6px 14px rgba(49, 92, 236, 0.24);
}

.breadcrumb,
.health-chip {
  padding: 5px 9px;
  border: 1px solid var(--sf-border-light);
  border-radius: 999px;
  background: var(--sf-bg-tertiary);
  gap: var(--sf-space-2);
  font-size: var(--sf-font-sm);
  color: var(--sf-text-secondary);
}

.environment-chip {
  padding: 3px 7px;
  border: 1px solid var(--sf-border-light);
  border-radius: 5px;
  color: var(--sf-text-disabled);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.crumb.is-current {
  color: var(--sf-text-primary);
}

.user-entry {
  font-size: var(--sf-font-sm);
  color: var(--sf-text-primary);
}

.shell-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.shell-nav {
  display: flex;
  flex-direction: column;
  width: 78px;
  flex: none;
  padding: 9px 7px;
  background: color-mix(in srgb, var(--sf-bg-tertiary) 72%, var(--sf-bg-secondary));
  border-right: 1px solid var(--sf-border-light);
  transition: width 0.2s ease;

  &.is-collapsed {
    width: 54px;

    .nav-item {
      justify-content: center;
      padding: 0;
    }
  }
}

.nav-list,
.nav-footer {
  display: flex;
  flex-direction: column;
  gap: var(--sf-space-1);
}

.nav-footer {
  margin-top: auto;
  padding-top: var(--sf-space-2);
  border-top: 1px solid var(--sf-border-light);
}

.nav-item {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  height: 52px;
  padding: 0 4px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--sf-text-secondary);
  font-size: 10px;
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(:disabled):not(.is-active) {
    background: var(--sf-bg-hover);
    color: var(--sf-text-primary);
  }

  &.is-active {
    background: var(--sf-brand-soft);
    color: var(--sf-brand);
    font-weight: 600;
    box-shadow: inset 2px 0 0 var(--sf-brand);
  }

  &:disabled {
    color: var(--sf-text-disabled);
    cursor: not-allowed;
  }
}

.user-avatar {
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--sf-brand), #6f86ec);
  color: #fff;
  font-weight: 600;
}

.nav-icon {
  font-size: 18px;
}

.user-name {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--sf-text-primary);
}

.user-pop-name {
  margin-bottom: var(--sf-space-2);
  font-weight: 600;
  color: var(--sf-text-primary);
}

.shell-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--sf-bg-primary);
}

@media (max-width: 900px) {
  .app-shell {
    height: 100vh;
  }

  .breadcrumb,
  .environment-chip,
  .health-chip {
    display: none;
  }
}
</style>
