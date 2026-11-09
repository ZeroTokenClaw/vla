<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/analytics/profile', label: '数据画像', match: (p) => p.startsWith('/analytics/profile') || p === '/analytics' },
  { path: '/analytics/quality', label: '质量评分', match: (p) => p.startsWith('/analytics/quality') },
  { path: '/analytics/anomaly', label: '异常分析', match: (p) => p.startsWith('/analytics/anomaly') },
]

const activeTab = computed(() => tabs.find((t) => t.match(route.path))?.path || '/analytics/profile')
function onTabClick({ key }) {
  router.push(key)
}
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h2>Analytics</h2>
        <p class="sub">数据画像 · 质量评分卡 · 异常分析（Demo Fake Data）</p>
      </div>
    </div>
    <a-menu mode="horizontal" class="tabs" :selected-keys="[activeTab]" @click="onTabClick">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>
    <router-view />
  </div>
</template>

<style scoped>
.head { margin-bottom: 8px; }
h2 { margin: 0; font-size: 20px; }
.sub { margin: 6px 0 0; color: #6b7280; font-size: 13px; }
.tabs { margin-bottom: 12px; background: #fff; border-radius: 6px; padding: 0 8px; }
</style>
