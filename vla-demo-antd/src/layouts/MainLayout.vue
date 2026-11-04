<script setup>
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { copy } from '@/i18n/copy'
import RoleSwitch from '@/components/RoleSwitch.vue'
import AuditLogDrawer from '@/components/AuditLogDrawer.vue'
import {
  HomeOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
  ExperimentOutlined,
} from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()

const menus = [
  { path: '/', label: copy.modules.home, icon: HomeOutlined },
  { path: '/qc', label: copy.modules.qc, icon: SafetyCertificateOutlined },
  { path: '/prelabel', label: copy.modules.prelabel, icon: ThunderboltOutlined },
  { path: '/vla', label: copy.modules.vla, icon: VideoCameraOutlined },
  { path: '/train', label: copy.modules.train, icon: ExperimentOutlined },
]

const selectedKeys = computed(() => {
  const p = route.path
  if (p.startsWith('/qc')) return ['/qc']
  if (p.startsWith('/prelabel')) return ['/prelabel']
  if (p.startsWith('/vla')) return ['/vla']
  if (p.startsWith('/train')) return ['/train']
  return ['/']
})

function onMenuClick({ key }) {
  router.push(key)
}
</script>

<template>
  <a-layout class="orn-shell">
    <a-layout-header class="orn-top">
      <div class="orn-brand" @click="router.push('/')">
        <div class="orn-mark">OR</div>
        <div>
          <div class="orn-name">{{ copy.productName }}</div>
          <div class="orn-vendor">{{ copy.vendor }} · Annotation Cloud</div>
        </div>
      </div>
      <a-menu
        mode="horizontal"
        theme="light"
        class="orn-menu"
        :selected-keys="selectedKeys"
        :items="menus.map((m) => ({ key: m.path, icon: () => h(m.icon), label: m.label }))"
        @click="onMenuClick"
      />
      <div class="orn-top-right">
        <a-tag color="blue">{{ copy.envBadge }}</a-tag>
        <AuditLogDrawer />
        <RoleSwitch />
      </div>
    </a-layout-header>
    <a-layout-content class="orn-content">
      <router-view />
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.orn-shell {
  min-height: 100vh;
  background: #f5f7fb;
}
.orn-top {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 64px;
  padding: 0 20px;
  background: #ffffff;
  border-bottom: 1px solid #e8edf5;
  line-height: 64px;
}
.orn-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-width: 180px;
  line-height: 1.2;
}
.orn-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1677ff, #69b1ff);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.orn-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.orn-vendor {
  font-size: 11px;
  color: #94a3b8;
}
.orn-menu {
  flex: 1;
  min-width: 0;
  border-bottom: none !important;
  background: transparent;
}
.orn-top-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.orn-content {
  padding: 20px 24px 32px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
}
</style>
