const fs = require('fs')

// ========== QC SERVICE ==========
let qc = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/services/qc.js', 'utf8')
qc = qc.replace(
  `  REJECT_REASONS,
  PRIORITIES,
} from '@/mock/qc'`,
  `  REJECT_REASONS,
  URGENCIES,
  LANES,
} from '@/mock/qc'
import { paginate } from '@/mock/seed/paginate'`,
)
qc = qc.replace(
  `state.samplePool: createInitialSamplePool(),`,
  `state.samplePool: [],`,
)
// Fix state init - samplePool after tasks
qc = qc.replace(
  `const state = {
  tasks: createInitialTasks(),
  sampleRules: SAMPLE_RULES.map((r) => ({ ...r, modalities: [...r.modalities] })),
  samplePool: createInitialSamplePool(),
  lastSampleRun: null,
  seq: 340,
}`,
  `const state = {
  tasks: createInitialTasks(),
  sampleRules: SAMPLE_RULES.map((r) => ({ ...r, modalities: [...r.modalities] })),
  samplePool: [],
  lastSampleRun: null,
  seq: 340,
}
state.samplePool = createInitialSamplePool(state.tasks)`,
)
qc = qc.replace(
  `    priorities: PRIORITIES,
    users: users.map((u) => ({ id: u.id, name: u.name, role: u.role, dept: u.dept })),`,
  `    priorities: URGENCIES,
    urgencies: URGENCIES,
    lanes: LANES,
    users: users.map((u) => ({ id: u.id, name: u.name, role: u.role, squad: u.squad })),`,
)
qc = qc.replace(
  /export async function listQcTasks\(filters = \{\}\) \{[\s\S]*?return rows\.map\(\(t\) => \(\{ \.\.\.t \}\)\)\n\}/,
  `export async function listQcTasks(query = {}) {
  await businessDelay()
  const { page, pageSize, status, modality, urgency, lane, keyword } = query
  let rows = [...state.tasks]
  if (status) rows = rows.filter((t) => t.status === status)
  if (modality) rows = rows.filter((t) => t.modality === modality)
  if (urgency) rows = rows.filter((t) => t.urgency === urgency)
  if (lane) rows = rows.filter((t) => t.lane === lane)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((t) => t.id.includes(kw) || t.title.includes(kw))
  }
  const result = paginate(rows, { page, pageSize })
  return {
    ...result,
    items: result.items.map((t) => ({ ...t })),
  }
}`,
)
// createQcTask priority -> urgency
qc = qc.replace(
  /priority: payload\.priority \|\| 'medium',/,
  `urgency: payload.urgency || 'normal',
    lane: payload.lane || 'lane-alpha',
    bounceLog: [],`,
)
// transition rejected -> bounceLog
if (!qc.includes('bounceLog')) {
  qc = qc.replace(
    `  if (toStatus === 'rejected') {
    t.rejectReason = extra.rejectReason || 'other'
  }`,
    `  if (toStatus === 'rejected') {
    t.rejectReason = extra.rejectReason || 'other'
    if (!Array.isArray(t.bounceLog)) t.bounceLog = []
    t.bounceLog.push({
      at: now(),
      by: auth.user?.id || 'unknown',
      code: t.rejectReason,
      note: note || '',
    })
  }`,
  )
}
// listSamplePool pagination
qc = qc.replace(
  /export async function listSamplePool\(\) \{[\s\S]*?return state\.samplePool\.map\(\(s\) => \(\{ \.\.\.s \}\)\)\n\}/,
  `export async function listSamplePool(query = {}) {
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
}`,
)
qc = qc.replace(
  'export { SAMPLE_RESOURCES, MODALITIES, STATUS_FLOW, REJECT_REASONS, PRIORITIES, TRANSITIONS }',
  'export { SAMPLE_RESOURCES, MODALITIES, STATUS_FLOW, REJECT_REASONS, URGENCIES, LANES, TRANSITIONS }',
)
fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/services/qc.js', qc)
console.log('qc svc', qc.includes('paginate'), qc.includes('urgency'), !qc.includes('PRIORITIES'))