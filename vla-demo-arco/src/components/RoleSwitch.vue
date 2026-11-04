<script setup>
import { computed } from 'vue'
import { Message } from '@/ui/discrete'
import { copy } from '@/i18n/copy'
import { useAuthStore } from '@/stores/auth'
import { pushAudit } from '@/stores/audit'

const auth = useAuthStore()

const options = computed(() =>
  Object.entries(copy.roles).map(([value, label]) => ({ value, label })),
)

function onChange(role) {
  auth.setRole(role)
  pushAudit({
    action: '切换角色',
    detail: `当前身份：${copy.roles[role] || role}`,
  })
  Message.success(`已切换为 ${copy.roles[role]}`)
}
</script>

<template>
  <div class="sc-role-switch">
    <span class="sc-role-label">身份</span>
    <a-select
      :model-value="auth.role"
      size="small"
      style="width: 110px"
      @change="onChange"
    >
      <a-option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
        :label="opt.label"
      >
        {{ opt.label }}
      </a-option>
    </a-select>
    <a-tag color="arcoblue" size="small">{{ copy.roles[auth.role] }}</a-tag>
    <span class="sc-user">{{ auth.user?.account }}</span>
  </div>
</template>

<style scoped>
.sc-role-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sc-role-label {
  font-size: 12px;
  color: #86909c;
}
.sc-user {
  color: #86909c;
  font-size: 13px;
}
</style>
