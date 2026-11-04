<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { copy } from '@/i18n/copy'
import RoleSwitch from '@/components/RoleSwitch.vue'
import AuditLogDrawer from '@/components/AuditLogDrawer.vue'
import GlobalTaskProgress from '@/components/GlobalTaskProgress.vue'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)

const menus = [
  { path: '/', label: copy.modules.home },
  { path: '/qc', label: copy.modules.qc },
  { path: '/prelabel', label: copy.modules.prelabel },
  { path: '/vla', label: copy.modules.vla },
  { path: '/train', label: copy.modules.train },
]

const selectedKeys = computed(() => {
  const p = route.path
  if (p.startsWith('/qc')) return ['/qc']
  if (p.startsWith('/prelabel')) return ['/prelabel']
  if (p.startsWith('/vla')) return ['/vla']
  if (p.startsWith('/train')) return ['/train']
  return ['/']
})

function onMenuClick(key) {
  router.push(key)
}
</script>

<template>
  <a-layout class="sc-shell">
    <a-layout-sider
      :width="210"
      :collapsed-width="64"
      collapsible
      breakpoint="lg"
      v-model:collapsed="collapsed"
      class="sc-sider"
    >
      <div class="sc-brand" @click="router.push('/')">
        <div class="sc-mark">SC</div>
        <div v-if="!collapsed" class="sc-brand-text">
          <div class="sc-name">{{ copy.productShort }}</div>
          <div class="sc-sub">StarCompute</div>
        </div>
      </div>
      <a-menu
        :selected-keys="selectedKeys"
        @menu-item-click="onMenuClick"
      >
        <a-menu-item v-for="m in menus" :key="m.path">
          {{ collapsed ? m.label.slice(0, 1) : m.label }}
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="sc-header">
        <div class="sc-header-left">
          <span class="sc-product">{{ copy.productName }}</span>
          <a-tag color="green" size="small">{{ copy.envBadge }}</a-tag>
          <span class="sc-vendor">{{ copy.vendor }}</span>
        </div>
        <div class="sc-header-right">
          <GlobalTaskProgress />
          <AuditLogDrawer />
          <RoleSwitch />
        </div>
      </a-layout-header>
      <a-layout-content class="sc-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.sc-shell {
  min-height: 100vh;
  background: #f2f3f5;
}
.sc-sider {
  background: #fff !important;
  border-right: 1px solid #e5e6eb;
}
.sc-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 14px;
  cursor: pointer;
  border-bottom: 1px solid #e5e6eb;
}
.sc-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #00b42a, #0fc6c2);
  color: #fff;
  font-weight: 800;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-name {
  font-size: 14px;
  font-weight: 700;
  color: #1d2129;
}
.sc-sub {
  font-size: 11px;
  color: #86909c;
  letter-spacing: 0.04em;
}
.sc-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
}
.sc-header-left,
.sc-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sc-product {
  font-size: 15px;
  font-weight: 700;
  color: #1d2129;
}
.sc-vendor {
  font-size: 12px;
  color: #86909c;
}
.sc-content {
  padding: 20px;
}
</style>
