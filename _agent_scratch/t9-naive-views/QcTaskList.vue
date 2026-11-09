<script setup>
import { message } from '@/ui/discrete'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  listQcTasks,
  createQcTask,
  assignTask,
  listMeta,
  getModalityMeta,
  getStatusMeta,
} from '@/services/qc'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const meta = reactive({ modalities: [], statuses: [], urgencies: [], lanes: [], users: [] })
const filters = reactive({ keyword: '', status: '', modality: '', urgency: '', lane: '' })

const createVisible = ref(false)
const createForm = reactive({
  title: '',
  modality: 'text_ner',
  urgency: 'normal',
  lane: 'lane-alpha',
  sampleCount: 20,
  batchId: '',
})

const assignVisible = ref(false)
const assignTarget = ref(null)
const assignUserId = ref('')

const annotators = computed(() =>
  meta.users.filter((u) => u.role === 'annotator' || u.role === 'admin'),
)

async function load() {
  loading.value = true
  try {
    Object.assign(meta, listMeta())
    const res = await listQcTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onSearch() {
  await load()
}

async function onCreate() {
  if (!createForm.title.trim()) {
    message.warning('请填写工单标题')
    return
  }
  const t = await createQcTask({ ...createForm })
  message.success(`已创建工单 ${t.id}`)
  createVisible.value = false
  createForm.title = ''
  await load()
}

function openAssign(row) {
  assignTarget.value = row
  assignUserId.value = row.assigneeId || ''
  assignVisible.value = true
}

async function confirmAssign() {
  if (!assignUserId.value) {
    message.warning('请选择处理人')
    return
  }
  await assignTask(assignTarget.value.id, assignUserId.value)
  message.success('分配成功')
  assignVisible.value = false
  await load()
}

function goAnnotate(id) {
  router.push(`/qc/annotate/${id}`)
}

function goAudit(id) {
  router.push(`/qc/audit/${id}`)
}

function userLabel(id) {
  return meta.users.find((u) => u.id === id)?.name || '—'
}

function canCreate() {
  return auth.role === 'admin' || auth.role === 'reviewer'
}

defineExpose({ openCreate: () => { createVisible.value = true } })
const lmTableCols1 = [
  { title: '工单号', key: 'id', width: 160 },
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return getStatusMeta(row.status)?.label || row.status
    },
  },
  {
    title: '紧急度',
    key: 'urgency',
    width: 90,
    render(row) {
      return row.urgency
    },
  },
  {
    title: '通道',
    key: 'lane',
    width: 110,
    render(row) {
      return row.lane
    },
  },
  {
    title: '处理人',
    key: 'assigneeId',
    width: 100,
    render(row) {
      return userLabel(row.assigneeId)
    },
  },
  {
    title: '进度',
    key: 'progress',
    width: 100,
    render(row) {
      return `${row.doneCount}/${row.sampleCount}`
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render(row) {
      return [
        h(
          'a',
          { style: 'margin-right:8px;cursor:pointer', onClick: () => goAnnotate(row.id) },
          '标注',
        ),
        h(
          'a',
          { style: 'margin-right:8px;cursor:pointer', onClick: () => openAssign(row) },
          '分配',
        ),
        h('a', { style: 'cursor:pointer', onClick: () => goAudit(row.id) }, '审核'),
      ]
    },
  },
]
</script>

<template>
  <div>
    <div class="list-actions">
      <n-button v-if="canCreate()" type="primary" @click="createVisible = true">新建工单</n-button>
    </div>
    <n-card class="filter-card">
      <n-form :="true" @submit.prevent>
        <n-form-item label="关键字">
          <n-input v-model="filters.keyword" clearable placeholder="工单号/标题" style="width: 180px" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model="filters.status" clearable placeholder="全部" style="width: 130px" :options="meta.statuses.map(s => ({ label: s.label, value: s.value }))"></n-select>
        </n-form-item>
        <n-form-item label="模态">
          <n-select v-model="filters.modality" clearable placeholder="全部" style="width: 150px" :options="meta.modalities.map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item label="紧急度">
          <n-select v-model="filters.urgency" clearable placeholder="全部" style="width: 120px" :options="(meta.urgencies||[]).map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item label="通道">
          <n-select v-model="filters.lane" clearable placeholder="全部" style="width: 130px" :options="(meta.lanes||[]).map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="() => { page.value = 1; onSearch() }">查询</n-button>
        </n-form-item>
      </n-form>
    </n-card>

    <n-card>
      <n-empty v-if="!tasks?.length && !loading" description="暂无质控工单" />
      <n-data-table v-else :columns="lmTableCols1" :data="tasks" :row-key="(r) => r.id" size="small" :bordered="false" :single-line="false" :loading="loading"></n-data-table>
      <div style="margin-top: 12px; display: flex; justify-content: flex-end">
        <n-pagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="total"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="load"
          @update:page-size="() => { page.value = 1; load() }"
        />
      </div>
    </n-card>

    <n-modal v-model:show="createVisible" title="新建质控工单" width="480px">
      <n-form>
        <n-form-item label="标题" required>
          <n-input v-model="createForm.title" placeholder="例如：门厅开门点云分割返修" />
        </n-form-item>
        <n-form-item label="模态" required>
          <n-select v-model="createForm.modality" style="width: 100%" :options="meta.modalities.map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item label="紧急度">
          <n-radio-group v-model="createForm.urgency">
            <n-radio value="urgent">紧急</n-radio>
            <n-radio value="normal">普通</n-radio>
            <n-radio value="backlog">积压</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="通道">
          <n-select v-model="createForm.lane" style="width: 100%" :options="(meta.lanes||[]).map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item label="样本数">
          <n-input-number v-model="createForm.sampleCount" :min="1" :max="500" />
        </n-form-item>
        <n-form-item label="批次号">
          <n-input v-model="createForm.batchId" placeholder="可选" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-button @click="createVisible = false">取消</n-button>
        <n-button type="primary" @click="onCreate">创建</n-button>
      </template>
    </n-modal>

    <n-modal v-model:show="assignVisible" title="人员分配" width="420px">
      <p class="hint">工单 {{ assignTarget?.id }} · {{ assignTarget?.title }}</p>
      <n-select v-model="assignUserId" placeholder="选择标注员" style="width: 100%" :options="annotators.map(u => ({ label: `${u.name}（${u.squad}）`, value: u.id }))"></n-select>
      <template #footer>
        <n-button @click="assignVisible = false">取消</n-button>
        <n-button type="primary" @click="confirmAssign">确认分配</n-button>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.list-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.filter-card {
  margin-bottom: 12px;
}
.hint {
  margin: 0 0 12px;
  color: #6b7280;
  font-size: 13px;
}
</style>
