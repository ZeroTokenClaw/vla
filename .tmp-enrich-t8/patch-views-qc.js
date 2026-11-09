const fs = require('fs')

function patchFile(p, fn) {
  let s = fs.readFileSync(p, 'utf8')
  const n = fn(s)
  fs.writeFileSync(p, n)
  console.log('patched', p.split('vla-demo-naive/')[1] || p)
}

// ---- QcTaskList.vue ----
patchFile('E:/omp/vla/vla-demo-naive/src/views/qc/QcTaskList.vue', (s) => {
  s = s.replace(
    `const loading = ref(false)
const tasks = ref([])
const meta = reactive({ modalities: [], statuses: [], priorities: [], users: [] })
const filters = reactive({ keyword: '', status: '', modality: '' })`,
    `const loading = ref(false)
const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const meta = reactive({ modalities: [], statuses: [], urgencies: [], lanes: [], users: [] })
const filters = reactive({ keyword: '', status: '', modality: '', urgency: '', lane: '' })`,
  )
  s = s.replace(
    `const createForm = reactive({
  title: '',
  modality: 'text_ner',
  priority: 'medium',
  sampleCount: 20,
  batchId: '',
})`,
    `const createForm = reactive({
  title: '',
  modality: 'text_ner',
  urgency: 'normal',
  lane: 'lane-alpha',
  sampleCount: 20,
  batchId: '',
})`,
  )
  s = s.replace(
    `    tasks.value = await listQcTasks({ ...filters })`,
    `    const res = await listQcTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page`,
  )
  s = s.replace(
    `annotators.map(u => ({ label: \`\${u.name}（\${u.dept}）\`, value: u.id }))`,
    `annotators.map(u => ({ label: \`\${u.name}（\${u.squad}）\`, value: u.id }))`,
  )
  // Add urgency/lane filters in template
  s = s.replace(
    `        <n-form-item label="模态">
          <n-select v-model="filters.modality" clearable placeholder="全部" style="width: 150px" :options="meta.modalities.map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>
        <n-form-item>
          <n-button type="primary" :loading="loading" @click="onSearch">查询</n-button>
        </n-form-item>`,
    `        <n-form-item label="模态">
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
        </n-form-item>`,
  )
  s = s.replace(
    `        <n-form-item label="优先级">
          <n-radio-group v-model="createForm.priority">
            <n-radio value="high">高</n-radio>
            <n-radio value="medium">中</n-radio>
            <n-radio value="low">低</n-radio>
          </n-radio-group>
        </n-form-item>`,
    `        <n-form-item label="紧急度">
          <n-radio-group v-model="createForm.urgency">
            <n-radio value="urgent">紧急</n-radio>
            <n-radio value="normal">普通</n-radio>
            <n-radio value="backlog">积压</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="通道">
          <n-select v-model="createForm.lane" style="width: 100%" :options="(meta.lanes||[]).map(m => ({ label: m.label, value: m.value }))"></n-select>
        </n-form-item>`,
  )
  // columns + pagination
  s = s.replace(
    `const lmTableCols1 = [
  
]`,
    `const lmTableCols1 = [
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
      return \`\${row.doneCount}/\${row.sampleCount}\`
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
]`,
  )
  if (!s.includes("import { h }")) {
    s = s.replace(
      "import { computed, onMounted, reactive, ref } from 'vue'",
      "import { computed, h, onMounted, reactive, ref } from 'vue'",
    )
  }
  s = s.replace(
    `    <n-card>
      <n-empty v-if="!tasks?.length && !loading" description="暂无质控工单" />
    <n-data-table :columns="lmTableCols1" :data="tasks" :row-key="(r) => r.id" size="small" :bordered="false" :single-line="false"></n-data-table>
    </n-card>`,
    `    <n-card>
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
          @update:page-size="() => { page = 1; load() }"
        />
      </div>
    </n-card>`,
  )
  return s
})