import { createPrng } from './prng'

const STATUSES = ['created', 'assigned', 'annotating', 'reviewing', 'final_review', 'done', 'rejected']
const MODS = ['text_ner', 'seg', 'audio_slice', 'video_det', 'point_seg']
const URGENCIES = ['urgent', 'normal', 'backlog']
const LANES = ['lane-alpha', 'lane-beta', 'lane-gamma']
const REJECTS = ['label_miss', 'label_wrong', 'boundary_bad', 'spec_violate', 'sample_bad']
const ASSIGNEES = ['u-lm-annotator', 'u-lm-annotator-2', null]

/**
 * Merge hand-written showcase rows with seeded bulk (≥56 total).
 * @param {object[]} handRows
 * @param {number} [seed]
 */
export function seedQcTasks(handRows, seed = 0x11A10E01) {
  const rng = createPrng(seed)
  const out = handRows.map((t) => {
    const urgency = t.urgency || (t.priority === 'high' ? 'P0' : t.priority === 'low' ? 'P2' : 'P1')
    const { priority, rejectChain, ...rest } = t
    return {
      ...rest,
      urgency,
      lane: t.lane || rng.pick(LANES),
      bounceLog:
        t.bounceLog ||
        (t.status === 'rejected'
          ? [{ at: t.updatedAt || '2026-11-04 09:45:00', by: 'u-lm-reviewer', code: t.rejectReason || 'label_miss', note: '边界漂移' }]
          : []),
    }
  })
  const used = new Set(out.map((t) => t.id))
  let seq = 400
  while (out.length < 56) {
    seq += 1
    const modality = rng.pick(MODS)
    const status = rng.pick(STATUSES)
    const day = rng.int(1, 4)
    let id = `LM-2026-${String(seq).padStart(4, '0')}`
    while (used.has(id)) {
      seq += 1
      id = `LM-2026-${String(seq).padStart(4, '0')}`
    }
    used.add(id)
    const sampleCount = rng.int(10, 200)
    const doneCount =
      status === 'done' ? sampleCount : status === 'created' || status === 'assigned' ? 0 : rng.int(0, sampleCount)
    const assigneeId = status === 'created' ? null : rng.pick(ASSIGNEES)
    out.push({
      id,
      title: `LingMou质检工单-${modality}-${seq}`,
      modality,
      status,
      urgency: rng.pick(URGENCIES),
      lane: rng.pick(LANES),
      creatorId: 'u-lm-admin',
      assigneeId,
      collaborators: assigneeId ? [assigneeId] : ['u-lm-annotator'],
      createdAt: `2026-11-0${day} ${String(rng.int(8, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      updatedAt: `2026-11-04 ${String(rng.int(9, 20)).padStart(2, '0')}:00:00`,
      batchId: `BATCH-${modality.toUpperCase()}-${seq}`,
      sampleCount,
      doneCount,
      resourceId: `res-seed-${modality}`,
      comments: [],
      history: [{ at: '2026-11-04 09:00:00', actor: '周明轩', action: '创建工单', note: 'seed' }],
      rejectReason: status === 'rejected' ? rng.pick(REJECTS) : null,
      bounceLog:
        status === 'rejected'
          ? [{ at: '2026-11-04 10:00:00', by: 'u-lm-reviewer', code: 'label_wrong', note: '边界漂移' }]
          : [],
      labelsSnapshot: [],
    })
  }
  return out
}

/**
 * Expand sample pool to production-feel volume, preserving hand rows.
 * @param {object[]} handRows
 * @param {object[]} tasks
 * @param {number} [seed]
 */
export function seedSamplePool(handRows, tasks, seed = 0x11A10E01) {
  const rng = createPrng(seed ^ 0x5a5a5a5a)
  const out = [...handRows]
  const used = new Set(out.map((s) => s.id))
  const statuses = ['pending', 'pending', 'pending', 'checking', 'pass', 'fail']
  let n = 6000
  const taskPool = tasks.length ? tasks : [{ id: 'ORN-2026-1104-0312', modality: 'text_ner' }]
  while (out.length < 56) {
    n += 1
    const task = rng.pick(taskPool)
    let id = `SPL-LM-${n}`
    while (used.has(id)) {
      n += 1
      id = `SPL-LM-${n}`
    }
    used.add(id)
    const status = rng.pick(statuses)
    out.push({
      id,
      taskId: task.id,
      modality: task.modality,
      status,
      reason: status === 'fail' ? rng.pick(REJECTS) : null,
      title: `${task.modality}样本 #${n}`,
      refluxed: status === 'refluxed' ? true : false,
    })
  }
  return out
}
