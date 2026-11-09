<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/qc', label: '会话列表', match: (p) => p === '/qc' },
  { path: '/qc/annotate', label: '标注工作台', match: (p) => p.startsWith('/qc/annotate') },
  { path: '/qc/workflow', label: '协作看板', match: (p) => p.startsWith('/qc/workflow') },
  { path: '/qc/audit', label: '多级审核', match: (p) => p.startsWith('/qc/audit') },
  { path: '/qc/sample-check', label: '抽检回流', match: (p) => p.startsWith('/qc/sample-check') },
  { path: '/qc/spec', label: '标注规范', match: (p) => p.startsWith('/qc/spec') }
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/qc'
})

function onTab(path) {
  router.push(path)
}
</script>

<template>
  <div class="hub">
    <div class="hub-head">
      <div>
        <h2>多模态数据分析与标注中心</h2>
        <p class="sub">五模态标注 · 协作审核 · 抽检回流 · 与画像/异常分析联动</p>
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

