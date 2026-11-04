<script setup>
import { computed } from 'vue'
import { copy } from '@/i18n/copy'
import { useAuthStore } from '@/stores/auth'
import { pushAudit } from '@/stores/audit'
import { message } from '@/ui/discrete'

const auth = useAuthStore()

const options = computed(() =>
  Object.entries(copy.roles).map(([value, label]) => ({ value, label })),
)

function onChange(role) {
  auth.setRole(role)
  pushAudit({
    action: '切换身份',
    detail: `当前身份：${copy.roles[role] || role}`,
  })
  message.success(`已切换为 ${copy.roles[role]}`)
}
</script>

<template>
  <div class="lm-role">
    <span class="label">身份</span>
    <n-select
      :value="auth.role"
      size="small"
      style="width: 120px"
      :options="options"
      @update:value="onChange"
    />
  </div>
</template>

<style scoped>
.lm-role {
  display: flex;
  align-items: center;
  gap: 8px;
}
.label {
  font-size: 12px;
  color: #8b8b97;
}
</style>
