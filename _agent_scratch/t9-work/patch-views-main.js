const fs = require('fs')

// ---- CollectConfig: add filters/pagination ----
let cc = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/views/vla/CollectConfig.vue', 'utf8')
if (!cc.includes('pageSize')) {
  cc = cc.replace(
    "import { onMounted, reactive, ref } from 'vue'",
    "import { onMounted, reactive, ref, watch } from 'vue'",
  )
  cc = cc.replace(
    'const tasks = ref([])\nconst meta = reactive({',
    `const tasks = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', status: '', scene: '' })
const meta = reactive({`,
  )
  cc = cc.replace(
    /async function refresh\(\) \{\n  loading\.value = true\n  try \{\n    const m = listMeta\(\)\n    Object\.assign\(meta, m\)\n    tasks\.value = await listVlaTasks\(\)\n  \} finally \{\n    loading\.value = false\n  \}\n\}/,
    `async function refresh() {
  loading.value = true
  try {
    const m = listMeta()
    Object.assign(meta, m)
    const res = await listVlaTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
  } finally {
    loading.value = false
  }
}

async function onSearch() {
  page.value = 1
  await refresh()
}`,
  )
  // in case callers already patched to .items without query
  cc = cc.replace(
    'tasks.value = (await listVlaTasks({ page: 1, pageSize: 200 })).items',
    `const res = await listVlaTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize`,
  )
  cc = cc.replace('onMounted(refresh)', 'onMounted(refresh)\nwatch([page, pageSize], refresh)')
  cc = cc.replace(
    'const scTableCols1 = [\n  \n]',
    `const scTableCols1 = [
  { title: '任务号', dataIndex: 'id', width: 160 },
  { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '场景', slotName: 'scene', width: 120 },
  { title: '方案', dataIndex: 'plan', width: 120 },
  { title: '模式', dataIndex: 'mode', width: 100 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '操作', slotName: 'ops', width: 180 },
]`,
  )
  // Add filter UI + pagination before/after table
  if (!cc.includes('filters.scene') && cc.includes('<a-table :columns="scTableCols1"')) {
    cc = cc.replace(
      '<a-table :columns="scTableCols1" :data="tasks" row-key="id" :pagination="false" size="small"></a-table>',
      `<div class="list-filters">
            <a-input v-model="filters.keyword" allow-clear placeholder="关键字" style="width: 140px; margin-right: 8px" />
            <a-select v-model="filters.scene" allow-clear placeholder="场景" style="width: 140px; margin-right: 8px">
              <a-option v-for="s in meta.scenes" :key="s.value" :label="s.label" :value="s.value" />
            </a-select>
            <a-select v-model="filters.status" allow-clear placeholder="状态" style="width: 120px; margin-right: 8px">
              <a-option value="ready" label="ready" />
              <a-option value="annotating" label="annotating" />
              <a-option value="done" label="done" />
            </a-select>
            <a-button type="primary" size="small" @click="onSearch">查询</a-button>
          </div>
          <a-table :columns="scTableCols1" :data="tasks" row-key="id" :pagination="false" size="small">
            <template #scene="{ record }">{{ labelOf(meta.scenes, record.scene) }}</template>
            <template #ops="{ record }">
              <a-space>
                <a-button size="mini" @click="goAnnotate(record.id)">标注</a-button>
                <a-button size="mini" @click="goQuality(record.id)">质检</a-button>
              </a-space>
            </template>
          </a-table>
          <div class="pager">
            <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-total show-page-size :page-size-options="[10,20,50]" />
          </div>`,
    )
  }
  if (!cc.includes('.pager')) {
    cc = cc.replace(
      '</style>',
      `.list-filters { margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>`,
    )
  }
}
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/views/vla/CollectConfig.vue', cc)
console.log('CollectConfig', cc.includes('pageSize'), cc.includes('filters.scene'))

// ---- AlgoConfig ----
let ac = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/views/train/AlgoConfig.vue', 'utf8')
if (!ac.includes('pageSize')) {
  ac = ac.replace(
    /import \{([^}]+)\} from 'vue'/,
    (m, inner) => {
      const parts = inner.split(',').map((x) => x.trim()).filter(Boolean)
      if (!parts.includes('watch')) parts.push('watch')
      return `import { ${parts.join(', ')} } from 'vue'`
    },
  )
  ac = ac.replace(
    'const experiments = ref([])',
    `const experiments = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const listFilters = reactive({ keyword: '', status: '', algorithm: '' })`,
  )
  // ensure reactive imported
  if (!ac.includes('reactive')) {
    ac = ac.replace(/import \{([^}]+)\} from 'vue'/, (m, inner) => {
      const parts = inner.split(',').map((x) => x.trim()).filter(Boolean)
      if (!parts.includes('reactive')) parts.push('reactive')
      return `import { ${parts.join(', ')} } from 'vue'`
    })
  }
  ac = ac.replace(
    /experiments\.value = await listExperiments\(\)/,
    `const res = await listExperiments({ ...listFilters, page: page.value, pageSize: pageSize.value })
    experiments.value = res.items
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize`,
  )
  ac = ac.replace(
    /experiments\.value = \(await listExperiments\(\{ page: 1, pageSize: 200 \}\)\)\.items/,
    `const res = await listExperiments({ ...listFilters, page: page.value, pageSize: pageSize.value })
    experiments.value = res.items
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize`,
  )
  if (!ac.includes('watch([page, pageSize]')) {
    ac = ac.replace('onMounted(refresh)', 'onMounted(refresh)\nwatch([page, pageSize], refresh)')
  }
  ac = ac.replace(
    'const scTableCols1 = [\n  \n]',
    `const scTableCols1 = [
  { title: '实验号', dataIndex: 'id', width: 150 },
  { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '算法', dataIndex: 'algorithm', width: 120 },
  { title: '模型', dataIndex: 'model', width: 120 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: 'Epoch', slotName: 'epoch', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
]
function onListSearch() { page.value = 1; refresh() }`,
  )
  if (!ac.includes('listFilters.status') && ac.includes(':data="experiments"')) {
    ac = ac.replace(
      '<a-table :columns="scTableCols1" :data="experiments" row-key="id" :pagination="false" size="small"></a-table>',
      `<div class="list-filters">
            <a-input v-model="listFilters.keyword" allow-clear placeholder="关键字" style="width: 140px; margin-right: 8px" />
            <a-select v-model="listFilters.status" allow-clear placeholder="状态" style="width: 120px; margin-right: 8px">
              <a-option value="draft" label="draft" />
              <a-option value="ready" label="ready" />
              <a-option value="running" label="running" />
              <a-option value="finished" label="finished" />
            </a-select>
            <a-select v-model="listFilters.algorithm" allow-clear placeholder="算法" style="width: 160px; margin-right: 8px">
              <a-option v-for="a in meta.algorithms" :key="a.value" :label="a.label" :value="a.value" />
            </a-select>
            <a-button type="primary" size="small" @click="onListSearch">查询</a-button>
          </div>
          <a-table :columns="scTableCols1" :data="experiments" row-key="id" :pagination="false" size="small">
            <template #epoch="{ record }">{{ record.currentEpoch }}/{{ record.epochs }}</template>
          </a-table>
          <div class="pager">
            <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-total show-page-size :page-size-options="[10,20,50]" />
          </div>`,
    )
  }
  if (!ac.includes('.pager {')) {
    ac = ac.replace('</style>', `.list-filters { margin-bottom: 8px; display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
.pager { display:flex; justify-content:flex-end; margin-top:12px; }
</style>`)
  }
}
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/views/train/AlgoConfig.vue', ac)
console.log('AlgoConfig', ac.includes('pageSize'), ac.includes('listFilters'))
