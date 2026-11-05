import { createPrng } from './prng'

const STATUSES = ['created', 'assigned', 'annotating', 'reviewing', 'final_review', 'done', 'rejected']
const MODS = ['text_ner', 'seg', 'audio_slice', 'video_det', 'point_seg']
const PRIOS = ['high', 'medium', 'low']
const BUS = ['BU-华东', 'BU-华南', 'BU-华北', 'BU-西南']
const REJECTS = ['label_miss', 'label_wrong', 'boundary_bad', 'spec_violate', 'sample_bad']
const ASSIGNEES = ['u-dl-annotator', 'u-dl-annotator-2', null]

/**
 * Merge hand-written showcase rows with seeded bulk (≥56 total).
 * @param {object[]} handRows
 * @param {number} [seed]
 */
export function seedQcTasks(handRows, seed = 0xD11A7E01) {
  const rng = createPrng(seed)
  const out = [...handRows]
  const used = new Set(out.map((t) => t.id))
  let seq = 400
  while (out.length < 56) {
    seq += 1
    const modality = rng.pick(MODS)
    const status = rng.pick(STATUSES)
    const day = rng.int(1, 4)
    let id = `DL-2026-11${String(day).padStart(2, '0')}-${String(seq).padStart(4, '0')}`
    while (used.has(id)) {
      seq += 1
      id = `DL-2026-11${String(day).padStart(2, '0')}-${String(seq).padStart(4, '0')}`
    }
    used.add(id)
    const sampleCount = rng.int(10, 200)
    const doneCount =
      status === 'done' ? sampleCount : status === 'created' || status === 'assigned' ? 0 : rng.int(0, sampleCount)
    const assigneeId = status === 'created' ? null : rng.pick(ASSIGNEES)
    out.push({
      id,
      title: `数联质检工单-${modality}-${seq}`,
      modality,
      status,
      priority: rng.pick(PRIOS),
      buCode: rng.pick(BUS),
      creatorId: 'u-dl-admin',
      assigneeId,
      collaborators: assigneeId ? [assigneeId] : ['u-dl-annotator'],
      createdAt: `2026-11-0${day} ${String(rng.int(8, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      updatedAt: `2026-11-04 ${String(rng.int(9, 20)).padStart(2, '0')}:00:00`,
      batchId: `BATCH-${modality.toUpperCase()}-${seq}`,
      sampleCount,
      doneCount,
      resourceId: `res-seed-${modality}`,
      comments: [],
      history: [{ at: '2026-11-04 09:00:00', actor: '周明轩', action: '创建工单', note: 'seed' }],
      rejectReason: status === 'rejected' ? rng.pick(REJECTS) : null,
      rejectChain:
        status === 'rejected'
          ? [{ at: '2026-11-04 10:00:00', by: 'u-dl-reviewer', reason: 'label_miss' }]
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
export function seedSamplePool(handRows, tasks, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x5a5a5a5a)
  const out = [...handRows]
  const used = new Set(out.map((s) => s.id))
  const statuses = ['pending', 'pending', 'pending', 'checking', 'pass', 'fail']
  let n = 6000
  const taskPool = tasks.length ? tasks : [{ id: 'DL-2026-1104-0312', modality: 'text_ner' }]
  while (out.length < 56) {
    n += 1
    const task = rng.pick(taskPool)
    let id = `SPL-DL-${n}`
    while (used.has(id)) {
      n += 1
      id = `SPL-DL-${n}`
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
