<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  {
    path: '/vla/collect',
    label: 'Collect 配置',
    match: (p) => p.startsWith('/vla/collect') || p === '/vla',
  },
  {
    path: '/vla/timeline',
    label: 'Timeline 标注',
    match: (p) => p.startsWith('/vla/timeline'),
  },
  {
    path: '/vla/quality',
    label: 'Quality 质检',
    match: (p) => p.startsWith('/vla/quality'),
  },
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/vla/collect'
})

function onTabClick({ key }) {
  router.push(key)
}
</script>

<template>
  <div class="vla-hub">
    <div class="vla-head">
      <div>
        <h2>VLA Capture</h2>
        <p class="sub">Collect · timeline annotate · quality gate</p>
      </div>
    </div>

    <a-menu
      :key="activeTab"
      mode="horizontal"
      
      
      class="vla-tabs"
      :selected-keys="[activeTab]" @click="onTabClick">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>

    <-view />
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
