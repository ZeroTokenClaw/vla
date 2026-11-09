const fs = require('fs')

// ========== PRELABEL SERVICE ==========
let pre = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/services/prelabel.js', 'utf8')
if (!pre.includes("from '@/mock/seed/paginate'")) {
  pre = pre.replace(
    "import { businessDelay } from './delay'",
    "import { businessDelay } from './delay'\nimport { paginate } from '@/mock/seed/paginate'",
  )
}
pre = pre.replace(
  /export async function listTextDocs\(\) \{[\s\S]*?return state\.texts\.map\(\(d\) => \(\{[\s\S]*?\}\)\)\n\}/,
  `export async function listTextDocs(query = {}) {
  await businessDelay()
  let rows = [...state.texts]
  if (query.status) rows = rows.filter((d) => d.status === query.status)
  if (query.batchId) rows = rows.filter((d) => d.batchId === query.batchId)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((d) => d.id.includes(kw) || d.title.includes(kw))
  }
  const result = paginate(rows, query)
  return {
    ...result,
    items: result.items.map((d) => ({
      id: d.id,
      title: d.title,
      batchId: d.batchId,
      status: d.status,
      progressPct: d.progressPct,
      spotCheckPass: d.spotCheckPass,
      hasCorrection: !!d.corrected,
    })),
  }
}`,
)
pre = pre.replace(
  /export async function listVisionImages\(\) \{[\s\S]*?return state\.visions\.map\(\(v\) => \(\{[\s\S]*?\}\)\)\n\}/,
  `export async function listVisionImages(query = {}) {
  await businessDelay()
  let rows = [...state.visions]
  if (query.status) rows = rows.filter((v) => v.status === query.status)
  if (query.batchId) rows = rows.filter((v) => v.batchId === query.batchId)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((v) => v.id.includes(kw) || v.title.includes(kw))
  }
  const result = paginate(rows, query)
  return {
    ...result,
    items: result.items.map((v) => ({
      id: v.id,
      title: v.title,
      batchId: v.batchId,
      imageUrl: v.imageUrl,
      status: v.status,
      progressPct: v.progressPct,
      spotCheckPass: v.spotCheckPass,
      ocrCorrected: v.ocrCorrected,
      yoloCorrected: v.yoloCorrected,
    })),
  }
}`,
)
pre = pre.replace(
  /export async function listAcceptJobs\(\) \{[\s\S]*?return state\.accepts\.map\(\(j\) => \(\{ \.\.\.j, stepDone: \[\.\.\.j\.stepDone\] \}\)\)\n\}/,
  `export async function listAcceptJobs(query = {}) {
  await businessDelay()
  let rows = state.accepts.map((j) => ({ ...j, stepDone: [...j.stepDone] }))
  if (query.status) rows = rows.filter((j) => j.status === query.status)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((j) => j.id.includes(kw) || j.title.includes(kw))
  }
  return paginate(rows, query)
}`,
)
fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/services/prelabel.js', pre)
console.log('prelabel', pre.includes('paginate(rows'))

// ========== VLA SERVICE ==========
let vla = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/services/vla.js', 'utf8')
if (!vla.includes("from '@/mock/seed/paginate'")) {
  vla = vla.replace(
    "import { businessDelay } from './delay'",
    "import { businessDelay } from './delay'\nimport { paginate } from '@/mock/seed/paginate'",
  )
}
vla = vla.replace(
  /personnel: users\.map\(\(u\) => \(\{ id: u\.id, name: u\.name, role: u\.role, dept: u\.dept \}\)\)/,
  "personnel: users.map((u) => ({ id: u.id, name: u.name, role: u.role, squad: u.squad }))",
)
vla = vla.replace(
  /export async function listVlaTasks\(\) \{[\s\S]*?return state\.tasks\.map\(\(t\) => \(\{[\s\S]*?\}\)\)\n\}/,
  `export async function listVlaTasks(query = {}) {
  await businessDelay()
  const { page, pageSize, status, scene, keyword } = query
  let rows = state.tasks.map((t) => ({
    id: t.id,
    name: t.name,
    scene: t.scene,
    plan: t.plan,
    mode: t.mode,
    status: t.status,
    createdAt: t.createdAt,
    durationSec: t.durationSec,
    totalFrames: t.totalFrames,
    videoUrl: t.videoUrl,
    imageUrl: t.imageUrl,
    actionCount: (t.actions || []).length,
    issueCount: (t.issues || t.issuesSeed || []).length,
    issuesDetected: t.issuesDetected,
    personnelIds: [...(t.personnelIds || [])],
  }))
  if (status) rows = rows.filter((t) => t.status === status)
  if (scene) rows = rows.filter((t) => t.scene === scene)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((t) => t.id.includes(kw) || t.name.includes(kw))
  }
  return paginate(rows, { page, pageSize })
}`,
)
// createCollectTask should use new default scene
vla = vla.replace("scene: 'lab_bench'", "scene: 'clean_bench'")
vla = vla.replace("scene: config.scene || 'warehouse_bin'", "scene: config.scene || 'tote_wall'")
// when creating task, attach empty signal
if (!vla.includes('signal:')) {
  // find createCollectTask push object - add signal after durationSec if present
}
// Look for createCollectTask return object fields
vla = vla.replace(
  /(const task = \{[\s\S]*?issuesSeed: \[\],)/,
  (m) => (m.includes('signal:') ? m : m + '\n    signal: { dof: [], claw: [], t: [], hz: 10 },'),
)
fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/services/vla.js', vla)
console.log('vla', vla.includes('paginate(rows'), vla.includes('squad'))

// ========== TRAIN SERVICE ==========
let tr = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/services/train.js', 'utf8')
if (!tr.includes("from '@/mock/seed/paginate'")) {
  tr = tr.replace(
    "import { businessDelay } from './delay'",
    "import { businessDelay } from './delay'\nimport { paginate } from '@/mock/seed/paginate'",
  )
}
tr = tr.replace(
  /export async function listExperiments\(\) \{[\s\S]*?return state\.experiments\.map\(\(e\) => \(\{[\s\S]*?\}\)\)\n\}/,
  `export async function listExperiments(query = {}) {
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
    corporaCount: e.corpora?.length || 0,
    snapshotCount: e.snapshots?.length || 0,
  }))
  if (status) rows = rows.filter((e) => e.status === status)
  if (algorithm) rows = rows.filter((e) => e.algorithm === algorithm)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter((e) => e.id.includes(kw) || e.name.includes(kw))
  }
  return paginate(rows, { page, pageSize })
}`,
)
// Replace all .logs with .consoleLines
tr = tr.replace(/\.logs\b/g, '.consoleLines')
tr = tr.replace(
  /logs: \[\{ at: now\(\), level: 'info', message: '实验已创建' \}\],/,
  `consoleLines: [{ at: now(), level: 'info', message: '实验已创建' }],
    corpora: [
      { id: \`CAT-LM-new-tr\`, name: '待绑定训练集', part: 'train', tag: 'draft', sampleCount: 0 },
    ],
    snapshots: [],
    scoreSheet: [],
    mixMatrix: [],`,
)
fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/services/train.js', tr)
console.log('train', tr.includes('consoleLines'), !tr.includes('.logs'), tr.includes('paginate(rows'))