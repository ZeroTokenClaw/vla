<script setup>
import { message } from '@/ui/discrete'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpace, NTag } from 'naive-ui'
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
const listFilters = reactive({ status: null, algorithm: null, keyword: '' })
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
  } finally {
    loading.value = false
  }
}

async function onCreate() {
  if (!isAdmin.value) {
    message.warning('请切换为管理员后再创建实验 / 分配 GPU')
    return
  }
  if (!form.name.trim()) return message.warning('请填写实验名称')
  if (!form.algorithm) return message.warning('请选择算法')
  if (!form.version) return message.warning('请选择版本')
  if (!form.model) return message.warning('请选择模型')

  saving.value = true
  try {
    const exp = await createExperiment({ ...form })
    message.success(`已创建实验 ${exp.id}`)
    form.name = ''
    await refresh()
    router.push(`/train/runner/${exp.id}`)
  } catch (e) {
    message.error(e.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function onAllocate() {
  if (!isAdmin.value) {
    message.warning('请切换为管理员后再分配 GPU')
    return
  }
  if (!allocForm.expId) return message.warning('请选择实验')
  if (!allocForm.gpuIds.length) return message.warning('请选择 GPU')
  allocating.value = true
  try {
    const exp = await allocateGpu(allocForm.expId, [...allocForm.gpuIds])
    message.success(`已为 ${exp.id} 分配 GPU`)
    await refresh()
  } catch (e) {
    message.error(e.message || '分配失败')
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
  if (s === 'stopped') return 'default'
  if (s === 'ready') return 'info'
  return 'default'
}

onMounted(refresh)

const lmTableCols1 = [
  { title: '实验号', key: 'id', width: 140 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  {
    title: '算法',
    key: 'algorithm',
    width: 120,
    render: (r) => algoLabel(r.algorithm),
  },
  { title: '版本', key: 'version', width: 90 },
  {
    title: '模型',
    key: 'model',
    width: 110,
    render: (r) => modelLabel(r.model),
  },
  {
    title: 'GPU',
    key: 'gpuIds',
    width: 140,
    ellipsis: { tooltip: true },
    render: (r) => gpuNames(r.gpuIds) || '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (r) =>
      h(NTag, { size: 'small', type: statusType(r.status), bordered: false }, { default: () => r.status }),
  },
  {
    title: '进度',
    key: 'epoch',
    width: 90,
    render: (r) => `${r.currentEpoch || 0}/${r.epochs || '—'}`,
  },
  {
    title: '操作',
    key: 'act',
    width: 140,
    render: (r) =>
      h(NSpace, { size: 4 }, {
        default: () => [
          h(NButton, { size: 'tiny', quaternary: true, type: 'primary', onClick: () => goRunner(r.id) }, { default: () => '监控' }),
          h(NButton, { size: 'tiny', quaternary: true, onClick: () => goMetrics(r.id) }, { default: () => '指标' }),
        ],
      }),
  },
]
</script>

<template>
  <div class="algo">
    <n-alert
      v-if="!isAdmin"
      type="warning"
      :closable="false"
      show-icon
      class="perm"
      :title="`当前身份 ${copy.roles[auth.role]}：仅可浏览实验列表与指标；创建实验 / 分配 GPU 需管理员`"
    />

    <n-grid cols="24"  x-gap="16" y-gap="16">
      <n-gi :span="10">
        <n-card class="card">
          <template #header>
            <div class="card-head">
              <span>新建训练实验</span>
              <n-tag size="small" type="primary">配置项 2 分</n-tag>
            </div>
          </template>

          <n-form :disabled="!isAdmin">
            <n-form-item label="实验名称" required>
              <n-input v-model="form.name" maxlength="40" placeholder="例如：仓拣 VLA 策略-增广" />
            </n-form-item>
            <n-form-item label="算法" required>
              <n-select v-model="form.algorithm" placeholder="选择算法" style="width: 100%" :options="meta.algorithms.map(a => ({ label: a.label, value: a.value }))"></n-select>
            </n-form-item>
            <n-form-item label="算法版本" required>
              <n-select v-model="form.version" placeholder="选择版本" style="width: 100%" :options="versionOptions.map(v => ({ label: v, value: v }))"></n-select>
            </n-form-item>
            <n-form-item label="模型" required>
              <n-select v-model="form.model" placeholder="选择模型" style="width: 100%" :options="modelOptions.map(m => ({ label: m.label, value: m.value }))"></n-select>
            </n-form-item>
            <n-form-item label="Batch Size" required>
              <n-input-number v-model="form.batchSize" :min="1" :max="128" />
            </n-form-item>
            <n-form-item label="Learning Rate" required>
              <n-input-number
                v-model="form.learningRate"
                :min="0.000001"
                :max="1"
                :step="0.0001"
                :precision="6"
              />
            </n-form-item>
            <n-form-item label="Epochs" required>
              <n-input-number v-model="form.epochs" :min="1" :max="200" />
            </n-form-item>
            <n-form-item label="数据增强">
              <n-switch v-model="form.augment" />
            </n-form-item>
            <n-form-item v-if="form.augment" label="增强算子">
              <n-select
                v-model="form.augmentOps"
                multiple
                collapse-tags
                style="width: 100%"
               :options="meta.augmentOptions.map(o => ({ label: o.label, value: o.value }))"></n-select>
            </n-form-item>
            <n-form-item label="GPU 分配">
              <n-select
                v-model="form.gpuIds"
                multiple
                collapse-tags
                placeholder="可选，创建后亦可再分配"
                style="width: 100%"
               :options="meta.gpus.map(g => ({ label: `${g.name} · ${g.memoryGb}GB${g.free ? '' : '（占用）'}`, value: g.id }))"></n-select>
            </n-form-item>
            <n-form-item>
              <n-button type="primary" :loading="saving" :disabled="!isAdmin" @click="onCreate">
                创建实验
              </n-button>
              <n-button @click="refresh">刷新</n-button>
            </n-form-item>
          </n-form>

          <ProgressMock :running="saving" label="写入实验配置与版本元数据" :duration="700" />
        </n-card>

        <n-card class="card" style="margin-top: 16px">
          <template #header>
            <div class="card-head">
              <span>单独分配 GPU</span>
              <n-text type="info" size="small">管理员</n-text>
            </div>
          </template>
          <n-form :disabled="!isAdmin">
            <n-form-item label="实验">
              <n-select v-model="allocForm.expId" style="width: 100%" filterable :options="experiments.map(e => ({ label: `${e.id} · ${e.name}`, value: e.id }))"></n-select>
            </n-form-item>
            <n-form-item label="GPU 卡">
              <n-select v-model="allocForm.gpuIds" multiple collapse-tags style="width: 100%" :options="meta.gpus.map(g => ({ label: g.name, value: g.id }))"></n-select>
            </n-form-item>
            <n-form-item>
              <n-button type="warning" :loading="allocating" :disabled="!isAdmin" @click="onAllocate">
                分配算力
              </n-button>
            </n-form-item>
          </n-form>
        </n-card>
      </n-gi>

      <n-gi :span="14">
        <n-card class="card">
          <template #header>
            <div class="card-head">
              <span>实验列表</span>
              <n-text type="info" size="small">前缀 LM-EXP-</n-text>
            </div>
          </template>
          <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
            <n-input v-model="listFilters.keyword" clearable placeholder="实验号/名称" style="width:180px" />
            <n-select v-model="listFilters.status" clearable placeholder="状态" style="width:130px"
              :options="[{label:'draft',value:'draft'},{label:'ready',value:'ready'},{label:'running',value:'running'},{label:'finished',value:'finished'}]" />
            <n-button type="primary" @click="() => { page.value = 1; refresh() }">查询</n-button>
          </div>
          <n-data-table :columns="lmTableCols1" :data="experiments" :row-key="(r) => r.id" size="small" :bordered="false" :single-line="false"></n-data-table>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="total"
              show-size-picker :page-sizes="[10,20,50]"
              @update:page="refresh" @update:page-size="() => { page.value = 1; refresh() }" />
          </div>
        </n-card>
      </n-gi>
    </n-grid>
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
</style>
