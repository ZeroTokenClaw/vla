<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { path: '/prelabel/text', label: '文本预标', match: (p) => p.startsWith('/prelabel/text') || p === '/prelabel' },
  { path: '/prelabel/vision', label: '视觉预标', match: (p) => p.startsWith('/prelabel/vision') },
  { path: '/prelabel/accept', label: '验收向导', match: (p) => p.startsWith('/prelabel/accept') },
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/prelabel/text'
})
</script>

<template>
  <div class="pre-hub">
    <div class="pre-head">
      <div>
        <h2>智能预标</h2>
        <p class="sub">文本管线 · OCR/YOLO 视觉预标 · 确认→精标→质检→验收</p>
      </div>
    </div>

    <el-menu
      :key="activeTab"
      mode="horizontal"
      :ellipsis="false"
      router
      class="pre-tabs"
      :default-active="activeTab"
    >
      <el-menu-item v-for="t in tabs" :key="t.path" :index="t.path">{{ t.label }}</el-menu-item>
    </el-menu>

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
