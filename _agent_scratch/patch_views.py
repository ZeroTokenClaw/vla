from pathlib import Path

# --- QcTaskList.vue ---
p = Path(r'E:\omp\vla\vla-demo-element\src\views\qc\QcTaskList.vue')
text = p.read_text(encoding='utf-8')

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
    raise SystemExit('QcTaskList load() not found')
text = text.replace(old_load, new_load)

# reset page on search
text = text.replace(
    "async function onSearch() {\n  await load()\n}",
    "async function onSearch() {\n  page.value = 1\n  await load()\n}",
)

# Add priority filter in form after modality form-item
modality_item = """      <el-form-item label="模态">
        <el-select v-model="filters.modality" clearable placeholder="全部" style="width: 150px">
          <el-option v-for="m in meta.modalities" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
      </el-form-item>
      <el-form-item>"""

modality_with_priority = """      <el-form-item label="模态">
        <el-select v-model="filters.modality" clearable placeholder="全部" style="width: 150px">
          <el-option v-for="m in meta.modalities" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-select v-model="filters.priority" clearable placeholder="全部" style="width: 120px">
          <el-option v-for="p in meta.priorities" :key="p.value" :label="p.label" :value="p.value" />
        </el-select>
      </el-form-item>
      <el-form-item>"""

if modality_item not in text:
    raise SystemExit('modality form item not found')
text = text.replace(modality_item, modality_with_priority)

# Add buCode column after priority column - look for 优先级 column end
# Add pagination before create dialog
pagination = """
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

    <el-dialog v-model="createVisible\""""

if '<div class="pager">' not in text:
    marker = '    <el-dialog v-model="createVisible"'
    if marker not in text:
        raise SystemExit('create dialog marker missing')
    text = text.replace(marker, pagination, 1)

# Add buCode column - after priority table column
prio_col_end = """      <el-table-column label="优先级" width="80">
        <template #default="{ row }">
          <el-tag
            size="small"
            :type="row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'info'"
          >
            {{ row.priority === 'high' ? '高' : row.priority === 'medium' ? '中' : '低' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="处理人" width="100">"""

prio_with_bu = """      <el-table-column label="优先级" width="80">
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
      <el-table-column label="处理人" width="100">"""

if prio_col_end in text:
    text = text.replace(prio_col_end, prio_with_bu)
else:
    print('WARN: priority column pattern not exact; trying loose insert')
    if 'prop="buCode"' not in text and 'label="处理人"' in text:
        text = text.replace(
            '<el-table-column label="处理人" width="100">',
            '<el-table-column prop="buCode" label="事业部" width="100" />\n      <el-table-column label="处理人" width="100">',
            1,
        )

# style for pager
if '.pager' not in text:
    text = text.replace(
        '.filter-card {\n  margin-bottom: 12px;\n}',
        '.filter-card {\n  margin-bottom: 12px;\n}\n.pager {\n  display: flex;\n  justify-content: flex-end;\n  margin: 12px 0 8px;\n}',
    )

p.write_text(text, encoding='utf-8')
print('QcTaskList.vue updated')

# --- WorkflowBoard / AnnotateWorkbench / AuditPanel / SampleCheck ---
def patch_list_call(path, old, new, label):
    t = Path(path).read_text(encoding='utf-8')
    if old not in t:
        raise SystemExit(f'{label}: pattern not found: {old!r}')
    Path(path).write_text(t.replace(old, new), encoding='utf-8')
    print(label, 'ok')

base = Path(r'E:\omp\vla\vla-demo-element\src\views\qc')

# WorkflowBoard
wb = (base / 'WorkflowBoard.vue').read_text(encoding='utf-8')
wb = wb.replace(
    '    tasks.value = await listQcTasks()',
    "    const res = await listQcTasks({ page: 1, pageSize: 500 })\n    tasks.value = res.items",
)
wb = wb.replace(
    '    const latest = (await listQcTasks()).find((x) => x.id === t.id)',
    "    const latest = (await listQcTasks({ page: 1, pageSize: 500 })).items.find((x) => x.id === t.id)",
)
wb = wb.replace(
    '    const cur = (await listQcTasks()).find((x) => x.id === t.id) || t',
    "    const cur = (await listQcTasks({ page: 1, pageSize: 500 })).items.find((x) => x.id === t.id) || t",
)
(base / 'WorkflowBoard.vue').write_text(wb, encoding='utf-8')
print('WorkflowBoard ok')

aw = (base / 'AnnotateWorkbench.vue').read_text(encoding='utf-8')
aw = aw.replace(
    '  taskList.value = await listQcTasks()',
    "  const res = await listQcTasks({ page: 1, pageSize: 500 })\n  taskList.value = res.items",
)
(base / 'AnnotateWorkbench.vue').write_text(aw, encoding='utf-8')
print('AnnotateWorkbench ok')

ap = (base / 'AuditPanel.vue').read_text(encoding='utf-8')
ap = ap.replace(
    '  tasks.value = await listQcTasks()',
    "  const res = await listQcTasks({ page: 1, pageSize: 500 })\n  tasks.value = res.items",
)
(base / 'AuditPanel.vue').write_text(ap, encoding='utf-8')
print('AuditPanel ok')

sc = (base / 'SampleCheck.vue').read_text(encoding='utf-8')
sc = sc.replace(
    '    pool.value = await listSamplePool()',
    "    const poolRes = await listSamplePool({ page: 1, pageSize: 500 })\n    pool.value = poolRes.items",
)
(base / 'SampleCheck.vue').write_text(sc, encoding='utf-8')
print('SampleCheck ok')
