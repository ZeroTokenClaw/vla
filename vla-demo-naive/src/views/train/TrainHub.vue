<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/train/config', label: '实验配置', match: (p) => p.startsWith('/train/config') || p === '/train' },
  { path: '/train/runner', label: '训练运行', match: (p) => p.startsWith('/train/runner') },
  { path: '/train/metrics', label: '指标报表', match: (p) => p.startsWith('/train/metrics') }
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/train/config'
})

function onTab(path) {
  router.push(path)
}
</script>

<template>
  <div class="hub">
    <div class="hub-head">
      <div>
        <h2>训练核</h2>
        <p class="sub">算法版本 · GPU 算力 · 指标曲线与报表</p>
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

