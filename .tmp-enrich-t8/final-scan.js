const fs = require('fs')
const path = require('path')
function walk(d, acc=[]) {
  for (const n of fs.readdirSync(d)) {
    const f = path.join(d,n)
    if (fs.statSync(f).isDirectory()) walk(f, acc)
    else acc.push(f)
  }
  return acc
}
const hits = []
for (const f of walk('E:/omp/vla/vla-demo-naive/src')) {
  if (!/\.(js|vue)$/.test(f)) continue
  const lines = fs.readFileSync(f,'utf8').split('\n')
  lines.forEach((l,i) => {
    if (/listAcceptJobs|listTextDocs|listVisionImages|listQcTasks|listVlaTasks|listExperiments|listSamplePool/.test(l)) {
      hits.push(f.split('vla-demo-naive\\')[1] + ':' + (i+1) + ' ' + l.trim())
    }
  })
}
console.log(hits.join('\n'))

// strip BOM from any written files
for (const f of walk('E:/omp/vla/vla-demo-naive/src/mock')) {
  let s = fs.readFileSync(f)
  if (s[0] === 0xef && s[1] === 0xbb && s[2] === 0xbf) {
    fs.writeFileSync(f, s.slice(3))
    console.log('stripped BOM', f)
  }
}