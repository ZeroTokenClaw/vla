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
    message.warning('璇峰～鍐欏伐鍗曟爣棰?)
    return
  }
  const t = await createQcTask({ ...createForm })
  message.success(`宸插垱寤哄伐鍗?${t.id}`)
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
    message.warning('璇烽€夋嫨澶勭悊浜?)
    return
  }
  await assignTask(assignTarget.value.id, assignUserId.value)
  message.success('鍒嗛厤鎴愬姛')
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
  return meta.users.find((u) => u.id === id)?.name || '鈥?
}

function canCreate() {
  return auth.role === 'admin' || auth.role === 'reviewer'
}

defineExpose({ openCreate: () => { createVisible.value = true } })
const lmTableCols1 = [
  { title: '宸ュ崟鍙?, key: 'id', width: 160 },
  {
    title: '鏍囬',
    key: 'title',
    ellipsis: { tooltip: true },
  },
  {
    title: '鐘舵€?,
    key: 'status',
    width: 100,
    render(row) {
      return getStatusMeta(row.status)?.label || row.status
    },
  },
  {
    title: '绱ф€ュ害',
    key: 'urgency',
    width: 90,
    render(row) {
      return row.urgency
    },
  },
  {
    title: '閫氶亾',
    key: 'lane',
    width: 110,
    render(row) {
      return row.lane
    },
  },
  {
    title: '澶勭悊浜?,
    key: 'assigneeId',
    width: 100,
    render(row) {
      return userLabel(row.assigneeId)
    },
  },
  {
    title: '杩涘害',
    key: 'progress',
    width: 100,
    render(row) {
      return `${row.doneCount}/${row.sampleCount}`
    },
  },
  {
    title: '鎿嶄綔',
    key: 'actions',
    width: 220,
    render(row) {
      return [
        h(
          'a',
          { style: 'margin-right:8px;cursor:pointer', onClick: () => goAnnotate(row.id) },
          '鏍囨敞',
        ),
        h(
          'a',
          { style: 'margin-right:8px;cursor:pointer', onClick: () => openAssign(row) },
          '鍒嗛厤',
        ),
        h('a', { style: 'cursor:pointer', onClick: () => goAudit(row.id) }, '瀹℃牳'),
      ]
    },
  },
]
</script>

<template>
  <div>
    <div class="list-actions">
      <n-button v-if="canCreate()" type="primary" @click="createVisible = true">鏂板缓宸ュ崟</n-button>
    </div>
    <n-card class="filter-card">
      <n-form :="true" @submit.prevent>
        <n-form-item label="鍏抽敭瀛?>
          <n-input v-model="filters.keyword" clearable placeholder="宸ュ崟鍙?鏍囬" style="width: 180px" />
        </n-form-item>
        <n-form-item label="鐘舵€?>
          <n-select v-model="filters.status" clearable placeholder="鍏ㄩ儴" style="width: 130px" :options="meta.statuses.map(s => ({ label: s.label, value: s.value }))"></n-select>
        </n-form-item>
        <n-form-item label="妯℃€?>
          <n-select v-model="filters.modality" clearable placeholder="鍏ㄩ儴" style="width: 150px" :options="meta.modalities.map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item label="绱ф€ュ害">
          <n-select v-model="filters.urgency" clearable placeholder="鍏ㄩ儴" style="width: 120px" :options="(meta.urgencies||[]).map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item label="閫氶亾">
          <n-select v-model="filters.lane" clearable placeholder="鍏ㄩ儴" style="width: 130px" :options="(meta.lanes||[]).map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="() => { page.value = 1; onSearch() }">鏌ヨ</n-button>
        </n-form-item>
      </n-form>
    </n-card>

    <n-card>
      <n-empty v-if="!tasks?.length && !loading" description="鏆傛棤璐ㄦ帶宸ュ崟" />
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

    <n-modal v-model:show="createVisible" title="鏂板缓璐ㄦ帶宸ュ崟" width="480px">
      <n-form>
        <n-form-item label="鏍囬" required>
          <n-input v-model="createForm.title" placeholder="渚嬪锛氶棬鍘呭紑闂ㄧ偣浜戝垎鍓茶繑淇? />
        </n-form-item>
        <n-form-item label="妯℃€? required>
          <n-select v-model="createForm.modality" style="width: 100%" :options="meta.modalities.map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item label="绱ф€ュ害">
          <n-radio-group v-model="createForm.urgency">
            <n-radio value="urgent">绱ф€?/n-radio>
            <n-radio value="normal">鏅€?/n-radio>
            <n-radio value="backlog">绉帇</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="閫氶亾">
          <n-select v-model="createForm.lane" style="width: 100%" :options="(meta.lanes||[]).map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item label="鏍锋湰鏁?>
          <n-input-number v-model="createForm.sampleCount" :min="1" :max="500" />
        </n-form-item>
        <n-form-item label="鎵规鍙?>
          <n-input v-model="createForm.batchId" placeholder="鍙€? />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-button @click="createVisible = false">鍙栨秷</n-button>
        <n-button type="primary" @click="onCreate">鍒涘缓</n-button>
      </template>
    </n-modal>

    <n-modal v-model:show="assignVisible" title="浜哄憳鍒嗛厤" width="420px">
      <p class="hint">宸ュ崟 {{ assignTarget?.id }} 路 {{ assignTarget?.title }}</p>
      <n-select v-model="assignUserId" placeholder="閫夋嫨鏍囨敞鍛? style="width: 100%" :options="annotators.map(u => ({ label: `${u.name}锛?{u.squad}锛塦, value: u.id }))"></n-select>
      <template #footer>
        <n-button @click="assignVisible = false">鍙栨秷</n-button>
        <n-button type="primary" @click="confirmAssign">纭鍒嗛厤</n-button>
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

