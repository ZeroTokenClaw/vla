<script setup>
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  { path: '/analytics/profile', label: copy.modules.analytics, iconText: '▦' },
  { path: '/datasets', label: copy.modules.datasets, iconText: '▣' },
  { path: '/qc', label: copy.modules.annotate, iconText: '✎' },
  { path: '/prelabel', label: copy.modules.prelabel, iconText: '⚡' },
  { path: '/vla', label: copy.modules.vla, iconText: '▶' },
  { path: '/train', label: copy.modules.train, iconText: '◈' },
  { path: '/eval/compare', label: '评测对比', iconText: '⇄' },
  { path: '/lineage', label: '血缘追溯', iconText: '☍' },
]

const active = computed(() => {
  const p = route.path
  if (p.startsWith('/analytics')) return '/analytics/profile'
  if (p.startsWith('/datasets')) return '/datasets'
  if (p.startsWith('/qc') || p.startsWith('/annotate')) return '/qc'
  if (p.startsWith('/prelabel')) return '/prelabel'
  if (p.startsWith('/vla')) return '/vla'
  if (p.startsWith('/train')) return '/train'
  if (p.startsWith('/eval')) return '/eval/compare'
  if (p.startsWith('/lineage')) return '/lineage'
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
        <div class="lm-mark">EI</div>
        <div v-if="!collapsed" class="lm-brand-text">
          <div class="lm-name">{{ copy.productShort }}</div>
          <div class="lm-sub">Data Eval</div>
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
  color: #0b0b0f;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}
.lm-name {
  font-weight: 700;
  font-size: 15px;
}
.lm-sub {
  font-size: 11px;
  color: #8b8b9a;
}
.lm-rail-ico {
  margin-right: 6px;
  opacity: 0.85;
}
.lm-collapse {
  margin: auto 12px 12px;
  border: 1px solid #2a2a36;
  background: #1a1a22;
  color: #c8c8d0;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
}
.lm-main-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.lm-top {
  height: 52px;
  border-bottom: 1px solid #1f1f28;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #101016;
}
.lm-top-left,
.lm-top-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lm-product {
  font-weight: 600;
}
.lm-vendor {
  color: #8b8b9a;
  font-size: 12px;
}
.lm-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
</style>
