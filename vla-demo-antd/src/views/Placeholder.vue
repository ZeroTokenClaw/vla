<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title || '功能建设中')
</script>

<template>
  <a-card>
    <template #title>
      <div class="ph-head">
        <span>{{ title }}</span>
        <a-tag color="default" size="small">占位页</a-tag>
      </div>
    </template>
    <a-empty description="本模块将在后续任务实现完整演示流程" />
  </a-card>
</template>

<style scoped>
.ph-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
</style>
