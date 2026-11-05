import { createPrng } from './prng'

/** Local metric helper — avoid circular import with mock/train.js */
function metricPoint(epoch, epochs) {
  const t = epochs <= 1 ? 1 : (epoch - 1) / (epochs - 1)
  const loss = Number((2.2 - 1.7 * t + Math.sin(epoch) * 0.04).toFixed(4))
  const acc = Number((0.35 + 0.55 * t + Math.cos(epoch * 0.7) * 0.01).toFixed(4))
  const map = Number((0.2 + 0.58 * t + Math.sin(epoch * 0.5) * 0.015).toFixed(4))
  return {
    loss: Math.max(0.05, loss),
    acc: Math.min(0.99, Math.max(0.01, acc)),
    map: Math.min(0.99, Math.max(0.01, map)),
  }
}

function longRunLog(rng, n, prefix) {
  return Array.from({ length: n }, (_, i) => ({
    at: `2026-11-02 ${String(9 + Math.floor(i / 6)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00`,
    level: i === n - 1 ? 'success' : i % 11 === 10 ? 'warning' : 'info',
    message: `${prefix} step ${i + 1}/${n} loss=${(2 - i / n + rng.next() * 0.01).toFixed(3)}`,
  }))
}

const MODEL_BY_ALGO = {
  vla_policy: ['rt1_base', 'openvla_7b'],
  det_yolo: ['yolov8n', 'yolov8m'],
  seg_mask2former: ['mask2former_swin'],
  ner_bert: ['bert_base_zh'],
}

/**
 * Orion train enrichment — fields:
 * datasets[] + split/versionPin, checkpoints[], valTable, confusionMatrix, logs[]
 */
export function enrichExperiment(e, rng) {
  const cls = ['cup', 'plate', 'hand', 'other']
  const { datasets, checkpoints, valTable, confusionMatrix, logs, ...rest } = e
  return {
    ...rest,
    catalog: e.catalog || [
      {
        id: `CAT-ORN-${e.id}-tr`,
        name: 'Orion回流训练集',
        fold: 'train',
        rev: 'r2026.11.02',
        sampleCount: 12000 + rng.int(0, 4000),
      },
      {
        id: `CAT-ORN-${e.id}-va`,
        name: 'Orion验证集',
        fold: 'val',
        rev: 'r2026.11.02',
        sampleCount: 1500 + rng.int(0, 500),
      },
      {
        id: `CAT-ORN-${e.id}-te`,
        name: 'Orion测试集',
        fold: 'test',
        rev: 'r2026.11.01',
        sampleCount: 800 + rng.int(0, 200),
      },
    ],
    ckptList: e.ckptList || [
      {
        id: `CKPT-${e.id}-e10`,
        epoch: Math.min(10, e.epochs || 10),
        path: `/ckpts/${e.id}/e10.pt`,
        metric: Number((0.65 + rng.next() * 0.15).toFixed(3)),
      },
      {
        id: `CKPT-${e.id}-best`,
        epoch: e.epochs || 20,
        path: `/ckpts/${e.id}/best.pt`,
        metric: Number((0.75 + rng.next() * 0.15).toFixed(3)),
      },
    ],
    evalGrid:
      e.evalGrid ||
      cls.map((c) => ({
        cls: c,
        precision: Number((0.7 + rng.next() * 0.25).toFixed(3)),
        recall: Number((0.65 + rng.next() * 0.3).toFixed(3)),
        f1: Number((0.68 + rng.next() * 0.25).toFixed(3)),
      })),
    cmMatrix: e.cmMatrix || [
      [50, 2, 1, 0],
      [3, 44, 2, 1],
      [1, 2, 40, 3],
      [0, 1, 2, 38],
    ],
    runLog: e.runLog && e.runLog.length >= 30 ? e.runLog : longRunLog(rng, 36, e.name),
  }
}

export function seedExperiments(hand, seed = 0x02A10D01) {
  const rng = createPrng(seed ^ 0x4444)
  const algos = ['vla_policy', 'det_yolo', 'seg_mask2former', 'ner_bert']
  const statuses = ['finished', 'ready', 'draft', 'running']
  const out = hand.map((e) => enrichExperiment(e, rng))
  const used = new Set(out.map((e) => e.id))
  let seq = out.length + 1

  while (out.length < 56) {
    const epochs = rng.int(5, 30)
    const status = rng.pick(statuses)
    let id = `ORN-EXP-2026-${String(seq).padStart(3, '0')}`
    while (used.has(id)) {
      seq += 1
      id = `ORN-EXP-2026-${String(seq).padStart(3, '0')}`
    }
    used.add(id)

    const algorithm = rng.pick(algos)
    const models = MODEL_BY_ALGO[algorithm] || ['yolov8n']
    const model = rng.pick(models)
    const day = rng.int(1, 4)

    // Keep most seeded rows GPU-free so demo create/allocate still has free cards.
    let gpuIds = []
    if (status === 'running') gpuIds = ['gpu-0']

    const base = {
      id,
      name: `Orion实验-${seq}`,
      algorithm,
      version: algorithm === 'det_yolo' ? 'v8.2' : algorithm === 'vla_policy' ? 'v1.3.0' : 'v1.0',
      model,
      batchSize: rng.pick([4, 8, 16]),
      learningRate: 0.0001 * rng.int(1, 10),
      epochs,
      augment: rng.pick([true, false]),
      augmentOps: rng.pick([[], ['flip'], ['flip', 'color_jitter'], ['crop', 'mixup']]),
      gpuIds,
      status,
      currentEpoch: status === 'finished' ? epochs : status === 'running' ? rng.int(1, Math.max(1, epochs - 1)) : 0,
      createdAt: `2026-11-0${day} ${String(rng.int(8, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      startedAt: status === 'draft' || status === 'ready' ? null : `2026-11-0${day} 10:00:00`,
      finishedAt: status === 'finished' ? `2026-11-0${day} 16:20:00` : null,
      runLog: [{ at: `2026-11-0${day} 10:00:00`, level: 'info', message: 'seed created' }],
      metrics: { loss: [], acc: [], map: [] },
    }

    if (status === 'finished' || status === 'running') {
      const filled = status === 'finished' ? epochs : base.currentEpoch
      base.metrics = {
        loss: Array.from({ length: filled }, (_, i) => metricPoint(i + 1, epochs).loss),
        acc: Array.from({ length: filled }, (_, i) => metricPoint(i + 1, epochs).acc),
        map: Array.from({ length: filled }, (_, i) => metricPoint(i + 1, epochs).map),
      }
    }

    out.push(enrichExperiment(base, rng))
    seq += 1
  }
  return out
}

export { longRunLog, metricPoint }
