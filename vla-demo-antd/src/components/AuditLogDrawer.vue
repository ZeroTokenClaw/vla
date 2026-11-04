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
  <span>
    <a-button type="link" @click="show">Activity</a-button>
    <a-drawer v-model:open="open" title="Activity / Audit log" :width="420">
      <a-empty v-if="!audit.entries.length" :description="copy.empty.audit" />
      <a-timeline v-else>
        <a-timeline-item v-for="e in audit.entries" :key="e.id" color="blue">
          <div class="item">
            <div class="action">{{ e.action }}</div>
            <div class="meta">{{ e.actor }} · {{ copy.roles[e.role] || e.role }} · {{ e.at }}</div>
            <div v-if="e.detail" class="detail">{{ e.detail }}</div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </a-drawer>
  </span>
</template>

<style scoped>
.action {
  font-weight: 600;
  color: #0f172a;
}
.meta {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}
.detail {
  font-size: 12px;
  color: #475569;
  margin-top: 4px;
}
</style>
