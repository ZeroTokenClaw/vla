<script setup>
import { ref } from 'vue'
import { useAuditStore } from '@/stores/audit'
import { copy } from '@/i18n/copy'

const open = ref(false)
const audit = useAuditStore()

function show() {
  open.value = true
}

defineExpose({ show })
</script>

<template>
  <span class="sc-audit-trigger">
    <a-button type="text" @click="show">操作日志</a-button>
    <a-drawer v-model:visible="open" title="审计日志" :width="420">
      <a-empty v-if="!audit.entries.length" description="暂无操作记录" />
      <a-timeline v-else>
        <a-timeline-item
          v-for="e in audit.entries"
          :key="e.id"
          :label="e.at"
        >
          <div class="sc-audit-item">
            <div class="sc-audit-action">{{ e.action }}</div>
            <div class="sc-audit-meta">
              {{ e.actor }} · {{ copy.roles[e.role] || e.role }}
            </div>
            <div v-if="e.detail" class="sc-audit-detail">{{ e.detail }}</div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </a-drawer>
  </span>
</template>

<style scoped>
.sc-audit-action {
  font-weight: 600;
  color: #1d2129;
}
.sc-audit-meta {
  font-size: 12px;
  color: #86909c;
  margin-top: 2px;
}
.sc-audit-detail {
  font-size: 12px;
  color: #4e5969;
  margin-top: 4px;
}
</style>
