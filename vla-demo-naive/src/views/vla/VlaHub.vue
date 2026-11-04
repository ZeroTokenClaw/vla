<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/vla/collect', label: '采集配置', match: (p) => p.startsWith('/vla/collect') || p === '/vla' },
  { path: '/vla/timeline', label: '时间轴标注', match: (p) => p.startsWith('/vla/timeline') },
  { path: '/vla/quality', label: '样本质检', match: (p) => p.startsWith('/vla/quality') }
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/vla/collect'
})

function onTab(path) {
  router.push(path)
}
</script>

<template>
  <div class="hub">
    <div class="hub-head">
      <div>
        <h2>采集台</h2>
        <p class="sub">会话配置 · 关键帧时间轴 · 动作片段 · 样本质检</p>
      </div>
    </div>

    <n-tabs class="hub-tabs" type="segment" :value="activeTab" @update:value="onTab">
      <n-tab-pane v-for="t in tabs" :key="t.path" :name="t.path" :tab="t.label" />
    </n-tabs>

    <router-view />
  </div>
</template>

<style scoped>
.hub-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
h2 { margin:0; font-size:20px; color:#e8e8ed; }
.sub { margin:6px 0 0; color:#8b8b97; font-size:13px; }
.hub-tabs { margin-bottom:14px; }
</style>

