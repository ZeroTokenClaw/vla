<script setup>
import { Message } from '@/ui/discrete'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const listFilters = reactive({ keyword: '', status: '', algorithm: '' })
const meta = reactive({
  algorithms: [],
  models: [],
  gpus: [],
  augmentOptions: [],
})

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
    const res = await listExperiments({ ...listFilters, page: page.value, pageSize: pageSize.value })
    experiments.value = res.items
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
  } finally {
    loading.value = false
  }
}

async function onCreate() {
  if (!isAdmin.value) {
    Message.warning('请切换为管理员后再创建实验 / 分配 GPU')
    return
  }
  if (!form.name.trim()) return Message.warning('请填写实验名称')
  if (!form.algorithm) return Message.warning('请选择算法')
  if (!form.version) return Message.warning('请选择版本')
  if (!form.model) return Message.warning('请选择模型')

  saving.value = true
  try {
    const exp = await createExperiment({ ...form })
    Message.success(`已创建实验 ${exp.id}`)
    form.name = ''
    await refresh()
    router.push(`/train/runner/${exp.id}`)
  } catch (e) {
    Message.error(e.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function onAllocate() {
  if (!isAdmin.value) {
    Message.warning('请切换为管理员后再分配 GPU')
    return
  }
  if (!allocForm.expId) return Message.warning('请选择实验')
  if (!allocForm.gpuIds.length) return Message.warning('请选择 GPU')
  allocating.value = true
  try {
    const exp = await allocateGpu(allocForm.expId, [...allocForm.gpuIds])
    Message.success(`已为 ${exp.id} 分配 GPU`)
    await refresh()
  } catch (e) {
    Message.error(e.message || '分配失败')
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
watch([page, pageSize], refresh)
const scTableCols1 = [
  { title: '实验号', dataIndex: 'id', width: 150 },
  { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '算法', dataIndex: 'algorithm', width: 120 },
  { title: '模型', dataIndex: 'model', width: 120 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: 'Epoch', slotName: 'epoch', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
]
function onListSearch() { page.value = 1; refresh() }
</script>

<template>
  <div class="algo">
    <a-alert
      v-if="!isAdmin"
      type="warning"
      :closable="false"
      show-icon
      class="perm"
      :title="`当前身份 ${copy.roles[auth.role]}：仅可浏览实验列表与指标；创建实验 / 分配 GPU 需管理员`"
    />

    <a-row :gutter="16">
      <a-col :span="10">
        <a-card class="card">
          <template #title>
            <div class="card-head">
              <span>新建训练实验</span>
              <a-tag size="small" color="arcoblue">配置项 2 分</a-tag>
            </div>
          </template>

          <a-form :disabled="!isAdmin">
            <a-form-item label="实验名称" required>
              <a-input v-model="form.name" maxlength="40" placeholder="例如：仓拣 VLA 策略-增广" />
            </a-form-item>
            <a-form-item label="算法" required>
              <a-select v-model="form.algorithm" placeholder="选择算法" style="width: 100%">
                <a-option
                  v-for="a in meta.algorithms"
                  :key="a.value"
                  :label="a.label"
                  :value="a.value"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="算法版本" required>
              <a-select v-model="form.version" placeholder="选择版本" style="width: 100%">
                <a-option v-for="v in versionOptions" :key="v" :label="v" :value="v" />
              </a-select>
            </a-form-item>
            <a-form-item label="模型" required>
              <a-select v-model="form.model" placeholder="选择模型" style="width: 100%">
                <a-option
                  v-for="m in modelOptions"
                  :key="m.value"
                  :label="m.label"
                  :value="m.value"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="Batch Size" required>
              <a-input-number v-model="form.batchSize" :min="1" :max="128" />
            </a-form-item>
            <a-form-item label="Learning Rate" required>
              <a-input-number
                v-model="form.learningRate"
                :min="0.000001"
                :max="1"
                :step="0.0001"
                :precision="6"
              />
            </a-form-item>
            <a-form-item label="Epochs" required>
              <a-input-number v-model="form.epochs" :min="1" :max="200" />
            </a-form-item>
            <a-form-item label="数据增强">
              <a-switch v-model="form.augment" />
            </a-form-item>
            <a-form-item v-if="form.augment" label="增强算子">
              <a-select
                v-model="form.augmentOps"
                multiple
                collapse-tags
                style="width: 100%"
              >
                <a-option
                  v-for="o in meta.augmentOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="GPU 分配">
              <a-select
                v-model="form.gpuIds"
                multiple
                collapse-tags
                placeholder="可选，创建后亦可再分配"
                style="width: 100%"
              >
                <a-option
                  v-for="g in meta.gpus"
                  :key="g.id"
                  :label="`${g.name} · ${g.memoryGb}GB${g.free ? '' : '（占用）'}`"
                  :value="g.id"
                  :disabled="!g.free && !form.gpuIds.includes(g.id)"
                />
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-button type="primary" :loading="saving" :disabled="!isAdmin" @click="onCreate">
                创建实验
              </a-button>
              <a-button @click="refresh">刷新</a-button>
            </a-form-item>
          </a-form>

          <ProgressMock :running="saving" label="写入实验配置与版本元数据" :duration="700" />
        </a-card>

        <a-card class="card" style="margin-top: 16px">
          <template #title>
            <div class="card-head">
              <span>单独分配 GPU</span>
              <span type="info" size="small">管理员</span>
            </div>
          </template>
          <a-form :disabled="!isAdmin">
            <a-form-item label="实验">
              <a-select v-model="allocForm.expId" style="width: 100%" filterable>
                <a-option
                  v-for="e in experiments"
                  :key="e.id"
                  :label="`${e.id} · ${e.name}`"
                  :value="e.id"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="GPU 卡">
              <a-select v-model="allocForm.gpuIds" multiple collapse-tags style="width: 100%">
                <a-option
                  v-for="g in meta.gpus"
                  :key="g.id"
                  :label="g.name"
                  :value="g.id"
                />
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-button status="warning" :loading="allocating" :disabled="!isAdmin" @click="onAllocate">
                分配算力
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <a-col :span="14">
        <a-card class="card">
          <template #title>
            <div class="card-head">
              <span>实验列表</span>
              <span type="info" size="small">前缀 SC-EXP-</span>
            </div>
          </template>
          <div class="list-filters">
            <a-input v-model="listFilters.keyword" allow-clear placeholder="关键字" style="width: 140px; margin-right: 8px" />
            <a-select v-model="listFilters.status" allow-clear placeholder="状态" style="width: 120px; margin-right: 8px">
              <a-option value="draft" label="draft" />
              <a-option value="ready" label="ready" />
              <a-option value="running" label="running" />
              <a-option value="finished" label="finished" />
            </a-select>
            <a-select v-model="listFilters.algorithm" allow-clear placeholder="算法" style="width: 160px; margin-right: 8px">
              <a-option v-for="a in meta.algorithms" :key="a.value" :label="a.label" :value="a.value" />
            </a-select>
            <a-button type="primary" size="small" @click="onListSearch">查询</a-button>
          </div>
          <a-table :columns="scTableCols1" :data="experiments" row-key="id" :pagination="false" size="small">
            <template #epoch="{ record }">{{ record.currentEpoch }}/{{ record.epochs }}</template>
          </a-table>
          <div class="pager">
            <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-total show-page-size :page-size-options="[10,20,50]" />
          </div>
        </a-card>
      </a-col>
    </a-row>
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
.list-filters { margin-bottom: 8px; display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
.pager { display:flex; justify-content:flex-end; margin-top:12px; }
</style>
