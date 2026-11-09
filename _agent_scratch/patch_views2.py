from pathlib import Path

p = Path(r'E:\omp\vla\vla-demo-element\src\views\qc\QcTaskList.vue')
text = p.read_text(encoding='utf-8')

if "priority: ''" not in text.split('const filters')[1][:200]:
    text = text.replace(
        "const filters = reactive({ keyword: '', status: '', modality: '' })",
        "const filters = reactive({ keyword: '', status: '', modality: '', priority: '' })\nconst page = ref(1)\nconst pageSize = ref(10)\nconst total = ref(0)",
    )

old_load = """async function load() {
  loading.value = true
  try {
    Object.assign(meta, listMeta())
    tasks.value = await listQcTasks({ ...filters })
  } finally {
    loading.value = false
  }
}"""

new_load = """async function load() {
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
}"""

if old_load not in text:
    raise SystemExit('load() not found')
text = text.replace(old_load, new_load)

text = text.replace(
    "async function onSearch() {\n  await load()\n}",
    "async function onSearch() {\n  page.value = 1\n  await load()\n}",
)

# Insert priority filter using modality v-model anchor
anchor = 'v-model="filters.modality"'
pos = text.find(anchor)
if pos < 0:
    raise SystemExit('modality filter missing')
# find closing </el-form-item> after this select
close = text.find('</el-form-item>', pos)
if close < 0:
    raise SystemExit('close form-item missing')
insert_at = close + len('</el-form-item>')
priority_block = """
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" clearable placeholder="全部" style="width: 120px">
            <el-option v-for="p in meta.priorities" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>"""
if 'filters.priority' not in text[text.find('<template>'):]:
    text = text[:insert_at] + priority_block + text[insert_at:]

# buCode column before 处理人
if 'prop="buCode"' not in text:
    marker = '<el-table-column label="处理人"'
    # try both 处理人 and unicode
    idx = text.find(marker)
    if idx < 0:
        # find by assignee column template
        idx = text.find('userLabel(row.assigneeId)')
        # walk back to el-table-column
        idx = text.rfind('<el-table-column', 0, idx)
    if idx < 0:
        raise SystemExit('assignee column not found')
    text = text[:idx] + '<el-table-column prop="buCode" label="事业部" width="100" />\n      ' + text[idx:]

# pagination before create dialog
if 'class="pager"' not in text:
    marker = '<el-dialog v-model="createVisible"'
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit('create dialog missing')
    pager = """    <div class="pager">
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

    """
    text = text[:idx] + pager + text[idx:]

if '.pager {' not in text:
    text = text.replace('</style>', """.pager {
  display: flex;
  justify-content: flex-end;
  margin: 12px 0 8px;
}
</style>""")

p.write_text(text, encoding='utf-8')
print('QcTaskList updated, len', len(text))

base = Path(r'E:\omp\vla\vla-demo-element\src\views\qc')

wb = (base / 'WorkflowBoard.vue').read_text(encoding='utf-8')
wb2 = wb
wb2 = wb2.replace(
    '    tasks.value = await listQcTasks()',
    "    const res = await listQcTasks({ page: 1, pageSize: 500 })\n    tasks.value = res.items",
)
wb2 = wb2.replace(
    'const latest = (await listQcTasks()).find((x) => x.id === t.id)',
    "const latest = (await listQcTasks({ page: 1, pageSize: 500 })).items.find((x) => x.id === t.id)",
)
wb2 = wb2.replace(
    'const cur = (await listQcTasks()).find((x) => x.id === t.id) || t',
    "const cur = (await listQcTasks({ page: 1, pageSize: 500 })).items.find((x) => x.id === t.id) || t",
)
if wb2 == wb:
    raise SystemExit('WorkflowBoard no changes')
(base / 'WorkflowBoard.vue').write_text(wb2, encoding='utf-8')
print('WorkflowBoard', wb.count('listQcTasks'), '->', wb2.count('listQcTasks'))

aw = (base / 'AnnotateWorkbench.vue').read_text(encoding='utf-8')
aw2 = aw.replace(
    '  taskList.value = await listQcTasks()',
    "  const res = await listQcTasks({ page: 1, pageSize: 500 })\n  taskList.value = res.items",
)
if aw2 == aw:
    raise SystemExit('AnnotateWorkbench no changes')
(base / 'AnnotateWorkbench.vue').write_text(aw2, encoding='utf-8')
print('AnnotateWorkbench ok')

ap = (base / 'AuditPanel.vue').read_text(encoding='utf-8')
ap2 = ap.replace(
    '  tasks.value = await listQcTasks()',
    "  const res = await listQcTasks({ page: 1, pageSize: 500 })\n  tasks.value = res.items",
)
if ap2 == ap:
    raise SystemExit('AuditPanel no changes')
(base / 'AuditPanel.vue').write_text(ap2, encoding='utf-8')
print('AuditPanel ok')

sc = (base / 'SampleCheck.vue').read_text(encoding='utf-8')
sc2 = sc.replace(
    '    pool.value = await listSamplePool()',
    "    const poolRes = await listSamplePool({ page: 1, pageSize: 500 })\n    pool.value = poolRes.items",
)
if sc2 == sc:
    raise SystemExit('SampleCheck no changes')
(base / 'SampleCheck.vue').write_text(sc2, encoding='utf-8')
print('SampleCheck ok')

# verify remaining array-style callers
root = Path(r'E:\omp\vla\vla-demo-element\src')
for f in root.rglob('*'):
    if f.suffix not in {'.js', '.vue'}:
        continue
    t = f.read_text(encoding='utf-8')
    if 'await listQcTasks()' in t or 'await listSamplePool()' in t:
        print('STILL ARRAY CALLER', f)
print('done')
