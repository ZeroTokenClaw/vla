const fs = require('fs')
let qc = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/services/qc.js', 'utf8')

qc = qc.replace(
  `  if (toStatus === 'rejected') {
    t.rejectReason = extra.rejectReason || 'other'
  }`,
  `  if (toStatus === 'rejected') {
    t.rejectReason = extra.rejectReason || 'other'
    if (!Array.isArray(t.bounceLog)) t.bounceLog = []
    t.bounceLog.push({
      at: now(),
      by: auth.user?.id || 'unknown',
      code: t.rejectReason,
      note: note || '',
    })
  }`,
)

// Fix listSamplePool - find current implementation
const m = qc.match(/export async function listSamplePool[\s\S]*?\n\}/)
console.log('OLD listSamplePool:', m && m[0])
if (m) {
  qc = qc.replace(
    m[0],
    `export async function listSamplePool(query = {}) {
  await businessDelay()
  const { page, pageSize, status, modality, keyword } = query
  let rows = [...state.samplePool]
  if (status) rows = rows.filter((s) => s.status === status)
  if (modality) rows = rows.filter((s) => s.modality === modality)
  if (keyword) {
    const kw = String(keyword).trim()
    rows = rows.filter(
      (s) =>
        s.id.includes(kw) ||
        (s.title || '').includes(kw) ||
        (s.taskId || '').includes(kw),
    )
  }
  const result = paginate(rows, { page, pageSize })
  return {
    ...result,
    items: result.items.map((s) => ({ ...s })),
  }
}`,
  )
}

fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/services/qc.js', qc)
console.log('bounceLog', (qc.match(/bounceLog/g) || []).length)
console.log('listSamplePool ok', /listSamplePool\(query/.test(qc))