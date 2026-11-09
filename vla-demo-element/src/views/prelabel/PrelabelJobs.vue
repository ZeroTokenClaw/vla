<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ProgressMock from '@/components/ProgressMock.vue'
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
const filters = reactive({ status: '', type: '', keyword: '' })
const meta = listMeta()
const textSamples = ref([])
const visionSamples = ref([])
let autoTimer = null

const form = reactive({
  title: '',
  modelId: meta.models.find((m) => m.type === 'text_pipeline')?.id || '',
  sampleIds: [],
  confThres: 0.5,
  imgsz: 640,
  maxLen: 512,
})

const selectedModel = computed(() => meta.models.find((m) => m.id === form.modelId))
const sampleOptions = computed(() => {
  const t = selectedModel.value?.type
  if (t === 'ocr' || t === 'yolo' || t === 'batch_mixed') {
    return visionSamples.value.map((s) => ({ id: s.id, title: s.title }))
  }
  return textSamples.value.map((s) => ({ id: s.id, title: s.title }))
})

async function load() {
  loading.value = true
  try {
    const res = await listPrelabelJobs({
      page: page.value,
      pageSize: 10,
      status: filters.status || undefined,
      type: filters.type || undefined,
      keyword: filters.keyword || undefined,
    })
    jobs.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadSamples() {
  const [t, v] = await Promise.all([
    listTextDocs({ page: 1, pageSize: 50 }),
    listVisionImages({ page: 1, pageSize: 50 }),
  ])
  textSamples.value = t.items
  visionSamples.value = v.items
}

onMounted(async () => {
  await Promise.all([load(), loadSamples()])
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
  if (!form.title.trim()) {
    ElMessage.error('请填写任务名称')
    return
  }
  acting.value = true
  try {
    const params = {
      confThres: form.confThres,
      imgsz: form.imgsz,
      maxLen: form.maxLen,
    }
    const job = await createPrelabelJob({
      title: form.title,
      modelId: form.modelId,
      sampleIds: form.sampleIds,
      type: selectedModel.value?.type,
      params,
    })
    ElMessage.success(`已创建 ${job.id}`)
    form.title = ''
    form.sampleIds = []
    await load()
  } catch (e) {
    ElMessage.error(e.message || '创建失败')
  } finally {
    acting.value = false
  }
}

async function onRetry(id) {
  acting.value = true
  try {
    await retryPrelabelJob(id)
    ElMessage.success('已重新入队运行')
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    acting.value = false
  }
}

function statusType(s) {
  return (
    {
      running: 'warning',
      success: 'success',
      failed: 'danger',
      partial: 'warning',
      pending: 'info',
    }[s] || 'info'
  )
}
</script>

<template>
  <div v-loading="loading">
    <el-alert
      class="tip"
      type="info"
      :closable="false"
      show-icon
      title="预标任务队列（演示）：选择模型与参数 → 批量样本 → 进度监控 → 失败可重试。推理结果为脱敏伪造，界面展示完整业务闭环。"
    />

    <el-card shadow="never" class="mb">
      <template #header>创建批量预标任务</template>
      <el-form label-width="100px" class="form">
        <el-form-item label="任务名称" required>
          <el-input v-model="form.title" placeholder="例如：客服文本批次批量 NER" />
        </el-form-item>
        <el-form-item label="模型" required>
          <el-select v-model="form.modelId" style="width: 100%" @change="form.sampleIds = []">
            <el-option
              v-for="m in meta.models"
              :key="m.id"
              :label="`${m.name} · ${m.version}（${m.type}）`"
              :value="m.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="样本">
          <el-select
            v-model="form.sampleIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            placeholder="选择样本 ID"
          >
            <el-option v-for="s in sampleOptions" :key="s.id" :label="`${s.id} · ${s.title}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="confThres">
              <el-input-number v-model="form.confThres" :min="0.1" :max="0.95" :step="0.05" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="imgsz">
              <el-input-number v-model="form.imgsz" :min="320" :max="1280" :step="64" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="maxLen">
              <el-input-number v-model="form.maxLen" :min="128" :max="4096" :step="128" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" :loading="acting" @click="onCreate">创建并运行</el-button>
          <span v-if="selectedModel" class="model-hint">
            后端：{{ selectedModel.backend }} · 默认参数已载入可改
          </span>
        </el-form-item>
      </el-form>
    </el-card>

    <ProgressMock :running="acting" label="预标任务处理中" :duration="900" />

    <el-card shadow="never">
      <template #header>
        <div class="hd">
          <span>任务列表</span>
          <div class="filters">
            <el-select v-model="filters.status" clearable placeholder="状态" style="width: 120px" @change="load">
              <el-option label="running" value="running" />
              <el-option label="success" value="success" />
              <el-option label="failed" value="failed" />
            </el-select>
            <el-input
              v-model="filters.keyword"
              clearable
              placeholder="任务号/标题"
              style="width: 180px"
              @keyup.enter="load"
            />
            <el-button @click="load">查询</el-button>
          </div>
        </div>
      </template>

      <el-table :data="jobs" stripe>
        <el-table-column prop="id" label="任务号" width="150" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column label="模型" min-width="160">
          <template #default="{ row }">{{ row.modelId }}@{{ row.modelVersion }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column label="进度" width="160">
          <template #default="{ row }">
            <el-progress :percentage="row.progressPct" :status="row.status === 'failed' ? 'exception' : undefined" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Diff 统计" min-width="160">
          <template #default="{ row }">
            <span v-if="row.diffStats">
              实体修 {{ Math.round((row.diffStats.entityFixRate || 0) * 100) }}% /
              框修 {{ Math.round((row.diffStats.yoloFixRate || row.diffStats.ocrFixRate || 0) * 100) }}%
            </span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="错误" min-width="160">
          <template #default="{ row }">{{ row.errorMessage || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="!(row.status === 'failed' || row.status === 'partial')"
              @click="onRetry(row.id)"
            >
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="10"
          @current-change="load"
        />
      </div>
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
.form {
  max-width: 920px;
}
.model-hint {
  margin-left: 12px;
  color: #6b7280;
  font-size: 12px;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
