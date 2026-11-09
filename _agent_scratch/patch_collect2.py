from pathlib import Path
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
    raise SystemExit('script bits not found')
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
    raise SystemExit('refresh not found')
text = text.replace(old_refresh, new_refresh)

text = text.replace('<span>采集任务列表</span>', '<span>采集任务列表（{{ total }}）</span>')

empty_marker = '<el-empty v-if="!tasks.length && !loading"'
if 'list-filters' not in text:
    if empty_marker not in text:
        raise SystemExit('empty marker missing: ' + repr(text[text.find('el-empty'):text.find('el-empty')+80]))
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
    text = text.replace(empty_marker, filters_block + empty_marker, 1)

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
if 'v-model:current-page="page"' not in text:
    if table_end not in text:
        # try CRLF
        table_end2 = '</el-table>\r\n        </el-card>'
        if table_end2 in text:
            text = text.replace(table_end2, pager.replace('\n', '\r\n'))
        else:
            # find and show
            i = text.find('</el-table>')
            raise SystemExit('table_end missing near: ' + repr(text[i:i+40]))
    else:
        text = text.replace(table_end, pager)

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
print('CollectConfig OK')
assert 'const page = ref(1)' in path.read_text(encoding='utf-8')
assert 'list-filters' in path.read_text(encoding='utf-8')
