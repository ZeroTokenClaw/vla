<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/system/models', label: '模型服务', match: (p) => p.startsWith('/system/models') },
  { path: '/system/datasets', label: '数据集', match: (p) => p.startsWith('/system/datasets') },
  { path: '/system/export', label: '数据导出', match: (p) => p.startsWith('/system/export') },
  { path: '/system/users', label: '用户权限', match: (p) => p.startsWith('/system/users') },
  { path: '/system/logs', label: '系统日志', match: (p) => p.startsWith('/system/logs') },
]

const activeTab = computed(() => tabs.find((t) => t.match(route.path))?.path || '/system/models')
function onTabClick({ key }) {
  router.push(key)
}
</script>

<template>
  <div>
    <div class="head">
      <div>
        <h2>System</h2>
        <p class="sub">模型注册 · 导出中心 · 权限 · 审计日志（伪造数据）</p>
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
