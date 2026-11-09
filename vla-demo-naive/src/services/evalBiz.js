import dayjs from 'dayjs'
import { businessDelay } from './delay'
import {
  EVAL_MODELS,
  LINEAGE_NODES,
  LINEAGE_EDGES,
  SCENES_DETAIL,
  PLANS_DETAIL,
  TEMPLATES_DETAIL,
} from '@/mock/eide'
import { pushAudit } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function actor() {
  return useAuthStore().user?.name || '系统'
}

const state = {
  models: EVAL_MODELS.map((m) => ({ ...m, metrics: { ...m.metrics } })),
  scenes: SCENES_DETAIL.map((s) => ({ ...s, tags: [...s.tags], constraints: [...s.constraints] })),
  plans: PLANS_DETAIL.map((p) => ({ ...p, steps: [...p.steps], dataTypes: [...p.dataTypes] })),
  templates: TEMPLATES_DETAIL.map((t) => ({ ...t, steps: [...t.steps] })),
  compareReports: [],
}

export async function listEvalModels(query = {}) {
  await businessDelay()
  let rows = state.models.map((m) => ({ ...m }))
  if (query.algo) rows = rows.filter((m) => m.algo === query.algo)
  if (query.datasetId) rows = rows.filter((m) => m.datasetId === query.datasetId)
  return { items: rows, total: rows.length, generatedAt: now() }
}

export async function runModelCompare(modelIds = []) {
  await businessDelay()
  if (!modelIds || modelIds.length < 2) throw new Error('请至少选择 2 个模型')
  const picked = state.models.filter((m) => modelIds.includes(m.id))
  if (picked.length < 2) throw new Error('模型不存在或数量不足')
  const datasets = [...new Set(picked.map((m) => m.datasetId))]
  const rows = picked.map((m) => ({
    modelId: m.id,
    name: m.name,
    version: m.version,
    algo: m.algo,
    datasetId: m.datasetId,
    params: m.params,
    ...m.metrics,
  }))
  const primaryKey = rows.some((r) => r.success != null)
    ? 'success'
    : rows.some((r) => r.map50 != null)
      ? 'map50'
      : rows.some((r) => r.f1 != null)
        ? 'f1'
        : 'precision'
  const sorted = [...rows].sort((a, b) => (b[primaryKey] || 0) - (a[primaryKey] || 0))
  const winner = sorted[0]
  const deltas = rows.map((r) => ({
    modelId: r.modelId,
    name: r.name,
    metric: primaryKey,
    value: r[primaryKey],
    deltaToBest: Number(((r[primaryKey] || 0) - (winner[primaryKey] || 0)).toFixed(3)),
  }))
  // case-level matrix (union of caseScores by caseId)
  const caseMap = new Map()
  for (const m of picked) {
    for (const c of m.caseScores || []) {
      if (!caseMap.has(c.caseId)) caseMap.set(c.caseId, { caseId: c.caseId, name: c.name, scores: {} })
      caseMap.get(c.caseId).scores[m.id] = { score: c.score, note: c.note || '' }
    }
  }
  const report = {
    id: `EVAL-RPT-${Date.now()}`,
    createdAt: now(),
    actor: actor(),
    datasetIds: datasets,
    sourceMode: 'demo',
    note: '演示对比报告：指标与 case 分来自登记假数据，非在线评测进程',
    primaryMetric: primaryKey,
    winner: { modelId: winner.modelId, name: winner.name, value: winner[primaryKey] },
    rows,
    deltas,
    cases: [...caseMap.values()],
    radar: buildRadar(picked),
    bar: {
      categories: rows.map((r) => r.name),
      values: rows.map((r) => r[primaryKey] ?? 0),
      metric: primaryKey,
    },
  }
  state.compareReports.unshift(report)
  if (state.compareReports.length > 20) state.compareReports.length = 20
  pushAudit({ action: 'eval.compare', detail: report.id, actor: actor() })
  return report
}

export async function listCompareReports() {
  await businessDelay()
  return { items: state.compareReports.map((r) => ({ ...r, rows: r.rows.map((x) => ({ ...x })) })) }
}

export async function getEvalModel(id) {
  await businessDelay()
  const m = state.models.find((x) => x.id === id)
  if (!m) throw new Error('模型不存在')
  return {
    ...m,
    metrics: { ...m.metrics },
    changelog: [...(m.changelog || [])],
    caseScores: (m.caseScores || []).map((c) => ({ ...c })),
  }
}

function buildRadar(models) {
  const keys = ['success', 'actionAcc', 'consistency', 'map50', 'precision', 'recall']
  const indicators = []
  const used = new Set()
  for (const k of keys) {
    if (models.some((m) => m.metrics[k] != null)) {
      used.add(k)
      indicators.push({
        name:
          {
            success: '成功率',
            actionAcc: '动作准确率',
            consistency: '一致性',
            map50: 'mAP@0.5',
            precision: 'Precision',
            recall: 'Recall',
          }[k] || k,
        max: 1,
        key: k,
      })
    }
  }
  return {
    indicators,
    series: models.map((m) => ({
      name: m.name,
      value: indicators.map((ind) => m.metrics[ind.key] ?? 0),
    })),
  }
}

export async function getLineage(rootId) {
  await businessDelay()
  let nodes = LINEAGE_NODES.map((n) => ({ ...n }))
  let edges = LINEAGE_EDGES.map((e) => ({ ...e }))
  if (rootId) {
    const keep = new Set([rootId])
    let changed = true
    while (changed) {
      changed = false
      for (const e of edges) {
        if (keep.has(e.from) || keep.has(e.to)) {
          if (!keep.has(e.from)) {
            keep.add(e.from)
            changed = true
          }
          if (!keep.has(e.to)) {
            keep.add(e.to)
            changed = true
          }
        }
      }
    }
    nodes = nodes.filter((n) => keep.has(n.id))
    edges = edges.filter((e) => keep.has(e.from) && keep.has(e.to))
  }
  return { nodes, edges, generatedAt: now(), sourceMode: 'demo' }
}

export async function listScenes() {
  await businessDelay()
  return { items: state.scenes.map((s) => ({ ...s })) }
}

export async function updateScene(id, patch) {
  await businessDelay()
  const s = state.scenes.find((x) => x.id === id)
  if (!s) throw new Error('场景不存在')
  Object.assign(s, patch)
  pushAudit({ action: 'scene.update', detail: id, actor: actor() })
  return { ...s }
}

export async function listPlans() {
  await businessDelay()
  return { items: state.plans.map((p) => ({ ...p })) }
}

export async function updatePlan(id, patch) {
  await businessDelay()
  const p = state.plans.find((x) => x.id === id)
  if (!p) throw new Error('方案不存在')
  Object.assign(p, patch)
  pushAudit({ action: 'plan.update', detail: id, actor: actor() })
  return { ...p }
}

export async function listTemplates() {
  await businessDelay()
  return { items: state.templates.map((t) => ({ ...t })) }
}

export async function updateTemplate(id, patch) {
  await businessDelay()
  const t = state.templates.find((x) => x.id === id)
  if (!t) throw new Error('模板不存在')
  Object.assign(t, patch)
  pushAudit({ action: 'template.update', detail: id, actor: actor() })
  return { ...t }
}

export async function createTemplate(payload) {
  await businessDelay()
  const id = `tpl-${Date.now().toString(36)}`
  const row = {
    id,
    name: payload.name || '新动作模板',
    code: (payload.code || 'CUSTOM').toUpperCase(),
    startCond: payload.startCond || '',
    endCond: payload.endCond || '',
    steps: payload.steps || ['步骤1'],
  }
  state.templates.push(row)
  pushAudit({ action: 'template.create', detail: id, actor: actor() })
  return { ...row }
}
