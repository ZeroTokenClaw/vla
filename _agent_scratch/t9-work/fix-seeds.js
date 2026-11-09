const fs = require('fs')

// ---- fix qc.js ----
let qc = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/seed/qc.js', 'utf8')
qc = qc.replace(
  "const slaClass = t.slaClass || (t.priority === 'high' ? 'P0' : t.priority === 'low' ? 'P2' : 'P1')",
  "const slaClass = t.slaClass || (t.priority === 'high' ? 'S' : t.priority === 'low' ? 'B' : 'A')",
)
qc = qc.replace(
  "[{ at: t.updatedAt || '2026-11-04 09:45:00', by: 'u-sc-reviewer', code: t.rejectReason || 'label_miss', note: '边界漂移' }]",
  "[{ at: t.updatedAt || '2026-11-04 09:45:00', operatorId: 'u-sc-reviewer', reasonCode: t.rejectReason || 'label_miss' }]",
)
qc = qc.replace(
  "[{ at: '2026-11-04 10:00:00', by: 'u-sc-reviewer', code: 'label_wrong', note: '边界漂移' }]",
  "[{ at: '2026-11-04 15:00:00', operatorId: 'u-sc-reviewer', reasonCode: 'spec_violate' }]",
)
qc = qc.replace("id: 'ORN-2026-1104-0312'", "id: 'SC-2026-1104-0312'")
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/seed/qc.js', qc)
console.log('qc fixed', qc.includes("reasonCode"), qc.includes("'S'"))

// ---- fix vla.js ----
let vla = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/seed/vla.js', 'utf8')
vla = vla.replace('return { joints, eeOpen, t, hz: 10 }', 'return { joints, eeOpen, stamp: t, hz: 10 }')
vla = vla.replace('stream.{joints,eeOpen,t}', 'stream.{joints,eeOpen,stamp}')
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/seed/vla.js', vla)
console.log('vla fixed', vla.includes('stamp: t'))

// ---- fix train.js ----
let tr = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/seed/train.js', 'utf8')
tr = tr.replace(
  'const { datasets, checkpoints, valTable, confusionMatrix, logs, ...rest } = e',
  'const { datasets, checkpoints, valTable, confusionMatrix, logs, corpora, snapshots, scoreSheet, mixMatrix, consoleLines, catalog, ckptList, evalGrid, cmMatrix, runLog, ...rest } = e',
)
// seed base still may say trainLog: [{...}] from consoleLines rename - check
if (!tr.includes('trainLog: [{')) {
  // ok if already trainLog from xform of consoleLines in base object
}
tr = tr.replace(
  /trainLog: \[\{ at: `2026-11-0\$\{day\} 10:00:00`, level: 'info', message: 'seed created' \}\]/g,
  "trainLog: [{ at: `2026-11-0${day} 10:00:00`, level: 'info', message: 'seed created' }]",
)
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/seed/train.js', tr)
console.log('train fixed')

// media brand
let mm = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/seed/media-manifest.js', 'utf8')
mm = mm.replace("brand: 'LingMou'", "brand: 'StarCompute'")
mm = mm.replace('LingMou desensitized', 'StarCompute desensitized')
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/seed/media-manifest.js', mm)
console.log('media', mm.includes('StarCompute'))
