<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title || '功能建设中')
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="ph-head">
        <span>{{ title }}</span>
        <el-tag type="info" size="small">占位页</el-tag>
      </div>
    </template>
    <el-empty description="本模块将在后续任务实现完整演示流程" />
  </el-card>
</template>

<style scoped>
.ph-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
</style>
