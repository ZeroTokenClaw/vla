const fs = require('fs')
const p = 'E:/omp/vla/vla-demo-naive/scripts/generate-samples.mjs'
let s = fs.readFileSync(p, 'utf8')
s = s.replace(/sine=frequency=\$\{[^}]+\}/g, 'sine=frequency=${180 + i * 113}')
fs.writeFileSync(p, s)
console.log('generator audio freq updated', s.includes('180 + i * 113'))