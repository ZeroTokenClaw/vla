import { businessDelay } from './delay'
import { paginate } from '@/mock/seed/paginate'
import { QUALITY_SCORES, PROFILE_STATS, ANOMALIES } from '@/mock/analytics'

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

export async function listQualityScores(query = {}) {
  await businessDelay()
  let rows = QUALITY_SCORES.map((x) => clone(x))
  if (query.grade) rows = rows.filter((r) => r.grade === query.grade)
  if (query.targetType) rows = rows.filter((r) => r.targetType === query.targetType)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((r) => r.id.includes(kw) || r.name.includes(kw) || r.targetId.includes(kw))
  }
  return paginate(rows, query)
}

export async function getQualityScore(id) {
  await businessDelay()
  const row = QUALITY_SCORES.find((x) => x.id === id)
  if (!row) throw new Error(`质量评分不存在：${id}`)
  return clone(row)
}

export async function getDataProfile() {
  await businessDelay()
  return clone(PROFILE_STATS)
}

export async function listAnomalies(query = {}) {
  await businessDelay()
  let rows = ANOMALIES.map((x) => clone(x))
  if (query.type) rows = rows.filter((r) => r.type === query.type)
  if (query.status) rows = rows.filter((r) => r.status === query.status)
  if (query.severity) rows = rows.filter((r) => r.severity === query.severity)
  if (query.keyword) {
    const kw = String(query.keyword).trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        r.id.toLowerCase().includes(kw) ||
        String(r.targetId || '')
          .toLowerCase()
          .includes(kw) ||
        String(r.message || '')
          .toLowerCase()
          .includes(kw),
    )
  }
  return paginate(rows, query)
}
