<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSpecDoc } from '@/services/qc'
import { useAuthStore } from '@/stores/auth'
import ProgressMock from '@/components/ProgressMock.vue'

const auth = useAuthStore()
const loading = ref(false)
const sections = ref([])
const labelTaxonomy = ref([
  { id: 'lb-person', modality: 'text_ner', name: 'PERSON', color: '#1677ff', required: true, desc: '自然人姓名' },
  { id: 'lb-date', modality: 'text_ner', name: 'DATE', color: '#52c41a', required: true, desc: '日期时间' },
  { id: 'lb-addr', modality: 'text_ner', name: 'ADDRESS', color: '#fa8c16', required: true, desc: '地址' },
  { id: 'lb-cup', modality: 'seg', name: 'cup', color: '#1677ff', required: true, desc: '杯子前景' },
  { id: 'lb-hand', modality: 'seg', name: 'hand', color: '#eb2f96', required: false, desc: '手部' },
  { id: 'lb-box', modality: 'video_det', name: 'box_A', color: '#13c2c2', required: true, desc: '料箱目标 A' },
  { id: 'lb-grip', modality: 'video_det', name: 'gripper', color: '#722ed1', required: true, desc: '夹爪' },
  { id: 'lb-wake', modality: 'audio_slice', name: '唤醒词', color: '#2f54eb', required: true, desc: '语音唤醒片段' },
  { id: 'lb-plane', modality: 'point_seg', name: 'table_plane', color: '#13c2c2', required: true, desc: '桌面平面' },
])

const draft = reactive({
  modality: 'text_ner',
  name: '',
  color: '#1677ff',
  required: false,
  desc: '',
})

const canEdit = () => auth.role === 'admin' || auth.role === 'reviewer'

onMounted(async () => {
  loading.value = true
  try {
    sections.value = await getSpecDoc()
  } finally {
    loading.value = false
  }
})

function addLabel() {
  if (!canEdit()) {
    ElMessage.warning('仅审核员/管理员可维护标签体系')
    return
  }
  if (!draft.name.trim()) {
    ElMessage.error('请填写标签名')
    return
  }
  labelTaxonomy.value.unshift({
    id: `lb-${Date.now()}`,
    modality: draft.modality,
    name: draft.name.trim(),
    color: draft.color,
    required: !!draft.required,
    desc: draft.desc.trim() || '—',
  })
  draft.name = ''
  draft.desc = ''
  ElMessage.success('已加入标签体系（演示内存态）')
}

function removeLabel(id) {
  if (!canEdit()) {
    ElMessage.warning('仅审核员/管理员可维护标签体系')
    return
  }
  labelTaxonomy.value = labelTaxonomy.value.filter((x) => x.id !== id)
  ElMessage.success('已删除标签')
}

const modalityOptions = [
  { value: 'text_ner', label: '文本 NER' },
  { value: 'seg', label: '图像分割' },
  { value: 'audio_slice', label: '语音切片' },
  { value: 'video_det', label: '视频检测' },
  { value: 'point_seg', label: '点云分割' },
]
</script>

<template>
  <div>
    <el-alert
      class="tip"
      type="success"
      :closable="false"
      show-icon
      title="标注规范 + 标签体系：抽检与审核以规范正文为准；下方标签可配置（演示内存，刷新会重置）。"
    />
    <ProgressMock :running="loading" label="加载规范文档" :duration="500" />

    <el-card shadow="never" class="mb" v-loading="loading">
      <template #header>
        <div class="hd">
          <span>数联标注云 · 多模态标注规范 v2026.11</span>
          <el-tag type="warning" size="small">演示版</el-tag>
        </div>
      </template>
      <el-collapse accordion>
        <el-collapse-item v-for="s in sections" :key="s.id" :title="s.title" :name="s.id">
          <p class="body">{{ s.body }}</p>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="hd">
          <span>标签体系（可配置）</span>
          <el-tag size="small" effect="plain">{{ labelTaxonomy.length }} 个标签</el-tag>
        </div>
      </template>

      <el-form :inline="true" class="add-form" @submit.prevent>
        <el-form-item label="模态">
          <el-select v-model="draft.modality" style="width: 140px">
            <el-option v-for="m in modalityOptions" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签名">
          <el-input v-model="draft.name" placeholder="如 ORDER_ID" style="width: 140px" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="draft.color" size="small" />
        </el-form-item>
        <el-form-item label="必填">
          <el-switch v-model="draft.required" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="draft.desc" placeholder="用途说明" style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addLabel">新增标签</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="labelTaxonomy" stripe size="small">
        <el-table-column prop="name" label="标签" width="140">
          <template #default="{ row }">
            <span class="swatch" :style="{ background: row.color }" />
            {{ row.name }}
          </template>
        </el-table-column>
        <el-table-column prop="modality" label="模态" width="120">
          <template #default="{ row }">
            {{ modalityOptions.find((m) => m.value === row.modality)?.label || row.modality }}
          </template>
        </el-table-column>
        <el-table-column label="必填" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.required ? 'danger' : 'info'">
              {{ row.required ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="desc" label="说明" min-width="180" />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="danger" @click="removeLabel(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <p class="foot">
        适用范围：文本实体抽取、图像语义分割、语音切片、视频目标检测、点云分割。合格样本经抽检后进入回流库。
      </p>
    </el-card>
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 12px;
}
.mb {
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
.add-form {
  margin-bottom: 8px;
}
.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 6px;
  vertical-align: middle;
}
.foot {
  font-size: 12px;
  color: #9ca3af;
  margin: 12px 0 0;
}
</style>
