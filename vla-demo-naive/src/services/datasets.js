import dayjs from 'dayjs'
import { businessDelay } from './delay'
import { DATASETS, SAMPLE_POOL } from '@/mock/eide'
import { pushAudit } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { paginate } from '@/mock/seed/paginate'

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function actor() {
  return useAuthStore().user?.name || '系统'
}

const state = {
  datasets: DATASETS.map((d) => ({ ...d, tags: [...(d.tags || [])] })),
  samples: SAMPLE_POOL.map((s) => ({ ...s, issues: [...(s.issues || [])] })),
  seq: DATASETS.length + 1,
}

export async function listDatasets(query = {}) {
  await businessDelay()
  let rows = state.datasets.map((d) => ({ ...d }))
  if (query.modality) rows = rows.filter((d) => d.modality === query.modality)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((d) => d.id.includes(kw) || d.name.includes(kw))
  }
  return paginate(rows, query)
}

export async function getDataset(id) {
  await businessDelay()
  const d = state.datasets.find((x) => x.id === id)
  if (!d) throw new Error(`数据集不存在：${id}`)
  const samples = state.samples.filter((s) => s.datasetId === id)
  return {
    ...d,
    sampleStats: {
      total: samples.length || d.sampleCount,
      labeled: samples.filter((s) => ['labeled', 'passed'].includes(s.status)).length,
      anomaly: samples.filter((s) => s.status === 'anomaly').length,
    },
  }
}

export async function createDataset(payload) {
  await businessDelay()
  state.seq += 1
  const id = `DS-EIDE-${String(state.seq).padStart(3, '0')}`
  const row = {
    id,
    name: payload.name || `新建数据集-${state.seq}`,
    modality: payload.modality || 'mixed',
    version: payload.version || 'v0.1.0',
    sampleCount: 0,
    labeledCount: 0,
    qualityScore: 0,
    owner: actor(),
    updatedAt: now(),
    tags: payload.tags || [],
    desc: payload.desc || '',
  }
  state.datasets.unshift(row)
  pushAudit({ action: 'dataset.create', detail: id, actor: actor() })
  return { ...row }
}

export async function updateDataset(id, patch) {
  await businessDelay()
  const d = state.datasets.find((x) => x.id === id)
  if (!d) throw new Error(`数据集不存在：${id}`)
  Object.assign(d, patch, { updatedAt: now() })
  pushAudit({ action: 'dataset.update', detail: id, actor: actor() })
  return { ...d }
}

export async function listSamples(datasetId, query = {}) {
  await businessDelay()
  let rows = state.samples.filter((s) => !datasetId || s.datasetId === datasetId)
  if (query.status) rows = rows.filter((s) => s.status === query.status)
  if (query.modality) rows = rows.filter((s) => s.modality === query.modality)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((s) => s.id.includes(kw) || s.name.includes(kw))
  }
  return paginate(
    rows.map((s) => ({
      ...s,
      issues: [...(s.issues || [])],
      issueDetail: (s.issueDetail || []).map((x) => ({ ...x })),
      keyNodes: [...(s.keyNodes || [])],
      meta: { ...(s.meta || {}) },
    })),
    query,
  )
}

export async function getSample(id) {
  await businessDelay()
  const s = state.samples.find((x) => x.id === id)
  if (!s) throw new Error(`样本不存在：${id}`)
  const ds = state.datasets.find((d) => d.id === s.datasetId)
  return {
    ...s,
    issues: [...(s.issues || [])],
    issueDetail: (s.issueDetail || []).map((x) => ({ ...x })),
    keyNodes: [...(s.keyNodes || [])],
    meta: { ...(s.meta || {}) },
    datasetName: ds?.name || s.datasetId,
    datasetVersion: ds?.version,
  }
}
