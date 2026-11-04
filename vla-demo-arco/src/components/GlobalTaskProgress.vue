<script setup>
import { computed } from 'vue'
import { useAuditStore } from '@/stores/audit'
import { copy } from '@/i18n/copy'

const audit = useAuditStore()

const latest = computed(() => audit.entries[0] || null)
const percent = computed(() => {
  if (!latest.value) return 0
  const n = audit.entries.length
  return Math.min(96, 28 + (n % 7) * 9)
})
</script>

<template>
  <div class="sc-gtp">
    <div class="sc-gtp-label">
      <span class="dot" />
      <span v-if="latest">全局任务 · {{ latest.action }}</span>
      <span v-else>{{ copy.empty.audit }}</span>
    </div>
    <a-progress
      :percent="percent"
      size="small"
      :show-text="false"
      :color="{
        '0%': '#0FC6C2',
        '100%': '#00B42A',
      }"
      style="width: 160px"
    />
  </div>
</template>

<style scoped>
.sc-gtp {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e8ffea;
  border: 1px solid #b7f5bf;
}
.sc-gtp-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #008026;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00b42a;
  box-shadow: 0 0 0 3px #00b42a33;
  flex-shrink: 0;
}
</style>
