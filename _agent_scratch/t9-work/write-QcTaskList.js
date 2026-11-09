const fs = require('fs')

// ========== Rewrite QcTaskList.vue ==========
const qcTaskList = `<script setup>
import { Message } from '@/ui/discrete'
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const meta = reactive({ modalities: [], statuses: [], slaClasses: [], tenants: [], users: [] })
const filters = reactive({ keyword: '', status: '', modality: '', slaClass: '', tenantCode: '' })

const createVisible = ref(false)
const createForm = reactive({
  title: '',
  modality: 'text_ner',
  slaClass: 'A',
  tenantCode: 'tn-sc-01',
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
    pageSize.value = res.pageSize
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([page, pageSize], load)

async function onSearch() {
  page.value = 1
  await load()
}

async function onCreate() {
  if (!createForm.title.trim()) {
    Message.warning('请填写工单标题')
    return
  }
  const t = await createQcTask({ ...createForm })
  Message.success(\`已创建工单 \${t.id}\`)
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
  router.push(\`/qc/annotate/\${id}\`)
}

function goAudit(id) {
  router.push(\`/qc/audit/\${id}\`)
}

function userLabel(id) {
  return meta.users.find((u) => u.id === id)?.name || '—'
}

function canCreate() {
  return auth.role === 'admin' || auth.role === 'reviewer'
}

defineExpose({ openCreate: () => { createVisible.value = true } })

const scTableCols1 = [
  { title: '工单号', dataIndex: 'id', width: 170 },
  { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
  { title: '模态', slotName: 'modality', width: 110 },
  { title: '状态', slotName: 'status', width: 100 },
  { title: 'SLA', slotName: 'slaClass', width: 70 },
  { title: '租户', dataIndex: 'tenantCode', width: 110 },
  { title: '处理人', slotName: 'assignee', width: 100 },
  { title: '进度', slotName: 'progress', width: 110 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
  { title: '操作', slotName: 'ops', width: 200 },
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
        <a-form-item label="SLA">
          <a-select v-model="filters.slaClass" allow-clear placeholder="全部" style="width: 100px">
            <a-option v-for="p in meta.slaClasses" :key="p.value" :label="p.label" :value="p.value" />
          </a-select>
        </a-form-item>
        <a-form-item label="租户">
          <a-select v-model="filters.tenantCode" allow-clear placeholder="全部" style="width: 130px">
            <a-option v-for="t in meta.tenants" :key="t.value" :label="t.label" :value="t.value" />
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="loading" @click="onSearch">查询</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card>
      <a-empty v-if="!tasks?.length && !loading" description="暂无质控工单" />
      <a-table v-else :columns="scTableCols1" :data="tasks" row-key="id" :pagination="false" :loading="loading" size="small">
        <template #modality="{ record }">{{ getModalityMeta(record.modality)?.short || record.modality }}</template>
        <template #status="{ record }">{{ getStatusMeta(record.status)?.label || record.status }}</template>
        <template #slaClass="{ record }">
          <a-tag :color="record.slaClass === 'S' ? 'red' : record.slaClass === 'A' ? 'orangered' : 'gray'">{{ record.slaClass }}</a-tag>
        </template>
        <template #assignee="{ record }">{{ userLabel(record.assigneeId) }}</template>
        <template #progress="{ record }">{{ record.doneCount }}/{{ record.sampleCount }}</template>
        <template #ops="{ record }">
          <a-space>
            <a-button size="mini" @click="goAnnotate(record.id)">标注</a-button>
            <a-button size="mini" @click="goAudit(record.id)">审核</a-button>
            <a-button v-if="canCreate()" size="mini" @click="openAssign(record)">分配</a-button>
          </a-space>
        </template>
      </a-table>
      <div class="pager">
        <a-pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          show-total
          show-page-size
          :page-size-options="[10, 20, 50]"
        />
      </div>
    </a-card>

    <a-modal v-model:visible="createVisible" title="新建质控工单" width="480px">
      <a-form>
        <a-form-item label="标题" required>
          <a-input v-model="createForm.title" placeholder="例如：打包工位点云分割返修" />
        </a-form-item>
        <a-form-item label="模态" required>
          <a-select v-model="createForm.modality" style="width: 100%">
            <a-option v-for="m in meta.modalities" :key="m.value" :label="m.label" :value="m.value" />
          </a-select>
        </a-form-item>
        <a-form-item label="SLA 等级">
          <a-radio-group v-model="createForm.slaClass">
            <a-radio value="S">S</a-radio>
            <a-radio value="A">A</a-radio>
            <a-radio value="B">B</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="租户">
          <a-select v-model="createForm.tenantCode" style="width: 100%">
            <a-option v-for="t in meta.tenants" :key="t.value" :label="t.label" :value="t.value" />
          </a-select>
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
          :label="\`\${u.name}（\${u.pool}）\`"
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
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
`
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/views/qc/QcTaskList.vue', qcTaskList)
console.log('QcTaskList written', qcTaskList.length)
