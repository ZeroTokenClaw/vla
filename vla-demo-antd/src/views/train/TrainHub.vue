<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/train/config', label: 'Config 配置', match: (p) => p.startsWith('/train/config') || p === '/train' },
  { path: '/train/runner', label: 'Runner 运行', match: (p) => p.startsWith('/train/runner') },
  { path: '/train/metrics', label: 'Metrics 指标', match: (p) => p.startsWith('/train/metrics') },
  { path: '/train/gpus', label: 'GPU 调度', match: (p) => p.startsWith('/train/gpus') },
  { path: '/train/eval', label: '模型评测', match: (p) => p.startsWith('/train/eval') },
  { path: '/train/compare', label: '多模型对比', match: (p) => p.startsWith('/train/compare') },
  { path: '/train/lineage', label: '数据血缘', match: (p) => p.startsWith('/train/lineage') },
]

const activeTab = computed(() => tabs.find((t) => t.match(route.path))?.path || '/train/config')

function onTabClick({ key }) {
  router.push(key)
}
</script>

<template>
  <div class="train-hub">
    <div class="train-head">
      <div>
        <h2>Train Lab</h2>
        <p class="sub">Experiments · GPU · compare · lineage</p>
      </div>
    </div>
    <a-menu :key="activeTab" mode="horizontal" class="train-tabs" :selected-keys="[activeTab]" @click="onTabClick">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>
    <router-view />
  </div>
</template>

<style scoped>
.train-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
h2 {
  margin: 0;
  font-size: 20px;
}
.sub {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}
.train-tabs {
  margin-bottom: 12px;
  background: #fff;
  border-radius: 6px;
  padding: 0 8px;
}
</style>
