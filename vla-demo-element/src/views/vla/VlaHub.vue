<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  {
    path: '/vla/collect',
    label: '采集配置',
    match: (p) => p.startsWith('/vla/collect') || p === '/vla',
  },
  {
    path: '/vla/timeline',
    label: '时间轴标注',
    match: (p) => p.startsWith('/vla/timeline'),
  },
  {
    path: '/vla/quality',
    label: '样本质检',
    match: (p) => p.startsWith('/vla/quality'),
  },
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/vla/collect'
})
</script>

<template>
  <div class="vla-hub">
    <div class="vla-head">
      <div>
        <h2>具身采集标注</h2>
        <p class="sub">采集任务配置 · 多模态联动浏览与动作起止帧 · 样本质检过滤 · JSON/Excel/CSV 导出</p>
      </div>
    </div>

    <el-menu
      :key="activeTab"
      mode="horizontal"
      :ellipsis="false"
      router
      class="vla-tabs"
      :default-active="activeTab"
    >
      <el-menu-item v-for="t in tabs" :key="t.path" :index="t.path">{{ t.label }}</el-menu-item>
    </el-menu>

    <router-view />
  </div>
</template>

<style scoped>
.vla-head {
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
.vla-tabs {
  margin-bottom: 12px;
  background: #fff;
  border-radius: 6px;
  padding: 0 8px;
}
</style>
