<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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
const filters = reactive({ keyword: '', status: '', modality: '', priority: '' })
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

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
  page.value = 1
  await load()
}

async function onCreate() {
  if (!createForm.title.trim()) {
    ElMessage.warning('请填写工单标题')
    return
  }
  const t = await createQcTask({ ...createForm })
  ElMessage.success(`已创建工单 ${t.id}`)
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
    ElMessage.warning('请选择处理人')
    return
  }
  await assignTask(assignTarget.value.id, assignUserId.value)
  ElMessage.success('分配成功')
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
</script>

<template>
  <div>
    <div class="list-actions">
      <el-button v-if="canCreate()" type="primary" @click="createVisible = true">新建工单</el-button>
    </div>
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" clearable placeholder="工单号/标题" style="width: 180px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 130px">
            <el-option v-for="s in meta.statuses" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="模态">
          <el-select v-model="filters.modality" clearable placeholder="全部" style="width: 150px">
            <el-option v-for="m in meta.modalities" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" clearable placeholder="全部" style="width: 120px">
            <el-option v-for="p in meta.priorities" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-empty v-if="!tasks?.length && !loading" description="暂无质控工单" :image-size="72" />
    <el-table v-show="tasks?.length"  :data="tasks" v-loading="loading" stripe>
        <el-table-column prop="id" label="工单号" min-width="160" fixed />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="模态" width="120">
          <template #default="{ row }">{{ getModalityMeta(row.modality)?.short }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusMeta(row.status)?.color || 'info'">
              {{ getStatusMeta(row.status)?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'info'"
            >
              {{ row.priority === 'high' ? '高' : row.priority === 'medium' ? '中' : '低' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="buCode" label="事业部" width="100" />
      <el-table-column label="处理人" width="100">
          <template #default="{ row }">{{ userLabel(row.assigneeId) }}</template>
        </el-table-column>
        <el-table-column label="协作" width="80">
          <template #default="{ row }">{{ row.collaborators?.length || 0 }}人</template>
        </el-table-column>
        <el-table-column label="进度" width="110">
          <template #default="{ row }">{{ row.doneCount }}/{{ row.sampleCount }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="160" prop="updatedAt" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goAnnotate(row.id)">标注</el-button>
            <el-button link type="primary" @click="openAssign(row)">分配</el-button>
            <el-button link type="primary" @click="goAudit(row.id)">审核</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

        <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next, sizes"
        :page-sizes="[10, 20, 50]"
        @current-change="load"
        @size-change="() => { page = 1; load() }"
      />
    </div>

    <el-dialog v-model="createVisible" title="新建质控工单" width="480px">
      <el-form label-width="90px">
        <el-form-item label="标题" required>
          <el-input v-model="createForm.title" placeholder="例如：门厅开门点云分割返修" />
        </el-form-item>
        <el-form-item label="模态" required>
          <el-select v-model="createForm.modality" style="width: 100%">
            <el-option v-for="m in meta.modalities" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="createForm.priority">
            <el-radio value="high">高</el-radio>
            <el-radio value="medium">中</el-radio>
            <el-radio value="low">低</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="样本数">
          <el-input-number v-model="createForm.sampleCount" :min="1" :max="500" />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="createForm.batchId" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="onCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="assignVisible" title="人员分配" width="420px">
      <p class="hint">工单 {{ assignTarget?.id }} · {{ assignTarget?.title }}</p>
      <el-select v-model="assignUserId" placeholder="选择标注员" style="width: 100%">
        <el-option
          v-for="u in annotators"
          :key="u.id"
          :label="`${u.name}（${u.dept}）`"
          :value="u.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确认分配</el-button>
      </template>
    </el-dialog>
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
.pager {
  display: flex;
  justify-content: flex-end;
  margin: 12px 0 8px;
}
</style>
