<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/vla/collect', label: '采集任务', match: (p) => p.startsWith('/vla/collect') || p === '/vla' },
  { path: '/vla/devices', label: '设备台账', match: (p) => p.startsWith('/vla/devices') },
  { path: '/vla/scenes', label: '场景方案', match: (p) => p.startsWith('/vla/scenes') },
  { path: '/vla/templates', label: '动作模板', match: (p) => p.startsWith('/vla/templates') },
  { path: '/vla/timeline', label: '联动标注', match: (p) => p.startsWith('/vla/timeline') },
  { path: '/vla/action-analysis', label: '序列分析', match: (p) => p.startsWith('/vla/action-analysis') },
  { path: '/vla/consistency', label: '指令一致性', match: (p) => p.startsWith('/vla/consistency') },
  { path: '/vla/quality', label: '质量门禁', match: (p) => p.startsWith('/vla/quality') },
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
        <h2>VLA 行为理解中心</h2>
        <p class="sub">采集配置 · 多模态联动 · 动作语义 · 指令一致性 · 质量门禁</p>
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
