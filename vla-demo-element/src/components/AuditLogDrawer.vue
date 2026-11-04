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
  <span class="dl-audit-trigger">
    <el-button text type="primary" @click="show">操作日志</el-button>
    <el-drawer v-model="open" title="审计日志" size="420px" append-to-body>
      <el-empty v-if="!audit.entries.length" description="暂无操作记录" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="e in audit.entries"
          :key="e.id"
          :timestamp="e.at"
          placement="top"
        >
          <div class="dl-audit-item">
            <div class="dl-audit-action">{{ e.action }}</div>
            <div class="dl-audit-meta">
              {{ e.actor }} · {{ copy.roles[e.role] || e.role }}
            </div>
            <div v-if="e.detail" class="dl-audit-detail">{{ e.detail }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </span>
</template>

<style scoped>
.dl-audit-action {
  font-weight: 600;
  color: #1f2937;
}
.dl-audit-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.dl-audit-detail {
  font-size: 12px;
  color: #4b5563;
  margin-top: 4px;
}
</style>