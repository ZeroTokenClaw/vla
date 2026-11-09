<script setup>import { notification } from 'ant-design-vue'

import { computed, onMounted, reactive, ref } from 'vue'
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
const meta = reactive({ modalities: [], statuses: [], priorities: [], users: [] })
const filters = reactive({ keyword: '', status: '', modality: '' })

const createVisible = ref(false)
const createForm = reactive({
  title: '',
  modality: 'text_ner',
  priority: 'medium',
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
    tasks.value = await listQcTasks({ ...filters })
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
    notification.warning({ message: '请填写工单标题', placement: 'topRight' })
    return
  }
  const t = await createQcTask({ ...createForm })
  notification.success({ message: `已创建工单 ${t.id}`, placement: 'topRight' })
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
    notification.warning({ message: '请选择处理人', placement: 'topRight' })
    return
  }
  await assignTask(assignTarget.value.id, assignUserId.value)
  notification.success({ message: '分配成功', placement: 'topRight' })
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

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}

const ornTableCols1 = [
  { title: '工单号', key: 'id', dataIndex: 'id', width: 160, fixed: 'left' },
  { title: '状态', key: '状态', width: 100 },
  { title: '优先级', key: '优先级', width: 80 },
  { title: '处理人', key: '处理人', width: 100 },
  { title: '协作', key: '协作', width: 80 },
  { title: '进度', key: '进度', width: 110 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 160 }
]
</script>

<template>
  <div>
    <div class="list-actions">
      <a-button v-if="canCreate()" type="primary" @click="createVisible = true">Create job</a-button>
    </div>
    <a-card  class="filter-card">
      <a-form  @submit.prevent>
        <a-form-item label="关键字">
          <a-input v-model:value="filters.keyword" allow-clear placeholder="工单号/标题" style="width: 180px" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="filters.status" allow-clear placeholder="全部" style="width: 130px">
            <a-select-option v-for="s in meta.statuses" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="模态">
          <a-select v-model:value="filters.modality" allow-clear placeholder="全部" style="width: 150px">
            <a-select-option v-for="m in meta.modalities" :key="m.value" :value="m.value">{{ m.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="loading" @click="onSearch">Search</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card>
      <a-empty v-if="!tasks?.length && !loading" description="No jobs yet — Create job" />
    <a-table :data-source="tasks" :columns="ornTableCols1" :pagination="false" row-key="id" :loading="loading" v-show="tasks?.length">
  <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'id'">
{{ getModalityMeta(record.modality)?.short }}
      </template>
      <template v-if="column.key === '状态'">
<a-tag size="small" :color="mapTagColor(getStatusMeta(record.status)?.color || 'info')">
              {{ getStatusMeta(record.status)?.label }}
            </a-tag>
      </template>
      <template v-if="column.key === '优先级'">
<a-tag
              size="small"
              :color="mapTagColor(record.priority === 'high' ? 'danger' : record.priority === 'medium' ? 'warning' : 'info')">
              {{ record.priority === 'high' ? '高' : record.priority === 'medium' ? '中' : '低' }}
            </a-tag>
      </template>
      <template v-if="column.key === '处理人'">
{{ userLabel(record.assigneeId) }}
      </template>
      <template v-if="column.key === '协作'">
{{ record.collaborators?.length || 0 }}人
      </template>
      <template v-if="column.key === '进度'">
{{ record.doneCount }}/{{ record.sampleCount }}
      </template>
      <template v-if="column.key === 'updatedAt'">
<a-button  type="" @click="goAnnotate(record.id)">标注</a-button>
            <a-button  type="" @click="openAssign(row)">分配</a-button>
            <a-button  type="" @click="goAudit(record.id)">审核</a-button>
      </template>
  </template>
</a-table>
    </a-card>

    <a-modal v-model:open="createVisible" title="新建质控工单" width="480px">
      <a-form :label-col="{ style: { width: '90px' } }">
        <a-form-item label="标题" required>
          <a-input v-model:value="createForm.title" placeholder="例如：门厅开门点云分割返修" />
        </a-form-item>
        <a-form-item label="模态" required>
          <a-select v-model:value="createForm.modality" style="width: 100%">
            <a-select-option v-for="m in meta.modalities" :key="m.value" :value="m.value">{{ m.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="优先级">
          <a-radio-group v-model:value="createForm.priority">
            <a-radio value="high">高</a-radio>
            <a-radio value="medium">中</a-radio>
            <a-radio value="low">低</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="样本数">
          <a-input-number v-model:value="createForm.sampleCount" :min="1" :max="500" />
        </a-form-item>
        <a-form-item label="批次号">
          <a-input v-model:value="createForm.batchId" placeholder="可选" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="createVisible = false">取消</a-button>
        <a-button type="primary" @click="onCreate">创建</a-button>
      </template>
    </a-modal>

    <a-modal v-model:open="assignVisible" title="人员分配" width="420px">
      <p class="hint">工单 {{ assignTarget?.id }} · {{ assignTarget?.title }}</p>
      <a-select v-model:value="assignUserId" placeholder="选择标注员" style="width: 100%">
        <a-select-option
          v-for="u in annotators"
          :key="u.id"
          :value="u.id">{{ `${u.name}（${u.dept}）` }}</a-select-option>
      </a-select>
      <template #footer>
        <a-button @click="assignVisible = false">取消</a-button>
        <a-button type="primary" @click="confirmAssign">确认分配</a-button>
      </template>
    </a-modal>
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
