from pathlib import Path

# --- users.js: expand dept variety, keep dept field name ---
users = Path(r'E:\omp\vla\vla-demo-element\src\mock\users.js')
users.write_text("""/** Demo accounts for DataLink Label role switching. */
export const users = [
  {
    id: 'u-dl-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    dept: '标注运营中心',
  },
  {
    id: 'u-dl-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    dept: '质检一组',
  },
  {
    id: 'u-dl-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    dept: '标注二组',
  },
  {
    id: 'u-dl-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    dept: '视觉标注组',
  },
  {
    id: 'u-dl-reviewer-2',
    name: '韩清扬',
    role: 'reviewer',
    account: 'han.qy',
    dept: '质检二组',
  },
  {
    id: 'u-dl-annotator-3',
    name: '许岚',
    role: 'annotator',
    account: 'xu.lan',
    dept: '语音标注组',
  },
  {
    id: 'u-dl-annotator-4',
    name: '丁一鸣',
    role: 'annotator',
    account: 'ding.ym',
    dept: '点云专项组',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]
""", encoding='utf-8')
print('users.js updated')

# --- services/qc.js ---
svc = Path(r'E:\omp\vla\vla-demo-element\src\services\qc.js')
text = svc.read_text(encoding='utf-8')

if "from '@/mock/seed/paginate'" not in text:
    text = text.replace(
        "import {\n  createInitialTasks,\n  createInitialSamplePool,",
        "import { paginate } from '@/mock/seed/paginate'\nimport {\n  createInitialTasks,\n  createInitialSamplePool,",
    )

# Fix state init to pass tasks into sample pool
text = text.replace(
    """const state = {
  tasks: createInitialTasks(),
  sampleRules: SAMPLE_RULES.map((r) => ({ ...r, modalities: [...r.modalities] })),
  samplePool: createInitialSamplePool(),
  lastSampleRun: null,
  seq: 340,
}""",
    """const _tasks = createInitialTasks()
const state = {
  tasks: _tasks,
  sampleRules: SAMPLE_RULES.map((r) => ({ ...r, modalities: [...r.modalities] })),
  samplePool: createInitialSamplePool(_tasks),
  lastSampleRun: null,
  seq: 340,
}""",
)

# Replace listQcTasks
old_list = """export async function listQcTasks(filters = {}) {
  await businessDelay()
  let rows = [...state.tasks]
  if (filters.status) rows = rows.filter((t) => t.status === filters.status)
  if (filters.modality) rows = rows.filter((t) => t.modality === filters.modality)
  if (filters.keyword) {
    const kw = String(filters.keyword).trim()
    rows = rows.filter((t) => t.id.includes(kw) || t.title.includes(kw))
  }
  return rows.map((t) => ({ ...t }))
}"""

new_list = """export async function listQcTasks(query = {}) {
  await businessDelay()
  const { page, pageSize, status, modality, priority, keyword } = query
  let rows = [...state.tasks]
  if (status) rows = rows.filter((t) => t.status === status)
  if (modality) rows = rows.filter((t) => t.modality === modality)
  if (priority) rows = rows.filter((t) => t.priority === priority)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((t) => t.id.includes(kw) || t.title.includes(kw))
  }
  const result = paginate(rows, { page, pageSize })
  return {
    ...result,
    items: result.items.map((t) => ({ ...t })),
  }
}"""

if old_list not in text:
    raise SystemExit('listQcTasks block not found')
text = text.replace(old_list, new_list)

old_pool = """export async function listSamplePool(filters = {}) {
  await businessDelay()
  let rows = [...state.samplePool]
  if (filters.status) rows = rows.filter((s) => s.status === filters.status)
  if (filters.modality) rows = rows.filter((s) => s.modality === filters.modality)
  return rows
}"""

new_pool = """export async function listSamplePool(query = {}) {
  await businessDelay()
  const { page, pageSize, status, modality, keyword } = query
  let rows = [...state.samplePool]
  if (status) rows = rows.filter((s) => s.status === status)
  if (modality) rows = rows.filter((s) => s.modality === modality)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((s) => s.id.includes(kw) || (s.title || '').includes(kw) || (s.taskId || '').includes(kw))
  }
  const result = paginate(rows, { page, pageSize })
  return {
    ...result,
    items: result.items.map((s) => ({ ...s })),
  }
}"""

if old_pool not in text:
    raise SystemExit('listSamplePool block not found')
text = text.replace(old_pool, new_pool)

# enrich createQcTask with buCode / rejectChain
if "buCode:" not in text.split('export async function createQcTask')[1][:800]:
    text = text.replace(
        "priority: payload.priority || 'medium',\n    creatorId:",
        "priority: payload.priority || 'medium',\n    buCode: payload.buCode || 'BU-华东',\n    creatorId:",
    )
    text = text.replace(
        "rejectReason: null,\n    labelsSnapshot:",
        "rejectReason: null,\n    rejectChain: [],\n    labelsSnapshot:",
    )

# On reject transition, append rejectChain
needle = """  if (toStatus === 'rejected') {
    t.rejectReason = extra.rejectReason || 'other'
  }"""
repl = """  if (toStatus === 'rejected') {
    t.rejectReason = extra.rejectReason || 'other'
    if (!Array.isArray(t.rejectChain)) t.rejectChain = []
    t.rejectChain.push({
      at: now(),
      by: auth.user?.id || 'unknown',
      reason: t.rejectReason,
    })
  }"""
if needle in text:
    text = text.replace(needle, repl)

svc.write_text(text, encoding='utf-8')
print('services/qc.js updated')
