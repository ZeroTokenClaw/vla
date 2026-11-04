<script setup>
import { onMounted, ref } from 'vue'
import { getSpecDoc } from '@/services/qc'
import ProgressMock from '@/components/ProgressMock.vue'

const loading = ref(false)
const sections = ref([])

onMounted(async () => {
  loading.value = true
  try {
    sections.value = await getSpecDoc()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <a-alert
      class="tip"
      type="success"
      :closable="false"
      show-icon
      title="标注规范：抽检与审核以本文为准。演示时可对照规范页说明驳回原因。"
    />
    <ProgressMock :running="loading" label="加载规范文档" :duration="500" />
    <a-card>
      <template #title>
        <div class="hd">
          <span>星算训练台 · 多模态标注规范 v2026.11</span>
          <a-tag color="orangered" size="small">演示版</a-tag>
        </div>
      </template>
      <a-collapse>
        <a-collapse-item v-for="s in sections" :key="s.id" :title="s.title" :name="s.id">
          <p class="body">{{ s.body }}</p>
        </a-collapse-item>
      </a-collapse>
      <a-divider />
      <p class="foot">
        适用范围：文本实体抽取、图像语义分割、语音切片、视频目标检测、点云分割。合格样本经抽检后进入回流库。
      </p>
    </a-card>
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 12px;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.body {
  margin: 0;
  line-height: 1.7;
  color: #374151;
  font-size: 14px;
}
.foot {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}
</style>
