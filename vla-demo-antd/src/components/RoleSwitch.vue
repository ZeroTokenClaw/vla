<script setup>
import { computed } from 'vue'
import { notification } from 'ant-design-vue'
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
    action: 'Switch role',
    detail: `Current identity: ${copy.roles[role] || role}`,
  })
  notification.success({
    message: 'Role updated',
    description: copy.roles[role],
    placement: 'topRight',
  })
}
</script>

<template>
  <div class="orn-role">
    <span class="label">Role</span>
    <a-select
      :value="auth.role"
      size="small"
      style="width: 160px"
      :options="options"
      @change="onChange"
    />
  </div>
</template>

<style scoped>
.orn-role {
  display: flex;
  align-items: center;
  gap: 8px;
}
.label {
  font-size: 12px;
  color: #64748b;
}
</style>
