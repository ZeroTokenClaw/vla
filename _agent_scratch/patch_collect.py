from pathlib import Path

# ---- CollectConfig.vue ----
path = Path(r'E:\omp\vla\vla-demo-element\src\views\vla\CollectConfig.vue')
text = path.read_text(encoding='utf-8')

old_script_bits = """const loading = ref(false)
const saving = ref(false)
const tasks = ref([])
const meta = reactive({
  modes: [],
  scenes: [],
  plans: [],
  actionTemplates: [],
  personnel: [],
})"""

new_script_bits = """const loading = ref(false)
const saving = ref(false)
const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filters = reactive({
  scene: '',
  mode: '',
  status: '',
  keyword: '',
})
const meta = reactive({
  modes: [],
  scenes: [],
  plans: [],
  actionTemplates: [],
  personnel: [],
})
const statusOptions = [
  { value: 'ready', label: 'ready' },
  { value: 'annotating', label: 'annotating' },
  { value: 'done', label: 'done' },
]"""

if old_script_bits not in text:
    raise SystemExit('CollectConfig script bits not found')
text = text.replace(old_script_bits, new_script_bits)

old_refresh = """async function refresh() {
  loading.value = true
  try {
    const m = listMeta()
    Object.assign(meta, m)
    tasks.value = await listVlaTasks()
  } finally {
    loading.value = false
  }
}"""

new_refresh = """async function refresh() {
  loading.value = true
  try {
    const m = listMeta()
    Object.assign(meta, m)
    const res = await listVlaTasks({
      page: page.value,
      pageSize: pageSize.value,
      scene: filters.scene || undefined,
      mode: filters.mode || undefined,
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
    })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
  } finally {
    loading.value = false
  }
}

async function onSearch() {
  page.value = 1
  await refresh()
}"""

if old_refresh not in text:
    raise SystemExit('CollectConfig refresh not found')
text = text.replace(old_refresh, new_refresh)

old_header = """          <template #header>
            <div class="card-head">
              <span>采集任务列表</span>
              <el-text type="info" size="small">前缀 DL-VLA-</el-text>
            </div>
          </template>

          <el-empty v-if="!tasks.length && !loading" description="暂无采集任务，请先创建" :image-size="72" />
          <el-table v-else :data="tasks" stripe size="small" empty-text="暂无采集任务">"""

# description may have encoding variance — find by unique markers
marker = '采集任务列表'
if marker not in text:
    raise SystemExit('header marker missing')

# Replace from filters insert before table: find the empty/table block more loosely
import re
pat = re.compile(
    r'(<template #header>\s*<div class="card-head">\s*<span>采集任务列表</span>.*?</template>\s*)'
    r'(<el-empty[\s\S]*?</el-empty>\s*)?'
    r'(<el-table[\s\S]*?</el-table>)',
    re.M,
)
m = pat.search(text)
if not m:
    raise SystemExit('CollectConfig table block not found')

replacement = '''<template #header>
            <div class="card-head">
              <span>采集任务列表（{{ total }}）</span>
              <el-text type="info" size="small">前缀 DL-VLA-</el-text>
            </div>
          </template>

          <el-form :inline="true" class="list-filters" @submit.prevent>
            <el-form-item label="关键词">
              <el-input v-model="filters.keyword" clearable placeholder="任务号/名称" style="width: 160px" />
            </el-form-item>
            <el-form-item label="场景">
              <el-select v-model="filters.scene" clearable placeholder="全部" style="width: 140px">
                <el-option v-for="s in meta.scenes" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="模式">
              <el-select v-model="filters.mode" clearable placeholder="全部" style="width: 140px">
                <el-option v-for="mo in meta.modes" :key="mo.value" :label="mo.label" :value="mo.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px">
                <el-option v-for="st in statusOptions" :key="st.value" :label="st.label" :value="st.value" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
            </el-form-item>
          </el-form>

          <el-empty v-if="!tasks.length && !loading" description="暂无采集任务，请先创建" :image-size="72" />
          <el-table v-else :data="tasks" stripe size="small" empty-text="暂无采集任务">'''

# Keep original table columns — only replace header+empty start through `<el-table ...>` opening tag
# Actually we need full table. Simpler: replace just before empty, and append pager after table.
# Let's do stepwise.

# 1) Update header span
text = text.replace('<span>采集任务列表</span>', '<span>采集任务列表（{{ total }}）</span>')

# 2) Insert filters before el-empty
empty_marker = '<el-empty v-if="!tasks.length && !loading"'
if empty_marker not in text:
    # try without exact
    idx = text.find('el-empty')
    raise SystemExit(f'empty marker missing, nearby: {text[idx:idx+120]!r}')

filters_block = '''          <el-form :inline="true" class="list-filters" @submit.prevent>
            <el-form-item label="关键词">
              <el-input v-model="filters.keyword" clearable placeholder="任务号/名称" style="width: 160px" />
            </el-form-item>
            <el-form-item label="场景">
              <el-select v-model="filters.scene" clearable placeholder="全部" style="width: 140px">
                <el-option v-for="s in meta.scenes" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="模式">
              <el-select v-model="filters.mode" clearable placeholder="全部" style="width: 140px">
                <el-option v-for="mo in meta.modes" :key="mo.value" :label="mo.label" :value="mo.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px">
                <el-option v-for="st in statusOptions" :key="st.value" :label="st.label" :value="st.value" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
            </el-form-item>
          </el-form>

          '''

if 'list-filters' not in text:
    text = text.replace(empty_marker, filters_block + empty_marker)

# 3) Add pager after table closing in the right card
table_end = '</el-table>\n        </el-card>'
pager = '''</el-table>
          <div class="pager">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next, sizes"
              :page-sizes="[10, 20, 50]"
              @current-change="refresh"
              @size-change="() => { page = 1; refresh() }"
            />
          </div>
        </el-card>'''
if table_end not in text:
    raise SystemExit('table_end not found')
if 'v-model:current-page="page"' not in text:
    text = text.replace(table_end, pager)

# 4) styles
if '.pager' not in text:
    text = text.replace(
        '</style>',
        '''.list-filters {
  margin-bottom: 8px;
}
.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>''',
    )

path.write_text(text, encoding='utf-8', newline='\n')
print('CollectConfig updated')
