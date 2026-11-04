<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  {
    path: '/train/config',
    label: '实验配置',
    match: (p) => p.startsWith('/train/config') || p === '/train',
  },
  {
    path: '/train/runner',
    label: '训练运行',
    match: (p) => p.startsWith('/train/runner'),
  },
  {
    path: '/train/metrics',
    label: '指标报表',
    match: (p) => p.startsWith('/train/metrics'),
  },
]

const selectedKeys = computed(() => [activeTab.value])
const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/train/config'
})
</script>

<template>
  <div class="train-hub">
    <div class="train-head">
      <div>
        <h2>训练实验</h2>
        <p class="sub">算法/版本/模型与超参 · GPU 算力分配 · 训练启停与数据增强 · loss/acc/mAP 曲线与报表导出</p>
      </div>
    </div>

    <a-menu mode="horizontal" :selected-keys="selectedKeys" :style="{ background: '#fff', marginBottom: '12px', borderRadius: '6px', padding: '0 8px' }" @menu-item-click="(k) => $router.push(k)">
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
