<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import {
  listProductionTasks,
  createProductionTask,
  runProductionTask,
  listWorkflows,
  listMeta,
} from '@/services/factory'
import { users } from '@/mock/users'

const router = useRouter()
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', status: undefined, type: undefined })
const meta = listMeta()
const workflows = ref([])

const createVisible = ref(false)
const form = reactive({
  name: '',
  type: 'vla_pipeline',
  description: '',
  source: 'robot_capture',
  dataType: 'vla_mixed',
  datasetId: meta.datasets[0]?.id,
  workflowId: undefined,
  executorIds: [],
  reviewerIds: [],
  priority: 'P1',
  scheduleAt: '',
  completeCondition: { minQualifiedRate: 0.9, minSamples: 50 },
})

const statusOptions = [
  'draft',
  'ready',
  'running',
  'waiting_human',
  'succeeded',
  'failed',
  'paused',
]

async function load() {
  loading.value = true
  try {
    const wf = await listWorkflows({ page: 1, pageSize: 50 })
    workflows.value = wf.items
    if (!form.workflowId) form.workflowId = workflows.value.find((w) => w.status === 'published')?.id
    const res = await listProductionTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    rows.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onCreate() {
  try {
    const t = await createProductionTask({ ...form })
    notification.success({ message: `已创建 ${t.id}`, placement: 'topRight' })
    createVisible.value = false
    form.name = ''
    await load()
  } catch (e) {
    notification.error({ message: e.message || String(e), placement: 'topRight' })
  }
}

async function onRun(id) {
  await runProductionTask(id)
  notification.success({ message: '已启动（伪造异步推进）', placement: 'topRight' })
  router.push(`/factory/monitor?task=${id}`)
}

const cols = [
  { title: '任务号', dataIndex: 'id', key: 'id', width: 160 },
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type', width: 130 },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: '状态', key: 'status', width: 120 },
  { title: '进度', key: 'progress', width: 140 },
  { title: '当前节点', dataIndex: 'currentNode', key: 'currentNode', width: 120 },
  { title: '操作', key: 'op', width: 180 },
]

const annotators = computed(() => users.filter((u) => u.role !== 'reviewer' || true))
</script>

<template>
  <div>
    <a-space style="margin-bottom: 12px" wrap>
      <a-input v-model:value="filters.keyword" placeholder="搜索 ID / 名称" style="width: 200px" allow-clear />
      <a-select v-model:value="filters.status" placeholder="状态" allow-clear style="width: 150px" :options="statusOptions.map((s) => ({ value: s, label: s }))" />
      <a-select v-model:value="filters.type" placeholder="类型" allow-clear style="width: 170px" :options="meta.taskTypes" :field-names="{ label: 'label', value: 'value' }" />
      <a-button type="primary" @click="() => { page = 1; load() }">查询</a-button>
      <a-button @click="createVisible = true">创建生产任务</a-button>
    </a-space>

    <a-table
      :loading="loading"
      :columns="cols"
      :data-source="rows"
      row-key="id"
      :pagination="{ current: page, pageSize, total, onChange: (p) => { page = p; load() } }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag>{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'progress'">
          <a-progress :percent="Math.round((record.progress || 0) * 100)" size="small" />
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="router.push(`/factory/monitor?task=${record.id}`)">监控</a-button>
          <a-button
            type="link"
            size="small"
            :disabled="record.status === 'running' || record.status === 'succeeded'"
            @click="onRun(record.id)"
          >启动</a-button>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="createVisible" title="创建数据生产任务" width="720px" @ok="onCreate">
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="任务名称" required><a-input v-model:value="form.name" /></a-form-item></a-col>
          <a-col :span="12">
            <a-form-item label="任务类型">
              <a-select v-model:value="form.type" :options="meta.taskTypes" :field-names="{ label: 'label', value: 'value' }" />
            </a-form-item>
          </a-col>
          <a-col :span="24"><a-form-item label="任务描述"><a-textarea v-model:value="form.description" :rows="2" /></a-form-item></a-col>
          <a-col :span="8">
            <a-form-item label="数据来源">
              <a-select v-model:value="form.source" :options="meta.dataSources" :field-names="{ label: 'label', value: 'value' }" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数据类型">
              <a-select v-model:value="form.dataType" :options="meta.dataTypes" :field-names="{ label: 'label', value: 'value' }" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="目标数据集" required>
              <a-select v-model:value="form.datasetId" :options="meta.datasets.map((d) => ({ value: d.id, label: `${d.name} (${d.id})` }))" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="生产流程模板" required>
              <a-select v-model:value="form.workflowId" :options="workflows.filter((w) => w.status === 'published').map((w) => ({ value: w.id, label: `${w.name} v${w.version}` }))" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="优先级">
              <a-select v-model:value="form.priority" :options="['P0','P1','P2'].map((p) => ({ value: p, label: p }))" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="合格率阈值">
              <a-input-number v-model:value="form.completeCondition.minQualifiedRate" :min="0.5" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="执行人员">
              <a-select v-model:value="form.executorIds" mode="multiple" :options="annotators.map((u) => ({ value: u.id, label: u.name }))" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="审核人员">
              <a-select v-model:value="form.reviewerIds" mode="multiple" :options="users.map((u) => ({ value: u.id, label: u.name }))" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>
