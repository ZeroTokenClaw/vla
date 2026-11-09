<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/train/config', label: '训练配置', match: (p) => p.startsWith('/train/config') || p === '/train' },
  { path: '/train/runner', label: '训练监控', match: (p) => p.startsWith('/train/runner') },
  { path: '/train/metrics', label: '指标报表', match: (p) => p.startsWith('/train/metrics') },
  { path: '/train/gpus', label: '算力监控', match: (p) => p.startsWith('/train/gpus') },
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
        <h2>算法训练与模型评测中心</h2>
        <p class="sub">
          训练配置 / 监控 / 报表 ·
          <a class="link" @click="router.push('/eval/models')">算法模型</a> ·
          <a class="link" @click="router.push('/eval/compare')">多模型对比</a> ·
          <a class="link" @click="router.push('/lineage')">血缘追溯</a>
        </p>
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
.link { color:#63e2b7; cursor:pointer; margin:0 2px; }
.hub-tabs { margin-bottom:14px; }
</style>
