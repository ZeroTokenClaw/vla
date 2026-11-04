<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { copy } from '@/i18n/copy'
import {
  Monitor,
  Checked,
  MagicStick,
  VideoCamera,
  Cpu,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const menus = [
  { path: '/', label: copy.modules.home, icon: Monitor },
  { path: '/qc', label: copy.modules.qc, icon: Checked },
  { path: '/prelabel', label: copy.modules.prelabel, icon: MagicStick },
  { path: '/vla', label: copy.modules.vla, icon: VideoCamera },
  { path: '/train', label: copy.modules.train, icon: Cpu },
]

const active = computed(() => route.path)

function go(path) {
  router.push(path)
}
</script>

<template>
  <el-container class="dl-shell">
    <el-aside width="220px" class="dl-aside">
      <div class="dl-brand">
        <div class="dl-logo">数联</div>
        <div class="dl-brand-text">
          <div class="dl-name">{{ copy.productShort }}</div>
          <div class="dl-sub">DataLink Label</div>
        </div>
      </div>
      <el-menu
        :default-active="active"
        class="dl-menu"
        background-color="#001529"
        text-color="#ffffffb3"
        active-text-color="#ffffff"
        @select="go"
      >
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="dl-header" height="56px">
        <div class="dl-header-left">
          <span class="dl-product">{{ copy.productName }}</span>
          <el-tag size="small" type="warning" effect="dark" class="dl-badge">{{ copy.envBadge }}</el-tag>
        </div>
        <div class="dl-header-right">
          <el-tag type="info" effect="plain">{{ copy.roles.admin }}</el-tag>
          <span class="dl-user">demo.admin</span>
        </div>
      </el-header>
      <el-main class="dl-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.dl-shell {
  min-height: 100vh;
  background: #f0f2f5;
}
.dl-aside {
  background: #001529;
  color: #fff;
}
.dl-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 14px;
  border-bottom: 1px solid #ffffff1a;
}
.dl-logo {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: linear-gradient(135deg, #1677ff, #0958d9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}
.dl-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}
.dl-sub {
  font-size: 11px;
  color: #ffffff80;
}
.dl-menu {
  border-right: none;
}
.dl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 20px;
}
.dl-header-left,
.dl-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dl-product {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}
.dl-badge {
  margin-left: 4px;
}
.dl-user {
  color: #6b7280;
  font-size: 13px;
}
.dl-main {
  padding: 20px;
}
</style>
