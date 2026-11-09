import dayjs from 'dayjs'
import { businessDelay } from './delay'
import { paginate } from '@/mock/seed/paginate'
import { pushAudit } from '@/stores/audit'
import {
  PRODUCTION_TASKS,
  WORKFLOW_TEMPLATES,
  NODE_CATALOG,
  TASK_TYPES,
  DATA_SOURCES,
  DATA_TYPES,
  DATASETS,
  DASHBOARD_SERIES,
  EXPORT_RECORDS,
  MODEL_REGISTRY,
  DEVICES,
  SCENES,
  COLLECTION_PLANS,
  buildExecutionFromTask,
  nextProdId,
  nodeMeta,
} from '@/mock/factory'

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

const state = {
  tasks: PRODUCTION_TASKS.map((t) => clone(t)),
  workflows: WORKFLOW_TEMPLATES.map((w) => clone(w)),
  exports: EXPORT_RECORDS.map((e) => clone(e)),
  models: MODEL_REGISTRY.map((m) => clone(m)),
  devices: DEVICES.map((d) => clone(d)),
  scenes: SCENES.map((s) => clone(s)),
  plans: COLLECTION_PLANS.map((p) => clone(p)),
  executions: {},
  seq: PRODUCTION_TASKS.length + 1,
  wfSeq: WORKFLOW_TEMPLATES.length + 1,
}

function findTask(id) {
  const t = state.tasks.find((x) => x.id === id)
  if (!t) throw new Error(`生产任务不存在：${id}`)
  return t
}

function findWorkflow(id) {
  const w = state.workflows.find((x) => x.id === id)
  if (!w) throw new Error(`流程不存在：${id}`)
  return w
}

export function listMeta() {
  return {
    nodeCatalog: NODE_CATALOG,
    taskTypes: TASK_TYPES,
    dataSources: DATA_SOURCES,
    dataTypes: DATA_TYPES,
    datasets: DATASETS,
  }
}

export async function getDashboard() {
  await businessDelay()
  const counts = {
    total: state.tasks.length,
    running: 0,
    waiting: 0,
    succeeded: 0,
    failed: 0,
    ready: 0,
  }
  for (const t of state.tasks) {
    if (t.status === 'running') counts.running += 1
    else if (t.status === 'waiting_human') counts.waiting += 1
    else if (t.status === 'succeeded') counts.succeeded += 1
    else if (t.status === 'failed') counts.failed += 1
    else if (t.status === 'ready' || t.status === 'draft') counts.ready += 1
  }
  const avgElapsed =
    state.tasks.reduce((s, t) => s + (t.elapsedSec || 0), 0) / Math.max(1, state.tasks.length)
  return {
    counts,
    avgElapsedSec: Math.round(avgElapsed),
    series: clone(DASHBOARD_SERIES),
    recent: state.tasks.slice(0, 8).map(summaryTask),
  }
}

function summaryTask(t) {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    status: t.status,
    progress: t.progress,
    priority: t.priority,
    currentNode: t.currentNode,
    workflowId: t.workflowId,
    datasetId: t.datasetId,
    createdAt: t.createdAt,
    elapsedSec: t.elapsedSec,
    error: t.error,
  }
}

export async function listProductionTasks(query = {}) {
  await businessDelay()
  const { page, pageSize, status, type, keyword } = query
  let rows = state.tasks.map(summaryTask)
  if (status) rows = rows.filter((t) => t.status === status)
  if (type) rows = rows.filter((t) => t.type === type)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((t) => t.id.includes(kw) || t.name.includes(kw))
  }
  return paginate(rows, { page, pageSize })
}

export async function getProductionTask(id) {
  await businessDelay()
  return clone(findTask(id))
}

export async function createProductionTask(payload) {
  await businessDelay()
  if (!payload?.name?.trim()) throw new Error('请填写任务名称')
  if (!payload.workflowId) throw new Error('请选择生产流程模板')
  if (!payload.datasetId) throw new Error('请选择目标数据集')
  const wf = findWorkflow(payload.workflowId)
  const id = nextProdId(state.seq++)
  const task = {
    id,
    name: payload.name.trim(),
    type: payload.type || 'multimodal_label',
    description: payload.description || '',
    source: payload.source || 'upload',
    dataType: payload.dataType || 'image',
    datasetId: payload.datasetId,
    workflowId: wf.id,
    workflowVersion: wf.version,
    executorIds: payload.executorIds || [],
    reviewerIds: payload.reviewerIds || [],
    priority: payload.priority || 'P1',
    scheduleAt: payload.scheduleAt || now(),
    completeCondition: payload.completeCondition || { minQualifiedRate: 0.9 },
    status: 'ready',
    progress: 0,
    currentNode: null,
    createdAt: now(),
    elapsedSec: 0,
    error: null,
  }
  state.tasks.unshift(task)
  pushAudit({ action: '创建生产任务', detail: id })
  return clone(task)
}

export async function runProductionTask(id) {
  await businessDelay()
  const t = findTask(id)
  const wf = findWorkflow(t.workflowId)
  t.status = 'running'
  t.progress = 0.15
  t.currentNode = wf.nodes[0]?.type || 'import'
  t.error = null
  const exe = buildExecutionFromTask(t, wf)
  exe.status = 'running'
  exe.nodes = exe.nodes.map((n, i) =>
    i === 0 ? { ...n, status: 'running', logs: [...n.logs, `[INFO] started at ${now()}`] } : n,
  )
  state.executions[exe.id] = exe
  t._executionId = exe.id
  pushAudit({ action: '启动生产任务', detail: id })
  return clone(t)
}

export async function tickProductionTask(id) {
  await businessDelay()
  const t = findTask(id)
  const wf = findWorkflow(t.workflowId)
  if (t.status !== 'running' && t.status !== 'waiting_human') return clone(t)

  const idx = Math.min(
    wf.nodes.length - 1,
    Math.floor((t.progress || 0) * wf.nodes.length),
  )
  const node = wf.nodes[idx]
  // human gate pause
  if (node?.type === 'human_annotate' || node?.type === 'human_review') {
    if (t.status === 'running') {
      t.status = 'waiting_human'
      t.currentNode = node.type
      pushAudit({ action: '等待人工门禁', detail: `${id} @ ${node.type}` })
      syncExecution(t, wf)
      return clone(t)
    }
  }

  const nextProgress = Math.min(1, (t.progress || 0) + 1 / wf.nodes.length)
  t.progress = Number(nextProgress.toFixed(2))
  t.elapsedSec = (t.elapsedSec || 0) + 12
  const nextIdx = Math.min(wf.nodes.length - 1, Math.floor(t.progress * wf.nodes.length))
  t.currentNode = wf.nodes[nextIdx]?.type || null

  if (t.progress >= 0.999) {
    t.status = 'succeeded'
    t.progress = 1
    t.currentNode = null
    pushAudit({ action: '生产任务完成', detail: id })
  } else {
    t.status = 'running'
  }
  syncExecution(t, wf)
  return clone(t)
}

export async function resumeHumanGate(id) {
  await businessDelay()
  const t = findTask(id)
  if (t.status !== 'waiting_human') throw new Error('当前不在人工等待状态')
  t.status = 'running'
  t.progress = Math.min(0.99, (t.progress || 0) + 0.01)
  pushAudit({ action: '人工门禁放行', detail: id })
  return tickProductionTask(id)
}

export async function retryProductionTask(id) {
  await businessDelay()
  const t = findTask(id)
  t.status = 'running'
  t.progress = Math.max(0.1, (t.progress || 0) - 0.15)
  t.error = null
  const wf = findWorkflow(t.workflowId)
  t.currentNode = wf.nodes[Math.floor(t.progress * wf.nodes.length)]?.type
  pushAudit({ action: '重试生产任务', detail: id })
  syncExecution(t, wf)
  return clone(t)
}

function syncExecution(t, wf) {
  const exeId = t._executionId || `ADF-EXE-${t.id.replace('ADF-PROD-', '')}`
  const exe = buildExecutionFromTask(t, wf)
  exe.id = exeId
  state.executions[exeId] = exe
  t._executionId = exeId
}

export async function getExecution(taskId) {
  await businessDelay()
  const t = findTask(taskId)
  const wf = findWorkflow(t.workflowId)
  if (!t._executionId || !state.executions[t._executionId]) {
    syncExecution(t, wf)
  }
  return clone(state.executions[t._executionId])
}

export async function listWorkflows(query = {}) {
  await businessDelay()
  const { page, pageSize, status, keyword } = query
  let rows = state.workflows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    version: w.version,
    status: w.status,
    nodeCount: w.nodes.length,
    updatedAt: w.updatedAt,
  }))
  if (status) rows = rows.filter((w) => w.status === status)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((w) => w.id.includes(kw) || w.name.includes(kw))
  }
  return paginate(rows, { page, pageSize })
}

export async function getWorkflow(id) {
  await businessDelay()
  return clone(findWorkflow(id))
}

export async function saveWorkflow(id, patch) {
  await businessDelay()
  const w = findWorkflow(id)
  if (w.status === 'published' && patch?.forceNewVersion !== true) {
    // clone as new draft version bump on same id content replace only if draft
    throw new Error('已发布流程不可直接修改，请另存为新版本')
  }
  if (patch.nodes) w.nodes = patch.nodes
  if (patch.edges) w.edges = patch.edges
  if (patch.name) w.name = patch.name
  if (patch.description) w.description = patch.description
  w.updatedAt = now()
  pushAudit({ action: '保存流程', detail: id })
  return clone(w)
}

export async function publishWorkflow(id) {
  await businessDelay()
  const w = findWorkflow(id)
  w.status = 'published'
  w.version += 1
  w.updatedAt = now()
  pushAudit({ action: '发布流程版本', detail: `${id} v${w.version}` })
  return clone(w)
}

export async function createWorkflowDraft(payload) {
  await businessDelay()
  const id = `WF-ADF-CUSTOM-${String(state.wfSeq++).padStart(2, '0')}`
  const nodes = (payload?.nodeTypes || ['import', 'export']).map((type, i) => ({
    key: `n${i + 1}`,
    type,
    label: nodeMeta(type).label,
    params: {},
    retry: { maxRetries: 1, backoffSec: 3 },
    x: 40 + (i % 4) * 200,
    y: 40 + Math.floor(i / 4) * 120,
  }))
  const edges = []
  for (let i = 0; i < nodes.length - 1; i += 1) {
    edges.push({ from: nodes[i].key, to: nodes[i + 1].key, when: 'always' })
  }
  const wf = {
    id,
    name: payload?.name || '未命名流程',
    description: payload?.description || '',
    version: 1,
    status: 'draft',
    updatedAt: now(),
    nodes,
    edges,
  }
  state.workflows.unshift(wf)
  pushAudit({ action: '创建流程草稿', detail: id })
  return clone(wf)
}

export async function listExports(query = {}) {
  await businessDelay()
  return paginate(state.exports, query)
}

export async function listModels() {
  await businessDelay()
  return clone(state.models)
}

export async function listDevices(query = {}) {
  await businessDelay()
  let rows = state.devices.map((d) => ({
    ...d,
    boundTaskIds: [...(d.boundTaskIds || [])],
    tasks: d.boundTaskIds?.length ?? d.tasks ?? 0,
  }))
  if (query.status) rows = rows.filter((d) => d.status === query.status)
  if (query.type) rows = rows.filter((d) => d.type === query.type)
  if (query.keyword) {
    const kw = String(query.keyword).trim().toLowerCase()
    rows = rows.filter(
      (d) =>
        d.id.toLowerCase().includes(kw) ||
        d.name.toLowerCase().includes(kw) ||
        String(d.sn || '')
          .toLowerCase()
          .includes(kw),
    )
  }
  return rows
}

export async function getDeviceStats() {
  await businessDelay()
  const online = state.devices.filter((d) => d.status === 'online' || d.status === 'busy').length
  const busy = state.devices.filter((d) => d.status === 'busy').length
  const bound = state.devices.reduce((s, d) => s + (d.boundTaskIds?.length || 0), 0)
  return {
    deviceTotal: state.devices.length,
    deviceOnline: online,
    deviceBusy: busy,
    boundLinks: bound,
    generatedAt: now(),
    sourceMode: 'demo',
  }
}

export async function updateScene(id, patch) {
  await businessDelay()
  const s = state.scenes.find((x) => x.id === id)
  if (!s) throw new Error('场景不存在')
  Object.assign(s, patch)
  pushAudit({ action: '更新场景', detail: id })
  return clone(s)
}

export async function updatePlan(id, patch) {
  await businessDelay()
  const p = state.plans.find((x) => x.id === id)
  if (!p) throw new Error('方案不存在')
  Object.assign(p, patch)
  pushAudit({ action: '更新方案', detail: id })
  return clone(p)
}

export async function listScenes() {
  await businessDelay()
  return clone(state.scenes)
}

export async function listPlans() {
  await businessDelay()
  return clone(state.plans)
}

export async function createScene(payload) {
  await businessDelay()
  const row = {
    id: `SCN-${String(state.scenes.length + 1).padStart(2, '0')}`,
    name: payload.name,
    category: payload.category || '未分类',
    description: payload.description || '',
    environment: payload.environment || '',
    space: payload.space || '',
    tags: payload.tags || [],
    imageUrl: payload.imageUrl || '/samples/images/desk_seg.svg',
  }
  state.scenes.unshift(row)
  pushAudit({ action: '创建场景', detail: row.id })
  return clone(row)
}
