<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/vla/collect', label: 'Collect 配置', match: (p) => p.startsWith('/vla/collect') || p === '/vla' },
  { path: '/vla/scenes', label: '场景方案', match: (p) => p.startsWith('/vla/scenes') },
  { path: '/vla/templates', label: '动作模板', match: (p) => p.startsWith('/vla/templates') },
  { path: '/vla/devices', label: '采集设备', match: (p) => p.startsWith('/vla/devices') },
  { path: '/vla/timeline', label: 'Timeline 标注', match: (p) => p.startsWith('/vla/timeline') },
  { path: '/vla/quality', label: 'Quality 质检', match: (p) => p.startsWith('/vla/quality') },
  { path: '/vla/exceptions', label: '异常处理', match: (p) => p.startsWith('/vla/exceptions') },
  { path: '/vla/action-analysis', label: '动作分析', match: (p) => p.startsWith('/vla/action-analysis') },
  { path: '/vla/consistency', label: '指令一致性', match: (p) => p.startsWith('/vla/consistency') },
]

const activeTab = computed(() => tabs.find((t) => t.match(route.path))?.path || '/vla/collect')

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
    <a-menu :key="activeTab" mode="horizontal" class="vla-tabs" :selected-keys="[activeTab]" @click="onTabClick">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>
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
