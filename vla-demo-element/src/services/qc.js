import dayjs from 'dayjs'
import { businessDelay } from './delay'
import { pushAudit } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { users } from '@/mock/users'
import { paginate } from '@/mock/seed/paginate'
import {
  createInitialTasks,
  createInitialSamplePool,
  SAMPLE_RULES,
  SAMPLE_RESOURCES,
  SPEC_SECTIONS,
  TRANSITIONS,
  MODALITIES,
  STATUS_FLOW,
  REJECT_REASONS,
  PRIORITIES,
} from '@/mock/qc'

const _tasks = createInitialTasks()
const state = {
  tasks: _tasks,
  sampleRules: SAMPLE_RULES.map((r) => ({ ...r, modalities: [...r.modalities] })),
  samplePool: createInitialSamplePool(_tasks),
  lastSampleRun: null,
  seq: 340,
}

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function actorName() {
  const auth = useAuthStore()
  return auth.user?.name || '系统'
}

function findTask(id) {
  return state.tasks.find((t) => t.id === id)
}

function userName(userId) {
  return users.find((u) => u.id === userId)?.name || userId
}

export function getModalityMeta(value) {
  return MODALITIES.find((m) => m.value === value)
}

export function getStatusMeta(value) {
  return STATUS_FLOW.find((s) => s.value === value)
}

export function listMeta() {
  return {
    modalities: MODALITIES,
    statuses: STATUS_FLOW,
    rejectReasons: REJECT_REASONS,
    priorities: PRIORITIES,
    users: users.map((u) => ({ id: u.id, name: u.name, role: u.role, dept: u.dept })),
  }
}

export async function listQcTasks(query = {}) {
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
}

export async function getQcTask(id) {
  await businessDelay()
  const t = findTask(id)
  if (!t) throw new Error(`工单不存在：${id}`)
  return {
    ...t,
    comments: [...t.comments],
    history: [...t.history],
    collaborators: [...t.collaborators],
    labelsSnapshot: JSON.parse(JSON.stringify(t.labelsSnapshot)),
    resource: SAMPLE_RESOURCES[t.modality]
      ? JSON.parse(JSON.stringify(SAMPLE_RESOURCES[t.modality]))
      : null,
  }
}

export async function createQcTask(payload) {
  await businessDelay()
  const auth = useAuthStore()
  state.seq += 1
  const id = `DL-2026-1104-${String(state.seq).padStart(4, '0')}`
  const task = {
    id,
    title: payload.title || '未命名工单',
    modality: payload.modality || 'text_ner',
    status: 'created',
    priority: payload.priority || 'medium',
    buCode: payload.buCode || 'BU-华东',
    creatorId: auth.user?.id || 'u-dl-admin',
    assigneeId: null,
    collaborators: [],
    createdAt: now(),
    updatedAt: now(),
    batchId: payload.batchId || `BATCH-NEW-${state.seq}`,
    sampleCount: payload.sampleCount || 10,
    doneCount: 0,
    resourceId: SAMPLE_RESOURCES[payload.modality || 'text_ner']?.id,
    comments: [],
    history: [{ at: now(), actor: actorName(), action: '创建工单', note: '' }],
    rejectReason: null,
    rejectChain: [],
    labelsSnapshot: JSON.parse(
      JSON.stringify(
        SAMPLE_RESOURCES[payload.modality || 'text_ner']?.entities ||
          SAMPLE_RESOURCES[payload.modality || 'text_ner']?.masks ||
          SAMPLE_RESOURCES[payload.modality || 'text_ner']?.slices ||
          SAMPLE_RESOURCES[payload.modality || 'text_ner']?.detections ||
          SAMPLE_RESOURCES[payload.modality || 'text_ner']?.segments ||
          [],
      ),
    ),
  }
  state.tasks.unshift(task)
  pushAudit({ action: '创建质控工单', detail: `${id} · ${task.title}` })
  return { ...task }
}

export async function assignTask(id, userId) {
  await businessDelay()
  const t = findTask(id)
  if (!t) throw new Error(`工单不存在：${id}`)
  if (!['created', 'assigned', 'rejected'].includes(t.status) && t.status !== 'annotating') {
    // allow reassign from created/assigned primarily
  }
  t.assigneeId = userId
  if (!t.collaborators.includes(userId)) t.collaborators.push(userId)
  if (t.status === 'created') t.status = 'assigned'
  t.updatedAt = now()
  t.history.push({
    at: now(),
    actor: actorName(),
    action: `分配给${userName(userId)}`,
    note: '',
  })
  pushAudit({ action: '分配工单', detail: `${id} → ${userName(userId)}` })
  return { ...t }
}

/**
 * @param {string} id
 * @param {string} toStatus
 * @param {string} [note]
 * @param {{ rejectReason?: string }} [extra]
 */
export async function transition(id, toStatus, note = '', extra = {}) {
  await businessDelay()
  const auth = useAuthStore()
  const t = findTask(id)
  if (!t) throw new Error(`工单不存在：${id}`)

  const allowed = TRANSITIONS[t.status] || []
  if (!allowed.includes(toStatus)) {
    throw new Error(`不允许从「${t.status}」流转到「${toStatus}」`)
  }

  // Permission: annotator cannot final-approve (done) or pass final_review alone
  if (toStatus === 'done' && auth.role === 'annotator') {
    throw new Error('标注员无权终审通过')
  }
  if (toStatus === 'final_review' && auth.role === 'annotator') {
    throw new Error('标注员无权推进终审')
  }
  if (toStatus === 'rejected' && auth.role === 'annotator') {
    throw new Error('标注员无权驳回工单')
  }
  if (toStatus === 'rejected' && !extra.rejectReason && !note) {
    throw new Error('驳回必须填写原因')
  }

  const from = t.status
  t.status = toStatus
  t.updatedAt = now()
  if (toStatus === 'rejected') {
    t.rejectReason = extra.rejectReason || 'other'
    if (!Array.isArray(t.rejectChain)) t.rejectChain = []
    t.rejectChain.push({
      at: now(),
      by: auth.user?.id || 'unknown',
      reason: t.rejectReason,
    })
  }
  if (toStatus === 'annotating' && from === 'rejected') {
    t.rejectReason = null
  }
  if (toStatus === 'done') {
    t.doneCount = t.sampleCount
  }

  const statusLabel = getStatusMeta(toStatus)?.label || toStatus
  const actionMap = {
    assigned: '分配确认',
    annotating: from === 'rejected' ? '驳回后重标' : '开始标注',
    reviewing: '提交初审',
    final_review: '初审通过',
    done: '终审通过',
    rejected: '驳回返修',
  }
  t.history.push({
    at: now(),
    actor: actorName(),
    action: actionMap[toStatus] || `流转至${statusLabel}`,
    note: note || (extra.rejectReason
      ? REJECT_REASONS.find((r) => r.value === extra.rejectReason)?.label || extra.rejectReason
      : ''),
  })
  pushAudit({
    action: '工单状态流转',
    detail: `${id} ${from} → ${toStatus}${note ? ' · ' + note : ''}`,
  })
  return { ...t }
}

export async function addComment(id, body) {
  await businessDelay()
  const auth = useAuthStore()
  const t = findTask(id)
  if (!t) throw new Error(`工单不存在：${id}`)
  const comment = {
    id: `c-${Date.now()}`,
    at: now(),
    authorId: auth.user?.id,
    authorName: auth.user?.name || '未知',
    body: String(body || '').trim(),
  }
  if (!comment.body) throw new Error('批注内容不能为空')
  t.comments.push(comment)
  t.updatedAt = now()
  pushAudit({ action: '添加批注', detail: `${id} · ${comment.body.slice(0, 40)}` })
  return comment
}

export async function saveLabels(id, labels) {
  await businessDelay()
  const t = findTask(id)
  if (!t) throw new Error(`工单不存在：${id}`)
  t.labelsSnapshot = JSON.parse(JSON.stringify(labels))
  t.updatedAt = now()
  t.history.push({ at: now(), actor: actorName(), action: '保存标注结果', note: '' })
  pushAudit({ action: '保存标注', detail: id })
  return { ...t }
}

export async function listSampleRules() {
  await businessDelay()
  return state.sampleRules.map((r) => ({ ...r, modalities: [...r.modalities] }))
}

export async function updateSampleRule(id, patch) {
  await businessDelay()
  const rule = state.sampleRules.find((r) => r.id === id)
  if (!rule) throw new Error('规则不存在')
  Object.assign(rule, patch)
  if (patch.modalities) rule.modalities = [...patch.modalities]
  pushAudit({ action: '更新抽检规则', detail: `${id} · ${rule.name}` })
  return { ...rule, modalities: [...rule.modalities] }
}

export async function runSampleCheck(ruleId) {
  await businessDelay()
  const rule = state.sampleRules.find((r) => r.id === ruleId)
  if (!rule) throw new Error('规则不存在')
  if (!rule.enabled) throw new Error('规则未启用')

  const candidates = state.samplePool.filter(
    (s) => s.status === 'pending' && rule.modalities.includes(s.modality),
  )
  const n = Math.max(1, Math.min(candidates.length, Math.ceil(candidates.length * rule.ratio) || 1))
  // shuffle
  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, n)
  const run = {
    id: `RUN-${Date.now()}`,
    ruleId,
    ruleName: rule.name,
    at: now(),
    pickedIds: picked.map((p) => p.id),
    count: picked.length,
  }
  state.lastSampleRun = run
  // mark picked as checking
  picked.forEach((p) => {
    p.status = 'checking'
  })
  pushAudit({
    action: '执行随机抽检',
    detail: `${rule.name} · 抽中 ${picked.length} 条`,
  })
  return {
    run,
    samples: state.samplePool
      .filter((s) => picked.some((p) => p.id === s.id))
      .map((s) => ({ ...s })),
  }
}

export async function listSamplePool(query = {}) {
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
}

export async function passSample(id) {
  await businessDelay()
  const s = state.samplePool.find((x) => x.id === id)
  if (!s) throw new Error('样本不存在')
  s.status = 'pass'
  s.reason = null
  pushAudit({ action: '抽检合格', detail: id })
  return { ...s }
}

export async function rejectSample(id, reason) {
  await businessDelay()
  const s = state.samplePool.find((x) => x.id === id)
  if (!s) throw new Error('样本不存在')
  if (!reason) throw new Error('驳回必须填写原因')
  s.status = 'fail'
  s.reason = reason
  pushAudit({ action: '抽检不合格', detail: `${id} · ${reason}` })
  return { ...s }
}

export async function refluxPass(ids = []) {
  await businessDelay()
  const list = ids.length ? ids : state.samplePool.filter((s) => s.status === 'pass' && !s.refluxed).map((s) => s.id)
  let count = 0
  for (const id of list) {
    const s = state.samplePool.find((x) => x.id === id)
    if (s && s.status === 'pass') {
      s.refluxed = true
      s.status = 'refluxed'
      count += 1
      // mark related task
      const t = findTask(s.taskId)
      if (t) t.refluxed = true
    }
  }
  pushAudit({ action: '合格数据回流', detail: `回流库写入 ${count} 条` })
  return { count, ids: list }
}

export async function getSpecDoc() {
  await businessDelay()
  return SPEC_SECTIONS.map((s) => ({ ...s }))
}

export async function getLastSampleRun() {
  await businessDelay()
  return state.lastSampleRun ? { ...state.lastSampleRun } : null
}

export { SAMPLE_RESOURCES, MODALITIES, STATUS_FLOW, REJECT_REASONS, PRIORITIES, TRANSITIONS }
