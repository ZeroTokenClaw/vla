<script setup>import { notification } from 'ant-design-vue'

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
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filters = reactive({ status: undefined, algorithm: undefined, keyword: '' })
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
    const res = await listExperiments({ ...filters, page: page.value, pageSize: pageSize.value })
    experiments.value = res.items
    total.value = res.total
    page.value = res.page
  } finally {
    loading.value = false
  }
}

async function onCreate() {
  if (!isAdmin.value) {
    notification.warning({ message: '请切换为管理员后再创建实验 / 分配 GPU', placement: 'topRight' })
    return
  }
  if (!form.name.trim()) return notification.warning({ message: '请填写实验名称', placement: 'topRight' })
  if (!form.algorithm) return notification.warning({ message: '请选择算法', placement: 'topRight' })
  if (!form.version) return notification.warning({ message: '请选择版本', placement: 'topRight' })
  if (!form.model) return notification.warning({ message: '请选择模型', placement: 'topRight' })

  saving.value = true
  try {
    const exp = await createExperiment({ ...form })
    notification.success({ message: `已创建实验 ${exp.id}`, placement: 'topRight' })
    form.name = ''
    await refresh()
    router.push(`/train/runner/${exp.id}`)
  } catch (e) {
    notification.error({ message: e.message || '创建失败', placement: 'topRight' })
  } finally {
    saving.value = false
  }
}

async function onAllocate() {
  if (!isAdmin.value) {
    notification.warning({ message: '请切换为管理员后再分配 GPU', placement: 'topRight' })
    return
  }
  if (!allocForm.expId) return notification.warning({ message: '请选择实验', placement: 'topRight' })
  if (!allocForm.gpuIds.length) return notification.warning({ message: '请选择 GPU', placement: 'topRight' })
  allocating.value = true
  try {
    const exp = await allocateGpu(allocForm.expId, [...allocForm.gpuIds])
    notification.success({ message: `已为 ${exp.id} 分配 GPU`, placement: 'topRight' })
    await refresh()
  } catch (e) {
    notification.error({ message: e.message || '分配失败', placement: 'topRight' })
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

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}

const ornTableCols1 = [
  { title: '实验号', key: 'id', dataIndex: 'id', width: 140 },
  { title: '版本', key: 'version', dataIndex: 'version', width: 90 },
  { title: 'GPU', key: 'GPU', width: 140 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 90 },
  { title: '操作', key: '操作', width: 150, fixed: 'right' }
]
</script>

<template>
  <div :loading="loading" class="algo">
    <a-alert
      v-if="!isAdmin"
      type="warning"
      :closable="false"
      show-icon
      class="perm"
      :message="`当前身份 ${copy.roles[auth.role]}：仅可浏览实验列表与指标；创建实验 / 分配 GPU 需管理员`" />

    <a-row :gutter="16">
      <a-col :span="10">
        <a-card  class="card">
          <template #title>
            <div class="card-head">
              <span>新建训练实验</span>
              <a-tag size="small" type="primary">配置项 2 分</a-tag>
            </div>
          </template>

          <a-form :label-col="{ style: { width: '100px' } }"  :disabled="!isAdmin">
            <a-form-item label="实验名称" required>
              <a-input v-model:value="form.name" maxlength="40" placeholder="例如：仓拣 VLA 策略-增广" />
            </a-form-item>
            <a-form-item label="算法" required>
              <a-select v-model:value="form.algorithm" placeholder="选择算法" style="width: 100%">
                <a-select-option
                  v-for="a in meta.algorithms"
                  :key="a.value"
                  :value="a.value">{{ a.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="算法版本" required>
              <a-select v-model:value="form.version" placeholder="选择版本" style="width: 100%">
                <a-select-option v-for="v in versionOptions" :key="v" :value="v">{{ v }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="模型" required>
              <a-select v-model:value="form.model" placeholder="选择模型" style="width: 100%">
                <a-select-option
                  v-for="m in modelOptions"
                  :key="m.value"
                  :value="m.value">{{ m.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="Batch Size" required>
              <a-input-number v-model:value="form.batchSize" :min="1" :max="128" />
            </a-form-item>
            <a-form-item label="Learning Rate" required>
              <a-input-number
                v-model:value="form.learningRate"
                :min="0.000001"
                :max="1"
                :step="0.0001"
                :precision="6" />
            </a-form-item>
            <a-form-item label="Epochs" required>
              <a-input-number v-model:value="form.epochs" :min="1" :max="200" />
            </a-form-item>
            <a-form-item label="数据增强">
              <a-switch v-model:checked="form.augment" />
            </a-form-item>
            <a-form-item v-if="form.augment" label="增强算子">
              <a-select
                v-model:value="form.augmentOps"
                multiple
                collapse-tags
                style="width: 100%">
                <a-select-option
                  v-for="o in meta.augmentOptions"
                  :key="o.value"
                  :value="o.value">{{ o.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="GPU 分配">
              <a-select
                v-model:value="form.gpuIds"
                multiple
                collapse-tags
                placeholder="可选，创建后亦可再分配"
                style="width: 100%">
                <a-select-option
                  v-for="g in meta.gpus"
                  :key="g.id"
                  :value="g.id"
                  :disabled="!g.free && !form.gpuIds.includes(g.id)">{{ `${g.name} · ${g.memoryGb}GB${g.free ? '' : '（占用）'}` }}</a-select-option>
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

        <a-card  class="card" style="margin-top: 16px">
          <template #title>
            <div class="card-head">
              <span>单独分配 GPU</span>
              <span class="orn-text" type="info" size="small">管理员</span>
            </div>
          </template>
          <a-form :label-col="{ style: { width: '100px' } }"  :disabled="!isAdmin">
            <a-form-item label="实验">
              <a-select v-model:value="allocForm.expId" style="width: 100%" show-search>
                <a-select-option
                  v-for="e in experiments"
                  :key="e.id"
                  :value="e.id">{{ `${e.id} · ${e.name}` }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="GPU 卡">
              <a-select v-model:value="allocForm.gpuIds" multiple collapse-tags style="width: 100%">
                <a-select-option
                  v-for="g in meta.gpus"
                  :key="g.id"
                  :value="g.id">{{ g.name }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-button type="warning" :loading="allocating" :disabled="!isAdmin" @click="onAllocate">
                分配算力
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <a-col :span="14">
        <a-card  class="card">
          <template #title>
            <div class="card-head">
              <span>实验列表</span>
              <span class="orn-text" type="info" size="small">prefix ORN-EXP-</span>
            </div>
          </template>
<a-table :data-source="experiments" :columns="ornTableCols1" :pagination="false" row-key="id" size="small">
  <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'id'">
{{ algoLabel(record.algorithm) }}
      </template>
      <template v-if="column.key === 'version'">
{{ modelLabel(record.model) }}
      </template>
      <template v-if="column.key === 'GPU'">
{{ gpuNames(record.gpuIds) || '—' }}
      </template>
      <template v-if="column.key === 'status'">
<a-tag size="small" :color="mapTagColor(statusType(record.status))">{{ record.status }}</a-tag>
      </template>
      <template v-if="column.key === '操作'">
<a-button  type="" @click="goRunner(record.id)">运行</a-button>
                <a-button  color="success" @click="goMetrics(record.id)">指标</a-button>
      </template>
  </template>
</a-table>
    <div style="margin-top: 12px; text-align: right">
      <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-size-changer @change="load" />
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
</style>
