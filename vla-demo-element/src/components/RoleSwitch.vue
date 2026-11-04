<script setup>
import { computed } from 'vue'
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
}
</script>

<template>
  <div class="dl-role-switch">
    <span class="dl-role-label">身份</span>
    <el-select
      :model-value="auth.role"
      size="small"
      style="width: 110px"
      @change="onChange"
    >
      <el-option
        v-for="opt in options"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>
    <el-tag type="info" effect="plain" size="small">{{ copy.roles[auth.role] }}</el-tag>
    <span class="dl-user">{{ auth.user?.account }}</span>
  </div>
</template>

<style scoped>
.dl-role-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dl-role-label {
  font-size: 12px;
  color: #6b7280;
}
.dl-user {
  color: #6b7280;
  font-size: 13px;
}
</style>