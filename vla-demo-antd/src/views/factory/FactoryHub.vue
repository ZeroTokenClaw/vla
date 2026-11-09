<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/factory/dashboard', label: '驾驶舱', match: (p) => p.startsWith('/factory/dashboard') || p === '/factory' },
  { path: '/factory/tasks', label: '生产任务', match: (p) => p.startsWith('/factory/tasks') },
  { path: '/factory/workflows', label: '流程编排', match: (p) => p.startsWith('/factory/workflows') },
  { path: '/factory/monitor', label: '执行监控', match: (p) => p.startsWith('/factory/monitor') },
]

const activeTab = computed(() => tabs.find((t) => t.match(route.path))?.path || '/factory/dashboard')

function onTabClick({ key }) {
  router.push(key)
}
</script>

<template>
  <div class="factory-hub">
    <div class="head">
      <div>
        <h2>Data Factory</h2>
        <p class="sub">生产任务 · 可执行流水线编排 · 运行监控（Demo Fake Data）</p>
      </div>
      <a-tag color="blue">Pipeline Core</a-tag>
    </div>
    <a-menu :key="activeTab" mode="horizontal" class="tabs" :selected-keys="[activeTab]" @click="onTabClick">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>
    <router-view />
  </div>
</template>

<style scoped>
.head {
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
.tabs {
  margin-bottom: 12px;
  background: #fff;
  border-radius: 6px;
  padding: 0 8px;
}
</style>
