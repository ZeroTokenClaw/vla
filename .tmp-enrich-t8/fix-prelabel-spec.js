const fs = require('fs')
const p = 'E:/omp/vla/vla-demo-naive/src/services/prelabel.spec.js'
let s = fs.readFileSync(p, 'utf8')
s = s.replace(
  'const jobs = await listAcceptJobs()\n    const job = jobs.find((j) => j.id === \'LM-ACC-2026-003\')',
  "const jobs = await listAcceptJobs({ page: 1, pageSize: 200 })\n    const job = jobs.items.find((j) => j.id === 'LM-ACC-2026-003')",
)
fs.writeFileSync(p, s)
console.log('fixed', s.includes('jobs.items.find'))

// Scan for other list* that expect arrays
const root = 'E:/omp/vla/vla-demo-naive/src'
function walk(d, acc=[]) {
  for (const n of fs.readdirSync(d)) {
    const f = d + '/' + n
    if (fs.statSync(f).isDirectory()) walk(f, acc)
    else if (/\.(js|vue)$/.test(n)) acc.push(f)
  }
  return acc
}
for (const f of walk(root)) {
  const t = fs.readFileSync(f, 'utf8')
  if (/await list(QcTasks|VlaTasks|Experiments|TextDocs|VisionImages|AcceptJobs|SamplePool)\(\)/.test(t) ||
      /await list\w+\([^)]*\)\)\.(find|map|filter|forEach|length)/.test(t)) {
    const lines = t.split('\n')
    lines.forEach((l,i) => {
      if (/list(QcTasks|VlaTasks|Experiments|TextDocs|VisionImages|AcceptJobs|SamplePool)/.test(l) && /\.(find|map|filter|forEach|length)/.test(l) && !/\.items\./.test(l)) {
        console.log('maybe', f.split('naive/')[1]+':'+(i+1), l.trim())
      }
    })
  }
}