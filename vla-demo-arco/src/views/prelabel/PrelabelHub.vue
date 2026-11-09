<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { path: '/prelabel/text', label: '文本预标', match: (p) => p.startsWith('/prelabel/text') || p === '/prelabel' },
  { path: '/prelabel/vision', label: '视觉预标', match: (p) => p.startsWith('/prelabel/vision') },
  { path: '/prelabel/accept', label: '验收向导', match: (p) => p.startsWith('/prelabel/accept') },
  { path: '/prelabel/jobs', label: '预标任务队列', match: (p) => p.startsWith('/prelabel/jobs') },
]

const selectedKeys = computed(() => [activeTab.value])
const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/prelabel/text'
})
</script>

<template>
  <div class="pre-hub">
    <div class="pre-head">
      <div>
        <h2>预标流水线</h2>
        <p class="sub">文本管线 · OCR/YOLO 视觉预标 · 确认→精标→质检→验收</p>
      </div>
    </div>

    <a-menu mode="horizontal" :selected-keys="selectedKeys" :style="{ background: '#fff', marginBottom: '12px', borderRadius: '6px', padding: '0 8px' }" @menu-item-click="(k) => $router.push(k)">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>

    <router-view />
  </div>
</template>

<style scoped>
.pre-head {
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
.pre-tabs {
  margin-bottom: 12px;
  background: #fff;
  border-radius: 6px;
  padding: 0 8px;
}
</style>
