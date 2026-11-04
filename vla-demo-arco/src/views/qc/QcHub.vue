<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { path: '/qc', label: '工单列表', match: (p) => p === '/qc' },
  { path: '/qc/annotate', label: '标注工作台', match: (p) => p.startsWith('/qc/annotate') },
  { path: '/qc/workflow', label: '协作看板', match: (p) => p.startsWith('/qc/workflow') },
  { path: '/qc/audit', label: '多级审核', match: (p) => p.startsWith('/qc/audit') },
  { path: '/qc/sample-check', label: '抽检回流', match: (p) => p.startsWith('/qc/sample-check') },
  { path: '/qc/spec', label: '标注规范', match: (p) => p.startsWith('/qc/spec') },
]

const selectedKeys = computed(() => [activeTab.value])
const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/qc'
})
</script>

<template>
  <div class="qc-hub">
    <div class="qc-head">
      <div>
        <h2>质控实验</h2>
        <p class="sub">实验工单 · 协作闭环 · 抽检回流 · 算力质检</p>
      </div>
    </div>

    <a-menu mode="horizontal" :selected-keys="selectedKeys" :style="{ background: '#fff', marginBottom: '12px', borderRadius: '6px', padding: '0 8px' }" @menu-item-click="(k) => $router.push(k)">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>

    <router-view />
  </div>
</template>

<style scoped>
.qc-head {
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
.qc-tabs {
  margin-bottom: 12px;
  background: #fff;
  border-radius: 6px;
  padding: 0 8px;
}
</style>
