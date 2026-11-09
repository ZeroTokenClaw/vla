const fs = require('fs')

let qc = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/services/qc.js', 'utf8')
qc = qc.replace("tenantCode: payload.tenantCode || 'tenantCode-alpha'", "tenantCode: payload.tenantCode || 'tn-sc-01'")
qc = qc.replace(/priorities: SLA_CLASSES,\n/, '')
// ensure IDs use SC-
qc = qc.replace(/ORN-/g, 'SC-')
qc = qc.replace(/LM-/g, 'SC-')
qc = qc.replace(/DL-/g, 'SC-')
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/qc.js', qc)

let vla = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/services/vla.js', 'utf8')
vla = vla.replace(
  'stream: { joints: [], eeOpen: [], t: [], hz: 10 }',
  'stream: { joints: [], eeOpen: [], stamp: [], hz: 10 }',
)
vla = vla.replace(/ORN-/g, 'SC-')
vla = vla.replace(/LM-/g, 'SC-')
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/vla.js', vla)

let tr = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/services/train.js', 'utf8')
tr = tr.replace(/ORN-/g, 'SC-')
tr = tr.replace(/LM-/g, 'SC-')
// enrich new experiments with StarCompute fields
if (!tr.includes('repos:') && tr.includes('trainLog: [{ at: now()')) {
  tr = tr.replace(
    'trainLog: [{ at: now(), level: \'info\', message: \'实验已创建\' }],',
    `repos: [
      { id: \`CAT-SC-new-tr\`, name: '算力池回流训练集', partition: 'train', pin: 'r2026.11.05', sampleCount: 1000 },
      { id: \`CAT-SC-new-va\`, name: '算力池验证集', partition: 'val', pin: 'r2026.11.05', sampleCount: 200 },
    ],
    weights: [],
    evalSheet: [],
    errorGrid: [],
    trainLog: [{ at: now(), level: 'info', message: '实验已创建' }],`,
  )
}
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/train.js', tr)

let pre = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/services/prelabel.js', 'utf8')
pre = pre.replace(/ORN-/g, 'SC-')
pre = pre.replace(/LM-/g, 'SC-')
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/prelabel.js', pre)

console.log('svc fixes done')
console.log('qc tenant', qc.includes("tn-sc-01"))
console.log('vla stamp', vla.includes('stamp: []'))
