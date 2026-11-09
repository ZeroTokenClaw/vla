<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProgressMock from '@/components/ProgressMock.vue'
import { useAuthStore } from '@/stores/auth'
import { copy } from '@/i18n/copy'
import {
  listMeta,
  listExperiments,
  createExperiment,
  allocateGpu,
} from '@/services/train'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const allocating = ref(false)
const experiments = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filters = reactive({
  keyword: '',
  status: '',
  algorithm: '',
})
const meta = reactive({
  algorithms: [],
  models: [],
  gpus: [],
  augmentOptions: [],
  datasets: [],
})

const statusOptions = [
  { value: 'draft', label: 'draft' },
  { value: 'ready', label: 'ready' },
  { value: 'running', label: 'running' },
  { value: 'finished', label: 'finished' },
  { value: 'stopped', label: 'stopped' },
]

const form = reactive({
  name: '',
  algorithm: '',
  version: '',
  model: '',
  batchSize: 8,
  learningRate: 0.0001,
  epochs: 20,
  augment: true,
  augmentOps: ['flip', 'color_jitter'],
  gpuIds: [],
  datasetIds: [],
})

const allocForm = reactive({
  expId: '',
  gpuIds: [],
})

const isAdmin = computed(() => auth.role === 'admin')

const versionOptions = computed(() => {
  const algo = meta.algorithms.find((a) => a.value === form.algorithm)
  return algo?.versions || []
})

const modelOptions = computed(() => {
  if (!form.algorithm) return meta.models
  return meta.models.filter((m) => m.algo === form.algorithm)
})

watch(
  () => form.algorithm,
  () => {
    form.version = versionOptions.value[0] || ''
    const models = modelOptions.value
    form.model = models[0]?.value || ''
  },
)

async function refresh() {
  loading.value = true
  try {
    Object.assign(meta, listMeta())
    const res = await listExperiments({
      page: page.value,
      pageSize: pageSize.value,
      status: filters.status || undefined,
      algorithm: filters.algorithm || undefined,
      keyword: filters.keyword || undefined,
    })
    experiments.value = res.items
    total.value = res.total
    page.value = res.page
  } finally {
    loading.value = false
  }
}

async function onSearch() {
  page.value = 1
  await refresh()
}

async function onResetFilters() {
  filters.keyword = ''
  filters.status = ''
  filters.algorithm = ''
  page.value = 1
  await refresh()
}

async function onCreate() {
  if (!isAdmin.value) {
    ElMessage.warning('请切换为管理员后再创建实验 / 分配 GPU')
    return
  }
  if (!form.name.trim()) return ElMessage.warning('请填写实验名称')
  if (!form.algorithm) return ElMessage.warning('请选择算法')
  if (!form.version) return ElMessage.warning('请选择版本')
  if (!form.model) return ElMessage.warning('请选择模型')

  saving.value = true
  try {
    const exp = await createExperiment({ ...form })
    ElMessage.success(`已创建实验 ${exp.id}`)
    form.name = ''
    await refresh()
    router.push(`/train/runner/${exp.id}`)
  } catch (e) {
    ElMessage.error(e.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function onAllocate() {
  if (!isAdmin.value) {
    ElMessage.warning('请切换为管理员后再分配 GPU')
    return
  }
  if (!allocForm.expId) return ElMessage.warning('请选择实验')
  if (!allocForm.gpuIds.length) return ElMessage.warning('请选择 GPU')
  allocating.value = true
  try {
    const exp = await allocateGpu(allocForm.expId, [...allocForm.gpuIds])
    ElMessage.success(`已为 ${exp.id} 分配 GPU`)
    await refresh()
  } catch (e) {
    ElMessage.error(e.message || '分配失败')
  } finally {
    allocating.value = false
  }
}

function goRunner(id) {
  router.push(`/train/runner/${id}`)
}

function goMetrics(id) {
  router.push(`/train/metrics/${id}`)
}

function algoLabel(v) {
  return meta.algorithms.find((a) => a.value === v)?.label || v
}

function modelLabel(v) {
  return meta.models.find((m) => m.value === v)?.label || v
}

function gpuNames(ids) {
  return (ids || [])
    .map((id) => meta.gpus.find((g) => g.id === id)?.name || id)
    .join(', ')
}

function statusType(s) {
  if (s === 'running') return 'warning'
  if (s === 'finished') return 'success'
  if (s === 'stopped') return 'info'
  if (s === 'ready') return 'primary'
  return 'info'
}

onMounted(refresh)
</script>

<template>
  <div v-loading="loading" class="algo">
    <el-alert
      v-if="!isAdmin"
      type="warning"
      :closable="false"
      show-icon
      class="perm"
      :title="`当前身份 ${copy.roles[auth.role]}：仅可浏览实验列表与指标；创建实验 / 分配 GPU 需管理员`"
    />

    <el-row :gutter="16">
      <el-col :span="10">
        <el-card shadow="never" class="card">
          <template #header>
            <div class="card-head">
              <span>新建训练实验</span>
              <el-tag size="small" type="primary" effect="plain">配置约 2 分</el-tag>
            </div>
          </template>

          <el-form label-width="100px" :disabled="!isAdmin">
            <el-form-item label="实验名称" required>
              <el-input v-model="form.name" maxlength="40" placeholder="例如：仓拣 VLA 策略-增广" />
            </el-form-item>
            <el-form-item label="算法" required>
              <el-select v-model="form.algorithm" placeholder="选择算法" style="width: 100%">
                <el-option
                  v-for="a in meta.algorithms"
                  :key="a.value"
                  :label="a.label"
                  :value="a.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="算法版本" required>
              <el-select v-model="form.version" placeholder="选择版本" style="width: 100%">
                <el-option v-for="v in versionOptions" :key="v" :label="v" :value="v" />
              </el-select>
            </el-form-item>
            <el-form-item label="模型" required>
              <el-select v-model="form.model" placeholder="选择模型" style="width: 100%">
                <el-option
                  v-for="m in modelOptions"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Batch Size" required>
              <el-input-number v-model="form.batchSize" :min="1" :max="128" />
            </el-form-item>
            <el-form-item label="Learning Rate" required>
              <el-input-number
                v-model="form.learningRate"
                :min="0.000001"
                :max="1"
                :step="0.0001"
                :precision="6"
              />
            </el-form-item>
            <el-form-item label="Epochs" required>
              <el-input-number v-model="form.epochs" :min="1" :max="200" />
            </el-form-item>
            <el-form-item label="数据增强">
              <el-switch v-model="form.augment" />
            </el-form-item>
            <el-form-item v-if="form.augment" label="增强算子">
              <el-select
                v-model="form.augmentOps"
                multiple
                collapse-tags
                style="width: 100%"
              >
                <el-option
                  v-for="o in meta.augmentOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="数据集版本">
              <el-select
                v-model="form.datasetIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="绑定回流/发布数据集版本"
                style="width: 100%"
              >
                <el-option
                  v-for="d in meta.datasets"
                  :key="d.id"
                  :label="`${d.name} · ${d.versionPin} · ${d.split} · ${d.sampleCount}`"
                  :value="d.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="GPU 分配">
              <el-select
                v-model="form.gpuIds"
                multiple
                collapse-tags
                placeholder="可选，创建后亦可再分配"
                style="width: 100%"
              >
                <el-option
                  v-for="g in meta.gpus"
                  :key="g.id"
                  :label="`${g.name} · ${g.memoryGb}GB${g.free ? '' : '（占用）'}`"
                  :value="g.id"
                  :disabled="!g.free && !form.gpuIds.includes(g.id)"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" :disabled="!isAdmin" @click="onCreate">
                创建实验
              </el-button>
              <el-button @click="refresh">刷新</el-button>
            </el-form-item>
          </el-form>

          <ProgressMock :running="saving" label="写入实验配置与版本元数据" :duration="700" />
        </el-card>

        <el-card shadow="never" class="card" style="margin-top: 16px">
          <template #header>
            <div class="card-head">
              <span>单独分配 GPU</span>
              <el-text type="info" size="small">管理员</el-text>
            </div>
          </template>
          <el-form label-width="100px" :disabled="!isAdmin">
            <el-form-item label="实验">
              <el-select v-model="allocForm.expId" style="width: 100%" filterable>
                <el-option
                  v-for="e in experiments"
                  :key="e.id"
                  :label="`${e.id} · ${e.name}`"
                  :value="e.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="GPU 卡">
              <el-select v-model="allocForm.gpuIds" multiple collapse-tags style="width: 100%">
                <el-option
                  v-for="g in meta.gpus"
                  :key="g.id"
                  :label="g.name"
                  :value="g.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="warning" :loading="allocating" :disabled="!isAdmin" @click="onAllocate">
                分配算力
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card shadow="never" class="card">
          <template #header>
            <div class="card-head">
              <span>实验列表</span>
              <el-text type="info" size="small">前缀 DL-EXP- · 共 {{ total }} 条</el-text>
            </div>
          </template>

          <el-form :inline="true" class="list-filters" @submit.prevent>
            <el-form-item label="关键词">
              <el-input
                v-model="filters.keyword"
                clearable
                placeholder="实验号/名称"
                style="width: 160px"
                @keyup.enter="onSearch"
              />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px">
                <el-option
                  v-for="s in statusOptions"
                  :key="s.value"
                  :label="s.label"
                  :value="s.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="算法">
              <el-select v-model="filters.algorithm" clearable placeholder="全部" style="width: 150px">
                <el-option
                  v-for="a in meta.algorithms"
                  :key="a.value"
                  :label="a.label"
                  :value="a.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="onSearch">筛选</el-button>
              <el-button @click="onResetFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="experiments" stripe size="small" empty-text="暂无实验">
            <el-table-column prop="id" label="实验号" min-width="140" />
            <el-table-column prop="name" label="名称" min-width="130" show-overflow-tooltip />
            <el-table-column label="算法" min-width="120">
              <template #default="{ row }">{{ algoLabel(row.algorithm) }}</template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="90" />
            <el-table-column label="模型" min-width="110">
              <template #default="{ row }">{{ modelLabel(row.model) }}</template>
            </el-table-column>
            <el-table-column label="数据集" width="80">
              <template #default="{ row }">{{ row.datasetCount || 0 }}</template>
            </el-table-column>
            <el-table-column label="GPU" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ gpuNames(row.gpuIds) || '—' }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="goRunner(row.id)">运行</el-button>
                <el-button link type="success" @click="goMetrics(row.id)">指标</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pager">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next, sizes"
              :page-sizes="[10, 20, 50]"
              background
              @current-change="refresh"
              @size-change="
                () => {
                  page = 1
                  refresh()
                }
              "
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.perm {
  margin-bottom: 12px;
}
.card {
  border-radius: 8px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.list-filters {
  margin-bottom: 8px;
}
.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>