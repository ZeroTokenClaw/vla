<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { businessDelay } from '@/services/delay'
import { pushAudit } from '@/stores/audit'
import { MODEL_REGISTRY } from '@/mock/factory'
import { createPrng } from '@/mock/seed/prng'

const router = useRouter()
const rng = createPrng(1109)
const loading = ref(false)
const jobs = ref([])
const createOpen = ref(false)
const detail = ref(null)
const filters = reactive({ status: undefined, modality: undefined })
const form = reactive({
  name: '',
  modality: 'image',
  modelId: MODEL_REGISTRY[0]?.id,
  sampleCount: 100,
  conf: 0.5,
})

function seedJobs() {
  const statuses = ['queued', 'running', 'waiting_human', 'succeeded', 'failed']
  return Array.from({ length: 16 }).map((_, i) => {
    const status = i < 2 ? 'running' : statuses[i % statuses.length]
    return {
      id: `ADF-PLJOB-${String(i + 1).padStart(3, '0')}`,
      name: `${['OCR 批次', 'YOLO 批次', 'NER 批次', '混合预标'][i % 4]} #${i + 1}`,
      modality: ['image', 'image', 'text', 'mixed'][i % 4],
      modelId: MODEL_REGISTRY[i % MODEL_REGISTRY.length].id,
      modelVersion: MODEL_REGISTRY[i % MODEL_REGISTRY.length].version,
      sampleCount: 40 + rng.int(0, 200),
      progress: status === 'succeeded' ? 1 : status === 'queued' ? 0 : Number(rng.next().toFixed(2)),
      status,
      conf: 0.35 + (i % 5) * 0.1,
      createdAt: `2026-11-0${(i % 8) + 1} ${10 + (i % 8)}:12:00`,
      error: status === 'failed' ? 'MODEL_TIMEOUT demo' : null,
      logs: [
        { at: `2026-11-0${(i % 8) + 1} 10:12:00`, level: 'info', message: '任务入队' },
        { at: `2026-11-0${(i % 8) + 1} 10:13:20`, level: 'info', message: `绑定模型 ${MODEL_REGISTRY[i % MODEL_REGISTRY.length].id}` },
        status === 'failed'
          ? { at: `2026-11-0${(i % 8) + 1} 10:18:00`, level: 'error', message: 'MODEL_TIMEOUT demo' }
          : { at: `2026-11-0${(i % 8) + 1} 10:20:00`, level: 'info', message: '批次推进中' },
      ],
      metrics: {
        avgConf: Number((0.6 + (i % 4) * 0.08).toFixed(2)),
        lowConfRate: Number((0.05 + (i % 5) * 0.02).toFixed(2)),
        throughput: 12 + (i % 9),
      },
    }
  })
}

const filtered = computed(() => {
  let list = jobs.value
  if (filters.status) list = list.filter((j) => j.status === filters.status)
  if (filters.modality) list = list.filter((j) => j.modality === filters.modality)
  return list
})

const stats = computed(() => ({
  total: jobs.value.length,
  running: jobs.value.filter((j) => j.status === 'running').length,
  failed: jobs.value.filter((j) => j.status === 'failed').length,
  succeeded: jobs.value.filter((j) => j.status === 'succeeded').length,
}))

onMounted(() => {
  jobs.value = seedJobs()
})

async function createJob() {
  if (!form.name.trim()) return notification.warning({ message: '请填写任务名', placement: 'topRight' })
  loading.value = true
  await businessDelay()
  const model = MODEL_REGISTRY.find((m) => m.id === form.modelId)
  const row = {
    id: `ADF-PLJOB-${String(jobs.value.length + 1).padStart(3, '0')}`,
    name: form.name,
    modality: form.modality,
    modelId: form.modelId,
    modelVersion: model?.version,
    sampleCount: form.sampleCount,
    progress: 0,
    status: 'queued',
    conf: form.conf,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    error: null,
    logs: [{ at: new Date().toISOString().slice(0, 19).replace('T', ' '), level: 'info', message: '任务入队' }],
    metrics: { avgConf: form.conf, lowConfRate: 0.08, throughput: 0 },
  }
  jobs.value.unshift(row)
  pushAudit({ action: '创建预标批量任务', detail: row.id })
  createOpen.value = false
  loading.value = false
  notification.success({ message: `已创建 ${row.id}`, placement: 'topRight' })
}

async function tick(job) {
  loading.value = true
  await businessDelay()
  if (job.status === 'queued') job.status = 'running'
  job.progress = Math.min(1, Number((job.progress + 0.25).toFixed(2)))
  job.logs = job.logs || []
  job.logs.push({
    at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    level: 'info',
    message: `进度 ${(job.progress * 100).toFixed(0)}%`,
  })
  if (job.progress >= 1) {
    job.status = 'succeeded'
    job.progress = 1
    job.logs.push({ at: new Date().toISOString().slice(0, 19).replace('T', ' '), level: 'success', message: '批次完成' })
  }
  pushAudit({ action: '推进预标任务', detail: `${job.id} → ${job.status}` })
  loading.value = false
}

async function retry(job) {
  job.status = 'queued'
  job.progress = 0
  job.error = null
  job.logs = [...(job.logs || []), { at: new Date().toISOString().slice(0, 19).replace('T', ' '), level: 'info', message: '重新入队' }]
  pushAudit({ action: '重试预标任务', detail: job.id })
  notification.success({ message: '已重新入队', placement: 'topRight' })
}

const cols = [
  { title: '任务号', dataIndex: 'id', width: 130 },
  { title: '名称', dataIndex: 'name' },
  { title: '模态', dataIndex: 'modality', width: 90 },
  { title: '模型', key: 'model', width: 180 },
  { title: '样本数', dataIndex: 'sampleCount', width: 80 },
  { title: '进度', key: 'progress', width: 140 },
  { title: '状态', key: 'status', width: 120 },
  { title: '操作', key: 'op', width: 200 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="预标任务队列：伪造异步进度、失败重试、日志与质量指标；不调用真实推理服务。"
    />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="任务总数" :value="stats.total" /></a-col>
      <a-col :span="6"><a-statistic title="运行中" :value="stats.running" /></a-col>
      <a-col :span="6"><a-statistic title="已成功" :value="stats.succeeded" /></a-col>
      <a-col :span="6"><a-statistic title="失败" :value="stats.failed" /></a-col>
    </a-row>
    <a-space style="margin-bottom: 12px" wrap>
      <a-button type="primary" @click="createOpen = true">创建批量预标任务</a-button>
      <a-select
        v-model:value="filters.status"
        allow-clear
        placeholder="状态"
        style="width: 140px"
        :options="['queued', 'running', 'waiting_human', 'succeeded', 'failed'].map((v) => ({ value: v, label: v }))"
      />
      <a-select
        v-model:value="filters.modality"
        allow-clear
        placeholder="模态"
        style="width: 120px"
        :options="['text', 'image', 'mixed'].map((v) => ({ value: v, label: v }))"
      />
      <a-button @click="router.push('/prelabel/ocr')">OCR 中心</a-button>
      <a-button @click="router.push('/prelabel/yolo')">YOLO 中心</a-button>
    </a-space>
    <a-table :loading="loading" :columns="cols" :data-source="filtered" row-key="id" size="small">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'model'">{{ record.modelId }} · {{ record.modelVersion }}</template>
        <template v-else-if="column.key === 'progress'">
          <a-progress :percent="Math.round((record.progress || 0) * 100)" size="small" />
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag
            :color="
              record.status === 'succeeded'
                ? 'success'
                : record.status === 'failed'
                  ? 'error'
                  : record.status === 'running'
                    ? 'processing'
                    : 'default'
            "
          >
            {{ record.status }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="detail = record">详情</a-button>
          <a-button type="link" size="small" :disabled="record.status === 'succeeded'" @click="tick(record)">推进一步</a-button>
          <a-button type="link" size="small" :disabled="record.status !== 'failed'" @click="retry(record)">重试</a-button>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="createOpen" title="创建预标批量任务" @ok="createJob">
      <a-form layout="vertical">
        <a-form-item label="任务名称"><a-input v-model:value="form.name" /></a-form-item>
        <a-form-item label="模态">
          <a-select v-model:value="form.modality" :options="['text', 'image', 'mixed'].map((v) => ({ value: v, label: v }))" />
        </a-form-item>
        <a-form-item label="模型">
          <a-select
            v-model:value="form.modelId"
            :options="MODEL_REGISTRY.filter((m) => m.status === 'active').map((m) => ({ value: m.id, label: `${m.name} (${m.version})` }))"
          />
        </a-form-item>
        <a-form-item label="样本数"><a-input-number v-model:value="form.sampleCount" :min="10" :max="5000" style="width: 100%" /></a-form-item>
        <a-form-item label="置信度阈值"><a-input-number v-model:value="form.conf" :min="0.1" :max="0.99" :step="0.05" style="width: 100%" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer :open="!!detail" width="480" :title="detail?.name || '任务详情'" @close="detail = null">
      <template v-if="detail">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="ID">{{ detail.id }}</a-descriptions-item>
          <a-descriptions-item label="模型">{{ detail.modelId }} · {{ detail.modelVersion }}</a-descriptions-item>
          <a-descriptions-item label="样本数">{{ detail.sampleCount }}</a-descriptions-item>
          <a-descriptions-item label="阈值">{{ detail.conf }}</a-descriptions-item>
          <a-descriptions-item label="状态">{{ detail.status }}</a-descriptions-item>
          <a-descriptions-item label="创建">{{ detail.createdAt }}</a-descriptions-item>
          <a-descriptions-item v-if="detail.error" label="错误">{{ detail.error }}</a-descriptions-item>
        </a-descriptions>
        <h4 style="margin: 14px 0 8px">质量指标（伪造）</h4>
        <a-row :gutter="8">
          <a-col :span="8"><a-statistic title="均置信" :value="detail.metrics?.avgConf" :precision="2" /></a-col>
          <a-col :span="8"><a-statistic title="低置信率" :value="detail.metrics?.lowConfRate" :precision="2" /></a-col>
          <a-col :span="8"><a-statistic title="吞吐/分" :value="detail.metrics?.throughput" /></a-col>
        </a-row>
        <h4 style="margin: 14px 0 8px">运行日志</h4>
        <a-timeline>
          <a-timeline-item
            v-for="(l, i) in detail.logs || []"
            :key="i"
            :color="l.level === 'error' ? 'red' : l.level === 'success' ? 'green' : 'blue'"
          >
            {{ l.at }} · {{ l.message }}
          </a-timeline-item>
        </a-timeline>
      </template>
    </a-drawer>
  </div>
</template>
