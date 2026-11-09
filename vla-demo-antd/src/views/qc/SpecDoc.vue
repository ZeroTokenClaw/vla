<script setup>
import { computed, onMounted, ref } from 'vue'
import { getSpecDoc } from '@/services/qc'
import ProgressMock from '@/components/ProgressMock.vue'

const loading = ref(false)
const sections = ref([])
const keyword = ref('')
const active = ref([])

const filtered = computed(() => {
  if (!keyword.value.trim()) return sections.value
  const k = keyword.value.toLowerCase()
  return sections.value.filter(
    (s) =>
      s.title.toLowerCase().includes(k) ||
      s.body.toLowerCase().includes(k) ||
      (s.rejectCodes || []).some((c) => c.toLowerCase().includes(k)),
  )
})

onMounted(async () => {
  loading.value = true
  try {
    sections.value = await getSpecDoc()
    active.value = sections.value[0] ? [sections.value[0].id] : []
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
      message="标注规范：抽检与审核以本文为准。每节含检查清单、正反例与驳回原因码，便于演示对照驳回。"
    />
    <ProgressMock :running="loading" label="加载规范文档" :duration="500" />
    <a-space style="margin-bottom: 12px">
      <a-input v-model:value="keyword" allow-clear placeholder="搜索章节 / 驳回码" style="width: 260px" />
      <a-tag color="processing">{{ filtered.length }} / {{ sections.length }} 节</a-tag>
    </a-space>
    <a-card :loading="loading">
      <template #title>
        <div class="hd">
          <span>AI Data Factory · 多模态标注规范 v2026.11</span>
          <a-tag color="warning">演示版</a-tag>
        </div>
      </template>
      <a-collapse v-model:activeKey="active">
        <a-collapse-panel v-for="s in filtered" :key="s.id" :header="s.title">
          <p class="body">{{ s.body }}</p>
          <a-divider style="margin: 12px 0" />
          <a-row :gutter="12">
            <a-col :span="8">
              <h4>检查清单</h4>
              <ul>
                <li v-for="c in s.checklist || []" :key="c">{{ c }}</li>
              </ul>
              <a-empty v-if="!(s.checklist || []).length" description="—" />
            </a-col>
            <a-col :span="8">
              <h4>示例</h4>
              <ul>
                <li v-for="e in s.examples || []" :key="e">{{ e }}</li>
              </ul>
            </a-col>
            <a-col :span="8">
              <h4>驳回原因码</h4>
              <a-tag v-for="c in s.rejectCodes || []" :key="c" color="error" style="margin-bottom: 6px">{{ c }}</a-tag>
            </a-col>
          </a-row>
        </a-collapse-panel>
      </a-collapse>
      <a-divider />
      <p class="foot">
        适用范围：文本实体抽取、图像语义分割、语音切片、视频目标检测、点云分割、VLA 动作序列。合格样本经抽检后进入回流库。
      </p>
    </a-card>
  </div>
</template>

<style scoped>
.tip { margin-bottom: 12px; }
.hd { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.body { margin: 0; line-height: 1.7; color: #374151; font-size: 14px; }
h4 { margin: 0 0 8px; font-size: 13px; color: #64748b; }
ul { margin: 0; padding-left: 18px; color: #334155; font-size: 13px; }
.foot { font-size: 12px; color: #9ca3af; margin: 0; }
</style>
