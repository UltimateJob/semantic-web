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
  <img
    ref="element"
    v-bind="$attrs"
    :src="url || undefined"
    :alt="alt"
    loading="lazy"
    @dblclick.stop="expanded = zoomEnabled"
  />
  <el-dialog v-model="expanded" :title="alt" append-to-body width="min(720px, 90vw)">
    <img :src="url" :alt="alt" style="width: 100%; object-fit: contain" />
  </el-dialog>
</template>
<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import request from '@/api/request'
defineOptions({ inheritAttrs: false })
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  zoomEnabled: { type: Boolean, default: true }
})
const element = ref(null)
const url = ref('')
const expanded = ref(false)
let observer
let visible = false
let revision = 0
function release() {
  if (url.value.startsWith('blob:')) URL.revokeObjectURL(url.value)
  url.value = ''
}
async function load() {
  const current = ++revision
  release()
  if (!visible || !props.src) return
  if (!props.src.startsWith('/simulation/scene-preview')) {
    url.value = props.src
    return
  }
  try {
    // 图片使用与目录相同的认证请求；可见卡片才读取，不把数千张图片塞入目录 JSON。
    const blob = await request.get(props.src, { responseType: 'blob' })
    if (current === revision) url.value = URL.createObjectURL(blob)
  } catch {
    /* 缺失预览保留 alt，用户可通过补全操作重试。 */
  }
}
watch(() => props.src, load)
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        visible = true
        observer.disconnect()
        load()
      }
    },
    { rootMargin: '200px' }
  )
  observer.observe(element.value)
})
onBeforeUnmount(() => {
  revision++
  observer?.disconnect()
  release()
})
</script>
