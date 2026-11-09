<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/qc', label: 'Jobs 工单', match: (p) => p === '/qc' },
  { path: '/qc/annotate', label: 'Annotate 标注', match: (p) => p.startsWith('/qc/annotate') },
  { path: '/qc/workflow', label: 'Workflow 协作', match: (p) => p.startsWith('/qc/workflow') },
  { path: '/qc/audit', label: 'Review 审核', match: (p) => p.startsWith('/qc/audit') },
  { path: '/qc/sample-check', label: 'Sampling 抽检', match: (p) => p.startsWith('/qc/sample-check') },
  { path: '/qc/spec', label: 'Spec 规范', match: (p) => p.startsWith('/qc/spec') },
]

const activeTab = computed(() => {
  const hit = tabs.find((t) => t.match(route.path))
  return hit?.path || '/qc'
})

function onTabClick({ key }) {
  router.push(key)
}
</script>

<template>
  <div class="qc-hub">
    <div class="qc-head">
      <div>
        <h2>QC Center</h2>
        <p class="sub">Jobs · Reviewer workflow · Dataset sampling</p>
      </div>
    </div>

    <a-menu :key="activeTab" mode="horizontal"   class="qc-tabs" :selected-keys="[activeTab]" @click="onTabClick">
      <a-menu-item v-for="t in tabs" :key="t.path">{{ t.label }}</a-menu-item>
    </a-menu>

    <router-view />
  </div>
</template>

<style scoped>
.qc-head {
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
.qc-tabs {
  margin-bottom: 12px;
  background: #fff;
  border-radius: 6px;
  padding: 0 8px;
}
</style>
