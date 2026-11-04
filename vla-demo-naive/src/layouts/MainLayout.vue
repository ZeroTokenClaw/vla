<script setup>
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon } from 'naive-ui'
import { copy } from '@/i18n/copy'
import RoleSwitch from '@/components/RoleSwitch.vue'
import ConsoleStrip from '@/components/ConsoleStrip.vue'
import { useAuditStore } from '@/stores/audit'

const route = useRoute()
const router = useRouter()
const audit = useAuditStore()
const collapsed = ref(false)

const menus = [
  { path: '/', label: copy.modules.home, iconText: '◎' },
  { path: '/qc', label: copy.modules.qc, iconText: '▣' },
  { path: '/prelabel', label: copy.modules.prelabel, iconText: '⚡' },
  { path: '/vla', label: copy.modules.vla, iconText: '▶' },
  { path: '/train', label: copy.modules.train, iconText: '◈' },
]

const active = computed(() => {
  const p = route.path
  if (p.startsWith('/qc')) return '/qc'
  if (p.startsWith('/prelabel')) return '/prelabel'
  if (p.startsWith('/vla')) return '/vla'
  if (p.startsWith('/train')) return '/train'
  return '/'
})

const menuOptions = computed(() =>
  menus.map((m) => ({
    label: collapsed.value ? m.iconText : m.label,
    key: m.path,
    icon: collapsed.value
      ? undefined
      : () => h('span', { class: 'lm-rail-ico' }, m.iconText),
  })),
)

function onMenuUpdate(key) {
  router.push(key)
}
</script>

<template>
  <div class="lm-shell">
    <aside class="lm-rail" :class="{ collapsed }">
      <div class="lm-brand" @click="router.push('/')">
        <div class="lm-mark">LM</div>
        <div v-if="!collapsed" class="lm-brand-text">
          <div class="lm-name">{{ copy.productShort }}</div>
          <div class="lm-sub">VLA Studio</div>
        </div>
      </div>
      <n-menu
        :value="active"
        :collapsed="collapsed"
        :collapsed-width="64"
        :options="menuOptions"
        @update:value="onMenuUpdate"
      />
      <button class="lm-collapse" type="button" @click="collapsed = !collapsed">
        {{ collapsed ? '»' : '«' }}
      </button>
    </aside>
    <div class="lm-main-col">
      <header class="lm-top">
        <div class="lm-top-left">
          <span class="lm-product">{{ copy.productName }}</span>
          <n-tag size="small" type="success" :bordered="false">{{ copy.envBadge }}</n-tag>
          <span class="lm-vendor">{{ copy.vendor }}</span>
        </div>
        <div class="lm-top-right">
          <n-tag size="small" :bordered="false" type="info">
            console {{ audit.entries.length }}
          </n-tag>
          <RoleSwitch />
        </div>
      </header>
      <main class="lm-content">
        <router-view />
      </main>
      <ConsoleStrip />
    </div>
  </div>
</template>

<style scoped>
.lm-shell {
  min-height: 100vh;
  display: flex;
  background: #0b0b0f;
  color: #e8e8ed;
}
.lm-rail {
  width: 200px;
  background: #121218;
  border-right: 1px solid #1f1f28;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.2s ease;
}
.lm-rail.collapsed {
  width: 64px;
}
.lm-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  cursor: pointer;
  border-bottom: 1px solid #1f1f28;
}
.lm-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #18a058, #63e2b7);
  color: #04140c;
  font-weight: 800;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px #18a05866;
}
.lm-name {
  font-size: 14px;
  font-weight: 700;
  color: #63e2b7;
}
.lm-sub {
  font-size: 11px;
  color: #6b6b76;
  letter-spacing: 0.04em;
}
.lm-rail-ico {
  width: 18px;
  display: inline-flex;
  justify-content: center;
  color: #63e2b7;
}
.lm-collapse {
  margin-top: auto;
  border: none;
  background: transparent;
  color: #6b6b76;
  padding: 12px;
  cursor: pointer;
}
.lm-main-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  max-height: 100vh;
}
.lm-top {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  border-bottom: 1px solid #1f1f28;
  background: #101016cc;
  backdrop-filter: blur(8px);
}
.lm-top-left,
.lm-top-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lm-product {
  font-weight: 700;
  letter-spacing: 0.02em;
}
.lm-vendor {
  font-size: 12px;
  color: #6b6b76;
}
.lm-content {
  flex: 1;
  overflow: auto;
  padding: 18px 20px 12px;
}
</style>
