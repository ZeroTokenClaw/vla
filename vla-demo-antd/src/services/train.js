import dayjs from 'dayjs'
import { businessDelay } from './delay'
import { paginate } from '@/mock/seed/paginate'
import { pushAudit } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { exportCSV, exportExcel } from '@/utils/exportFiles'
import {
  ALGORITHMS,
  MODELS,
  GPU_CARDS,
  AUGMENT_OPTIONS,
  EXPERIMENTS,
  nextExpId,
  mockMetricPoint,
} from '@/mock/train'

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function requireAdmin(actionLabel) {
  const auth = useAuthStore()
  if (auth.role !== 'admin') {
    throw new Error(`仅管理员可${actionLabel}，当前角色无权限`)
  }
}

const state = {
  experiments: EXPERIMENTS.map((e) => clone(e)),
  gpus: GPU_CARDS.map((g) => clone(g)),
  seq: EXPERIMENTS.length + 1,
}

// Sync free flags with non-finished seed experiments
for (const exp of state.experiments) {
  if (exp.status === 'finished') continue
  for (const gid of exp.gpuIds) {
    const card = state.gpus.find((g) => g.id === gid)
    if (card) card.free = false
  }
}

function findExp(expId) {
  const exp = state.experiments.find((x) => x.id === expId)
  if (!exp) throw new Error(`实验不存在：${expId}`)
  return exp
}

export function listMeta() {
  return {
    algorithms: ALGORITHMS,
    models: MODELS,
    gpus: state.gpus.map((g) => ({ ...g })),
    augmentOptions: AUGMENT_OPTIONS,
  }
}

export async function refreshGpuMetrics() {
  await businessDelay()
  for (const g of state.gpus) {
    if (g.free) {
      g.utilPct = Math.max(0, Math.min(25, Math.round((g.utilPct || 5) + (Math.random() * 6 - 3))))
      g.memUsedGb = Number(
        Math.max(0.5, Math.min(g.memoryGb * 0.2, (g.memUsedGb || 1) + (Math.random() - 0.5))).toFixed(1),
      )
      g.temperature = Math.max(32, Math.min(50, Math.round((g.temperature || 36) + (Math.random() * 4 - 2))))
      g.powerW = Math.max(25, Math.min(120, Math.round((g.powerW || 40) + (Math.random() * 10 - 5))))
    } else {
      g.utilPct = Math.max(55, Math.min(98, Math.round((g.utilPct || 70) + (Math.random() * 8 - 4))))
      g.memUsedGb = Number(
        Math.max(
          g.memoryGb * 0.5,
          Math.min(g.memoryGb * 0.95, (g.memUsedGb || g.memoryGb * 0.6) + (Math.random() - 0.5) * 1.5),
        ).toFixed(1),
      )
      g.temperature = Math.max(60, Math.min(84, Math.round((g.temperature || 70) + (Math.random() * 4 - 2))))
      g.powerW = Math.max(180, Math.min(300, Math.round((g.powerW || 200) + (Math.random() * 20 - 10))))
    }
  }
  return state.gpus.map((g) => ({ ...g }))
}

export async function listExperiments(query = {}) {
  await businessDelay()
  const { page, pageSize, status, algorithm, keyword } = query
  let rows = state.experiments.map((e) => ({
    id: e.id,
    name: e.name,
    algorithm: e.algorithm,
    version: e.version,
    model: e.model,
    batchSize: e.batchSize,
    learningRate: e.learningRate,
    epochs: e.epochs,
    augment: e.augment,
    gpuIds: [...e.gpuIds],
    status: e.status,
    currentEpoch: e.currentEpoch,
    createdAt: e.createdAt,
    metricLen: e.metrics.loss.length,
    catalogCount: e.catalog?.length || 0,
    ckptCount: e.ckptList?.length || 0,
  }))
  if (status) rows = rows.filter((e) => e.status === status)
  if (algorithm) rows = rows.filter((e) => e.algorithm === algorithm)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((e) => e.id.includes(kw) || e.name.includes(kw))
  }
  return paginate(rows, { page, pageSize })
}

export async function getExperiment(expId) {
  await businessDelay()
  return clone(findExp(expId))
}

/**
 * 创建训练实验（仅管理员）
 * @param {{ name: string, algorithm: string, version: string, model: string, batchSize: number, learningRate: number, epochs: number, augment: boolean, augmentOps?: string[], gpuIds?: string[] }} cfg
 */

function emptyThickFields(id) {
  return {
    catalog: [
      {
        id: `CAT-ORN-${id}-tr`,
        name: '待绑定训练集',
        fold: 'train',
        rev: 'draft',
        sampleCount: 0,
      },
    ],
    ckptList: [],
    evalGrid: [],
    cmMatrix: [],
  }
}

export async function createExperiment(cfg) {
  await businessDelay()
  requireAdmin('创建实验')
  if (!cfg?.name?.trim()) throw new Error('请填写实验名称')
  if (!cfg.algorithm) throw new Error('请选择算法')
  if (!cfg.version) throw new Error('请选择算法版本')
  if (!cfg.model) throw new Error('请选择模型')
  const epochs = Number(cfg.epochs)
  const batchSize = Number(cfg.batchSize)
  const learningRate = Number(cfg.learningRate)
  if (!Number.isFinite(epochs) || epochs < 1) throw new Error('epoch 需为正整数')
  if (!Number.isFinite(batchSize) || batchSize < 1) throw new Error('batchSize 无效')
  if (!Number.isFinite(learningRate) || learningRate <= 0) throw new Error('learningRate 无效')

  const id = nextExpId(state.seq++)
  const gpuIds = Array.isArray(cfg.gpuIds) ? [...cfg.gpuIds] : []
  const exp = {
    id,
    name: cfg.name.trim(),
    algorithm: cfg.algorithm,
    version: cfg.version,
    model: cfg.model,
    batchSize,
    learningRate,
    epochs,
    augment: !!cfg.augment,
    augmentOps: cfg.augment ? [...(cfg.augmentOps || [])] : [],
    gpuIds,
    status: gpuIds.length ? 'ready' : 'draft',
    currentEpoch: 0,
    createdAt: now(),
    startedAt: null,
    finishedAt: null,
    runLog: [{ at: now(), level: 'info', message: '实验已创建' }],
    metrics: { loss: [], acc: [], map: [] },
    ...emptyThickFields(id),
  }

  if (gpuIds.length) {
    for (const gid of gpuIds) {
      const card = state.gpus.find((g) => g.id === gid)
      if (!card) throw new Error(`GPU 不存在：${gid}`)
      if (!card.free && !EXPERIMENTS.some((e) => e.gpuIds.includes(gid))) {
        // allow if currently free in runtime state
      }
      if (!card.free) throw new Error(`GPU 已被占用：${card.name}`)
      card.free = false
    }
    const names = gpuIds.map((id) => state.gpus.find((g) => g.id === id)?.name || id).join(', ')
    exp.runLog.push({ at: now(), level: 'info', message: `创建时分配 GPU：${names}` })
  }

  state.experiments.unshift(exp)
  pushAudit({
    action: '创建训练实验',
    detail: `${id} · ${exp.name} · ${exp.algorithm}@${exp.version} · ${exp.model}`,
  })
  return clone(exp)
}

/**
 * 分配 GPU（仅管理员）
 * @param {string} expId
 * @param {string[]} gpuIds
 */
export async function allocateGpu(expId, gpuIds) {
  await businessDelay()
  requireAdmin('分配 GPU')
  const exp = findExp(expId)
  if (exp.status === 'running') throw new Error('运行中的实验不可改配 GPU')
  if (!gpuIds?.length) throw new Error('请至少选择一张 GPU')

  // release previous
  for (const gid of exp.gpuIds) {
    const card = state.gpus.find((g) => g.id === gid)
    if (card) card.free = true
  }

  for (const gid of gpuIds) {
    const card = state.gpus.find((g) => g.id === gid)
    if (!card) throw new Error(`GPU 不存在：${gid}`)
    // allow re-selecting same cards already on this exp
    const heldByOther = state.experiments.some(
      (e) => e.id !== expId && e.gpuIds.includes(gid) && e.status !== 'finished',
    )
    if (!card.free && heldByOther) throw new Error(`GPU 已被占用：${card.name}`)
    card.free = false
  }

  exp.gpuIds = [...gpuIds]
  if (exp.status === 'draft') exp.status = 'ready'
  const names = gpuIds.map((id) => state.gpus.find((g) => g.id === id)?.name || id).join(', ')
  exp.runLog.push({ at: now(), level: 'info', message: `分配 GPU：${names}` })
  pushAudit({ action: '分配训练 GPU', detail: `${expId} · ${names}` })
  return clone(exp)
}

/** 启动训练（仅管理员） */
export async function startTrain(expId) {
  await businessDelay()
  requireAdmin('启动训练')
  const exp = findExp(expId)
  if (!exp.gpuIds.length) throw new Error('请先分配 GPU')
  if (exp.status === 'running') throw new Error('实验已在运行')
  if (exp.status === 'finished' && exp.currentEpoch >= exp.epochs) {
    // allow restart: reset metrics
    exp.metrics = { loss: [], acc: [], map: [] }
    exp.currentEpoch = 0
    exp.finishedAt = null
  }
  exp.status = 'running'
  exp.startedAt = now()
  exp.runLog.push({
    at: now(),
    level: 'info',
    message: `开始训练 · epoch 目标 ${exp.epochs} · 增强 ${exp.augment ? '开' : '关'}`,
  })
  pushAudit({ action: '启动训练', detail: `${expId} · epochs=${exp.epochs}` })
  return clone(exp)
}

/** 停止训练（仅管理员） */
export async function stopTrain(expId) {
  await businessDelay()
  requireAdmin('停止训练')
  const exp = findExp(expId)
  if (exp.status !== 'running') throw new Error('当前不在运行状态')
  exp.status = exp.currentEpoch >= exp.epochs ? 'finished' : 'stopped'
  if (exp.status === 'finished') exp.finishedAt = now()
  exp.runLog.push({
    at: now(),
    level: 'warning',
    message: `手动停止 · 已完成 epoch ${exp.currentEpoch}/${exp.epochs}`,
  })
  pushAudit({ action: '停止训练', detail: `${expId} · epoch ${exp.currentEpoch}` })
  return clone(exp)
}

/**
 * 推进一个 mock epoch（由 TrainRunner 定时器调用）
 * @returns {{ experiment: object, point: {loss,acc,map}, done: boolean }}
 */
export async function tickEpoch(expId) {
  // short delay so UI stays snappy during timer ticks
  await businessDelay()
  const exp = findExp(expId)
  if (exp.status !== 'running') {
    return { experiment: clone(exp), point: null, done: exp.status === 'finished' }
  }
  if (exp.currentEpoch >= exp.epochs) {
    exp.status = 'finished'
    exp.finishedAt = now()
    return { experiment: clone(exp), point: null, done: true }
  }

  const next = exp.currentEpoch + 1
  const point = mockMetricPoint(next, exp.epochs)
  exp.currentEpoch = next
  exp.metrics.loss.push(point.loss)
  exp.metrics.acc.push(point.acc)
  exp.metrics.map.push(point.map)
  exp.runLog.push({
    at: now(),
    level: 'info',
    message: `epoch ${next}/${exp.epochs} · loss=${point.loss} acc=${point.acc} mAP=${point.map}`,
  })

  let done = false
  if (next >= exp.epochs) {
    exp.status = 'finished'
    exp.finishedAt = now()
    exp.runLog.push({ at: now(), level: 'success', message: `训练完成 epoch ${next}/${exp.epochs}` })
    done = true
    pushAudit({ action: '训练完成', detail: `${expId} · ${next} epochs` })
  }
  return { experiment: clone(exp), point, done }
}

export async function getMetrics(expId) {
  await businessDelay()
  const exp = findExp(expId)
  return {
    loss: [...exp.metrics.loss],
    acc: [...exp.metrics.acc],
    map: [...exp.metrics.map],
    currentEpoch: exp.currentEpoch,
    epochs: exp.epochs,
    status: exp.status,
  }
}

/**
 * 导出训练报表 CSV / Excel
 * @param {string} expId
 * @param {'csv'|'excel'} format
 */
export async function exportReport(expId, format) {
  await businessDelay()
  const exp = findExp(expId)
  const rows = []
  const n = Math.max(exp.metrics.loss.length, exp.metrics.acc.length, exp.metrics.map.length)
  for (let i = 0; i < n; i += 1) {
    rows.push({
      experimentId: exp.id,
      name: exp.name,
      epoch: i + 1,
      loss: exp.metrics.loss[i] ?? '',
      acc: exp.metrics.acc[i] ?? '',
      map: exp.metrics.map[i] ?? '',
      algorithm: exp.algorithm,
      version: exp.version,
      model: exp.model,
      augment: exp.augment ? 'Y' : 'N',
      status: exp.status,
    })
  }
  if (rows.length === 0) {
    rows.push({
      experimentId: exp.id,
      name: exp.name,
      epoch: '',
      loss: '',
      acc: '',
      map: '',
      algorithm: exp.algorithm,
      version: exp.version,
      model: exp.model,
      augment: exp.augment ? 'Y' : 'N',
      status: exp.status,
    })
  }

  const ts = dayjs().format('YYYYMMDDHHmmss')
  const base = `${exp.id}-report-${ts}`
  if (format === 'csv') {
    const filename = `${base}.csv`
    exportCSV(filename, rows)
    pushAudit({ action: '导出训练报表 CSV', detail: filename })
    return { filename, format }
  }
  if (format === 'excel') {
    const filename = `${base}.xlsx`
    exportExcel(filename, rows)
    pushAudit({ action: '导出训练报表 Excel', detail: filename })
    return { filename, format }
  }
  throw new Error(`不支持的导出格式：${format}`)
}

/** Pure helper for unit tests */
export function metricsSeriesLength(metrics) {
  return {
    loss: metrics?.loss?.length || 0,
    acc: metrics?.acc?.length || 0,
    map: metrics?.map?.length || 0,
  }
}

export { ALGORITHMS, MODELS, GPU_CARDS, AUGMENT_OPTIONS, mockMetricPoint }
