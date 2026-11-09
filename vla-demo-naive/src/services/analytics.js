import dayjs from 'dayjs'
import { businessDelay } from './delay'
import { listQcTasks, listMeta as qcMeta, MODALITIES } from './qc'
import { listVlaTasks } from './vla'
import { listExperiments } from './train'
import { listTextDocs, listVisionImages } from './prelabel'
import {
  PROFILE_HOURLY,
  DURATION_HIST,
  TAG_COVERAGE,
  SCORE_TREND,
  ANOMALY_TICKETS,
  QUALITY_RADAR,
  QUALITY_BY_MODALITY,
} from '@/mock/eide'
import { pushAudit } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function actor() {
  return useAuthStore().user?.name || '系统'
}

const anomalyState = {
  tickets: ANOMALY_TICKETS.map((t) => ({ ...t })),
}

export async function getDashboardStats() {
  await businessDelay()
  const [qc, vla, train, texts, visions] = await Promise.all([
    listQcTasks({ page: 1, pageSize: 500 }),
    listVlaTasks({ page: 1, pageSize: 500 }),
    listExperiments({ page: 1, pageSize: 200 }),
    listTextDocs({ page: 1, pageSize: 200 }),
    listVisionImages({ page: 1, pageSize: 200 }),
  ])

  const qcItems = qc.items || []
  const passed = qcItems.filter((t) => t.status === 'done').length
  const pendingReview = qcItems.filter((t) =>
    ['reviewing', 'final_review'].includes(t.status),
  ).length
  const openAnomaly = anomalyState.tickets.filter((t) =>
    ['open', 'confirmed', 'detected'].includes(t.status),
  ).length

  const modalityCount = {}
  for (const t of qcItems) modalityCount[t.modality] = (modalityCount[t.modality] || 0) + 1
  const pipeline = [
    { stage: '采集入库', count: (vla.items || []).length + (texts.total || 0), status: 'ok' },
    { stage: '预标注', count: (texts.total || 0) + (visions.total || 0), status: 'ok' },
    { stage: '人工标注', count: qcItems.filter((t) => ['annotating', 'labeling'].includes(t.status)).length, status: 'busy' },
    { stage: '质检审核', count: pendingReview, status: pendingReview > 5 ? 'warn' : 'ok' },
    { stage: '训练评测', count: (train.items || []).filter((e) => e.status === 'running').length, status: 'ok' },
  ]
  return {
    generatedAt: now(),
    sourceMode: 'demo',
    banner: '演示假数据模式 · 非真实算法/训练结果',
    kpis: [
      { key: 'samples', label: '标注任务', value: qcItems.length, hint: 'QC 工单', delta: '+12' },
      {
        key: 'passRate',
        label: '审核通过率',
        value: qcItems.length ? Math.round((passed / qcItems.length) * 100) : 0,
        unit: '%',
        delta: '+2.1',
      },
      { key: 'prelabel', label: '预标文档/图像', value: (texts.total || 0) + (visions.total || 0), delta: '+8' },
      { key: 'vla', label: 'VLA 采集任务', value: (vla.items || []).length, delta: '+3' },
      { key: 'anomalies', label: '待处理异常', value: openAnomaly, delta: openAnomaly ? `高优 ${anomalyState.tickets.filter((t) => t.severity === 'high' && t.status === 'open').length}` : '0' },
      {
        key: 'training',
        label: '训练中实验',
        value: (train.items || []).filter((e) => ['running', 'paused'].includes(e.status)).length,
        delta: 'GPU×2',
      },
      { key: 'pendingReview', label: '待审任务', value: pendingReview, delta: '—' },
      { key: 'qualityAvg', label: '质量均分', value: 83.4, delta: '+0.8' },
    ],
    modalityMeta: MODALITIES,
    modalityBreakdown: Object.entries(modalityCount).map(([code, count]) => ({
      code,
      name: MODALITIES.find((m) => m.value === code)?.label || code,
      count,
    })),
    pipeline,
    todayBrief: {
      ingest: 214,
      annotated: 168,
      passed: 142,
      anomalyFixed: 6,
      trainEpochs: 48,
    },
    qcMeta: qcMeta(),
    recentAnomalies: anomalyState.tickets.filter((t) => t.status === 'open').slice(0, 5),
  }
}

export async function getDataProfile() {
  await businessDelay()
  const [qc, vla] = await Promise.all([
    listQcTasks({ page: 1, pageSize: 500 }),
    listVlaTasks({ page: 1, pageSize: 500 }),
  ])
  const modalityCount = {}
  for (const t of qc.items || []) {
    modalityCount[t.modality] = (modalityCount[t.modality] || 0) + 1
  }
  const sceneCount = {}
  for (const t of vla.items || []) {
    sceneCount[t.scene] = (sceneCount[t.scene] || 0) + 1
  }
  return {
    generatedAt: now(),
    sourceMode: 'demo',
    modalityDistribution: Object.entries(modalityCount).map(([code, count]) => ({
      code,
      name: MODALITIES.find((m) => m.value === code)?.label || code,
      count,
    })),
    sceneDistribution: Object.entries(sceneCount).map(([scene, count]) => ({ scene, count })),
    labelCoverage: (qc.items || []).slice(0, 20).map((t) => ({
      id: t.id,
      name: t.title || t.name || t.id,
      modality: t.modality,
      labelCount: t.labelsSnapshot?.length || Math.floor(3 + Math.random() * 8),
      status: t.status,
    })),
    missingRate: 0.042,
    hourly: PROFILE_HOURLY,
    durationHist: DURATION_HIST,
    tagCoverage: TAG_COVERAGE.map((t) => ({
      ...t,
      rate: Number(((t.covered / t.total) * 100).toFixed(1)),
    })),
    summary: {
      totalSamples: 1280 + 426 + 210,
      modalities: 5,
      avgDurationSec: 14.6,
      labelDensity: 6.8,
      anomalyOpen: anomalyState.tickets.filter((t) =>
        ['open', 'confirmed', 'detected'].includes(t.status),
      ).length,
      peakHour: '14',
      peakIngest: 61,
    },
    qualityRadar: QUALITY_RADAR.map((d) => ({ ...d })),
    qualityByModality: QUALITY_BY_MODALITY.map((d) => ({ ...d })),
    topIssues: [
      { type: 'occlusion', count: 18, share: 0.28 },
      { type: 'blur', count: 14, share: 0.22 },
      { type: 'jitter', count: 12, share: 0.19 },
      { type: 'mismatch', count: 11, share: 0.17 },
      { type: 'missing', count: 9, share: 0.14 },
    ],
  }
}

export async function listQualityScores(query = {}) {
  await businessDelay()
  const [qc, vla] = await Promise.all([
    listQcTasks({ page: 1, pageSize: 200 }),
    listVlaTasks({ page: 1, pageSize: 200 }),
  ])
  const cards = []
  for (const t of (qc.items || []).slice(0, 25)) {
    const base = t.status === 'done' ? 88 : t.status === 'rejected' ? 62 : 76
    const jitter = (t.id.charCodeAt(t.id.length - 1) || 0) % 10
    const total = Math.min(99, base + jitter)
    cards.push({
      targetType: 'annotation_task',
      targetId: t.id,
      name: t.title || t.name || t.id,
      totalScore: total,
      grade: total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'E',
      dims: {
        completeness: Math.min(100, total + 2),
        clarity: Math.max(40, total - 3),
        stability: total,
        labelConsistency: Math.min(100, total + 1),
        taskMatch: Math.max(40, total - 1),
      },
      updatedAt: t.updatedAt || t.createdAt || now(),
    })
  }
  for (const t of vla.items || []) {
    const issues = t.issueCount || 0
    const score = Math.max(40, 92 - issues * 8)
    cards.push({
      targetType: 'vla_task',
      targetId: t.id,
      name: t.name,
      totalScore: score,
      grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
      dims: {
        completeness: score,
        clarity: Math.max(40, score - 2),
        stability: Math.max(40, score - issues * 2),
        labelConsistency: score,
        taskMatch: Math.max(40, score - (issues ? 5 : 0)),
      },
      updatedAt: t.createdAt || now(),
    })
  }
  let items = cards
  if (query.grade) items = items.filter((c) => c.grade === query.grade)
  if (query.targetType) items = items.filter((c) => c.targetType === query.targetType)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    items = items.filter((c) => c.targetId.includes(kw) || c.name.includes(kw))
  }
  const withFindings = items.map((c) => {
    const findings = []
    if (c.dims.clarity < 75) findings.push({ level: 'warn', text: '清晰度偏低，建议抽检模糊帧' })
    if (c.dims.stability < 70) findings.push({ level: 'error', text: '稳定性不足，可能存在抖动/丢帧' })
    if (c.dims.taskMatch < 75) findings.push({ level: 'warn', text: '任务匹配偏弱，核对指令与动作' })
    if (c.dims.completeness >= 90 && c.dims.labelConsistency >= 90)
      findings.push({ level: 'ok', text: '完整性与标注一致性达标' })
    if (!findings.length) findings.push({ level: 'ok', text: '各维度处于可接受区间' })
    return {
      ...c,
      findings,
      history: [
        { at: '2026-11-07', score: Math.max(40, c.totalScore - 4) },
        { at: '2026-11-08', score: Math.max(40, c.totalScore - 2) },
        { at: '2026-11-09', score: c.totalScore },
      ],
    }
  })
  return {
    items: withFindings,
    ruleVersion: 'EIDE-QR-1.0',
    generatedAt: now(),
    trend: SCORE_TREND,
    byModality: QUALITY_BY_MODALITY.map((d) => ({ ...d })),
    radarGlobal: QUALITY_RADAR.map((d) => ({ ...d })),
    dimLabels: [
      { key: 'completeness', label: '完整性' },
      { key: 'clarity', label: '清晰度' },
      { key: 'stability', label: '稳定性' },
      { key: 'labelConsistency', label: '标注一致性' },
      { key: 'taskMatch', label: '任务匹配' },
    ],
  }
}

export async function listAnomalies(query = {}) {
  await businessDelay()
  let rows = [...anomalyState.tickets]
  if (query.issueType) rows = rows.filter((x) => x.issueType === query.issueType)
  if (query.status) rows = rows.filter((x) => x.status === query.status)
  if (query.severity) rows = rows.filter((x) => x.severity === query.severity)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter(
      (x) =>
        x.id.includes(kw) ||
        x.sampleId.includes(kw) ||
        (x.sampleName || '').includes(kw) ||
        (x.message || '').includes(kw),
    )
  }
  const summary = {
    open: rows.filter((r) => r.status === 'open').length,
    confirmed: rows.filter((r) => r.status === 'confirmed').length,
    fixed: rows.filter((r) => r.status === 'fixed').length,
    dismissed: rows.filter((r) => r.status === 'dismissed').length,
    high: rows.filter((r) => r.severity === 'high').length,
  }
  const byType = {}
  for (const r of rows) byType[r.issueType] = (byType[r.issueType] || 0) + 1
  return {
    items: rows.map((r) => ({
      ...r,
      timeline: [
        { at: r.createdAt, event: '检出', by: '规则引擎' },
        ...(r.status !== 'open'
          ? [{ at: r.resolvedAt || r.createdAt, event: `状态→${r.status}`, by: r.resolvedBy || r.assignee }]
          : [{ at: now(), event: '待处理', by: r.assignee }]),
      ],
      checklist: [
        { item: '定位帧区间已核对', done: true },
        { item: '证据截帧已归档', done: !!r.evidence },
        { item: '关联 VLA 任务可跳转', done: !!r.vlaTaskId },
        { item: '修复说明已填写', done: !!r.resolution },
      ],
    })),
    total: rows.length,
    summary,
    typeDist: Object.entries(byType).map(([type, count]) => ({ type, count })),
    issueTypes: [
      { key: 'jitter', label: '抖动' },
      { key: 'occlusion', label: '遮挡' },
      { key: 'blur', label: '模糊' },
      { key: 'missing', label: '缺失' },
      { key: 'mismatch', label: '不匹配' },
    ],
    statuses: [
      { value: 'open', label: '待处理' },
      { value: 'confirmed', label: '已确认' },
      { value: 'fixed', label: '已修复' },
      { value: 'dismissed', label: '误报关闭' },
    ],
    generatedAt: now(),
  }
}

export async function getAnomaly(id) {
  await businessDelay()
  const t = anomalyState.tickets.find((x) => x.id === id)
  if (!t) throw new Error(`异常工单不存在：${id}`)
  return { ...t }
}

/** 处理异常：confirm | fix | dismiss */
export async function resolveAnomaly(id, { action, note } = {}) {
  await businessDelay()
  const t = anomalyState.tickets.find((x) => x.id === id)
  if (!t) throw new Error(`异常工单不存在：${id}`)
  const map = { confirm: 'confirmed', fix: 'fixed', dismiss: 'dismissed' }
  if (!map[action]) throw new Error('action 须为 confirm/fix/dismiss')
  t.status = map[action]
  t.resolution = note || t.resolution || ''
  t.resolvedAt = now()
  t.resolvedBy = actor()
  pushAudit({
    action: `anomaly.${action}`,
    detail: `${id} → ${t.status}`,
    actor: actor(),
  })
  return { ...t }
}
