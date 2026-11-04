<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/prelabel/text', label: '文本预标', match: (p) => p.startsWith('/prelabel/text') || p === '/prelabel' },
  { path: '/prelabel/vision', label: '视觉预标', match: (p) => p.startsWith('/prelabel/vision') },
  { path: '/prelabel/accept', label: '验收向导', match: (p) => p.startsWith('/prelabel/accept') }
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/prelabel/text'
})

function onTab(path) {
  router.push(path)
}
</script>

<template>
  <div class="hub">
    <div class="hub-head">
      <div>
        <h2>预标引擎</h2>
        <p class="sub">文本管线 · OCR/YOLO · 确认→精标→质检→验收</p>
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

