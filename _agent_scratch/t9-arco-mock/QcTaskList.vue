<script setup>
import { Message } from '@/ui/discrete'
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
    Message.warning('请填写工单标题')
    return
  }
  const t = await createQcTask({ ...createForm })
  Message.success(`已创建工单 ${t.id}`)
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
    Message.warning('请选择处理人')
    return
  }
  await assignTask(assignTarget.value.id, assignUserId.value)
  Message.success('分配成功')
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
const scTableCols1 = [
  
]
</script>

<template>
  <div>
    <div class="list-actions">
      <a-button v-if="canCreate()" type="primary" @click="createVisible = true">新建工单</a-button>
    </div>
    <a-card class="filter-card">
      <a-form :inline="true" @submit.prevent>
        <a-form-item label="关键字">
          <a-input v-model="filters.keyword" allow-clear placeholder="工单号/标题" style="width: 180px" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="filters.status" allow-clear placeholder="全部" style="width: 130px">
            <a-option v-for="s in meta.statuses" :key="s.value" :label="s.label" :value="s.value" />
          </a-select>
        </a-form-item>
        <a-form-item label="模态">
          <a-select v-model="filters.modality" allow-clear placeholder="全部" style="width: 150px">
            <a-option v-for="m in meta.modalities" :key="m.value" :label="m.label" :value="m.value" />
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="loading" @click="onSearch">查询</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card>
      <a-empty v-if="!tasks?.length && !loading" description="暂无质控工单" />
    <a-table :columns="scTableCols1" :data="tasks" row-key="id" :pagination="false" size="small"></a-table>
    </a-card>

    <a-modal v-model:visible="createVisible" title="新建质控工单" width="480px">
      <a-form>
        <a-form-item label="标题" required>
          <a-input v-model="createForm.title" placeholder="例如：门厅开门点云分割返修" />
        </a-form-item>
        <a-form-item label="模态" required>
          <a-select v-model="createForm.modality" style="width: 100%">
            <a-option v-for="m in meta.modalities" :key="m.value" :label="m.label" :value="m.value" />
          </a-select>
        </a-form-item>
        <a-form-item label="优先级">
          <a-radio-group v-model="createForm.priority">
            <a-radio value="high">高</a-radio>
            <a-radio value="medium">中</a-radio>
            <a-radio value="low">低</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="样本数">
          <a-input-number v-model="createForm.sampleCount" :min="1" :max="500" />
        </a-form-item>
        <a-form-item label="批次号">
          <a-input v-model="createForm.batchId" placeholder="可选" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="createVisible = false">取消</a-button>
        <a-button type="primary" @click="onCreate">创建</a-button>
      </template>
    </a-modal>

    <a-modal v-model:visible="assignVisible" title="人员分配" width="420px">
      <p class="hint">工单 {{ assignTarget?.id }} · {{ assignTarget?.title }}</p>
      <a-select v-model="assignUserId" placeholder="选择标注员" style="width: 100%">
        <a-option
          v-for="u in annotators"
          :key="u.id"
          :label="`${u.name}（${u.dept}）`"
          :value="u.id"
        />
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
