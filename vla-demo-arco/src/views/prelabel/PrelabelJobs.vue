<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  listMeta,
  listPrelabelJobs,
  createPrelabelJob,
  tickPrelabelJob,
  retryPrelabelJob,
  listTextDocs,
  listVisionImages,
} from '@/services/prelabel'

const loading = ref(false)
const acting = ref(false)
const jobs = ref([])
const total = ref(0)
const page = ref(1)
const meta = listMeta()
const textSamples = ref([])
const visionSamples = ref([])
let autoTimer = null

const form = reactive({
  title: '',
  modelId: meta.models?.[0]?.id || '',
  sampleIds: [],
  confThres: 0.5,
})

const selectedModel = computed(() => meta.models.find((m) => m.id === form.modelId))
const sampleOptions = computed(() => {
  const t = selectedModel.value?.type
  if (t === 'ocr' || t === 'yolo') return visionSamples.value
  return textSamples.value
})

async function load() {
  loading.value = true
  try {
    const res = await listPrelabelJobs({ page: page.value, pageSize: 10 })
    jobs.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [t, v] = await Promise.all([
    listTextDocs({ page: 1, pageSize: 50 }),
    listVisionImages({ page: 1, pageSize: 50 }),
  ])
  textSamples.value = t.items
  visionSamples.value = v.items
  await load()
  autoTimer = setInterval(async () => {
    const running = jobs.value.filter((j) => j.status === 'running')
    for (const j of running) {
      try {
        await tickPrelabelJob(j.id)
      } catch {
        /* ignore */
      }
    }
    if (running.length) await load()
  }, 1600)
})

onUnmounted(() => {
  if (autoTimer) clearInterval(autoTimer)
})

async function onCreate() {
  acting.value = true
  try {
    await createPrelabelJob({
      title: form.title,
      modelId: form.modelId,
      sampleIds: form.sampleIds,
      type: selectedModel.value?.type,
      params: { confThres: form.confThres },
    })
    Message.success('已创建并运行')
    form.title = ''
    form.sampleIds = []
    await load()
  } catch (e) {
    Message.error(e.message)
  } finally {
    acting.value = false
  }
}

async function onRetry(id) {
  try {
    await retryPrelabelJob(id)
    Message.success('已重试')
    await load()
  } catch (e) {
    Message.error(e.message)
  }
}
</script>

<template>
  <div>
    <a-alert type="info" banner style="margin-bottom: 12px">
      预标任务队列（演示）：选模型与参数 → 批量样本 → 进度监控 → 失败可重试。
    </a-alert>
    <a-card title="创建批量预标任务" :bordered="false" style="margin-bottom: 12px">
      <a-form :model="form" layout="vertical" style="max-width: 720px">
        <a-form-item label="任务名称" required>
          <a-input v-model="form.title" placeholder="例如：客服文本批次" />
        </a-form-item>
        <a-form-item label="模型" required>
          <a-select v-model="form.modelId" @change="form.sampleIds = []">
            <a-option v-for="m in meta.models" :key="m.id" :value="m.id">
              {{ m.name }} · {{ m.version }}（{{ m.type }}）
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="样本">
          <a-select v-model="form.sampleIds" multiple allow-search>
            <a-option v-for="s in sampleOptions" :key="s.id" :value="s.id">{{ s.id }} · {{ s.title }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="confThres">
          <a-input-number v-model="form.confThres" :min="0.1" :max="0.95" :step="0.05" />
        </a-form-item>
        <a-button type="primary" :loading="acting" @click="onCreate">创建并运行</a-button>
      </a-form>
    </a-card>
    <a-card title="任务列表" :bordered="false">
      <a-table :data="jobs" :loading="loading" :pagination="{ total, current: page, pageSize: 10 }" row-key="id" @page-change="(p) => { page = p; load() }">
        <a-table-column title="任务号" data-index="id" :width="150" />
        <a-table-column title="标题" data-index="title" />
        <a-table-column title="模型" :width="180">
          <template #cell="{ record }">{{ record.modelId }}@{{ record.modelVersion }}</template>
        </a-table-column>
        <a-table-column title="进度" :width="160">
          <template #cell="{ record }">
            <a-progress :percent="record.progressPct / 100" :status="record.status === 'failed' ? 'danger' : 'normal'" />
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" :width="100" />
        <a-table-column title="错误">
          <template #cell="{ record }">{{ record.errorMessage || '—' }}</template>
        </a-table-column>
        <a-table-column title="操作" :width="90">
          <template #cell="{ record }">
            <a-button type="text" :disabled="record.status !== 'failed'" @click="onRetry(record.id)">重试</a-button>
          </template>
        </a-table-column>
      </a-table>
    </a-card>
  </div>
</template>
