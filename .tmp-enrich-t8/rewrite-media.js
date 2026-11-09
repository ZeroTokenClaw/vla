const fs = require('fs')
const path = require('path')
let s = fs.readFileSync('E:/omp/vla/vla-demo-antd/scripts/generate-samples.mjs', 'utf8')
s = s.replace(/Orion/g, 'LingMou')
s = s.replace(
  /const colors = \[[^\]]+\]/,
  "const colors = ['#1f1f2e','#2a1f3d','#1a2a3a','#2e1a2a','#1f2e28','#3a2a1f']",
)
// bump audio freqs for unique hashes
s = s.replace(
  /sine=frequency=\$\{300 \+ i \* 80\}/g,
  'sine=frequency=${220 + i * 97}',
)
// dark stripe note in comment
s = s.replace(
  'const brand = \'LingMou\'',
  "const brand = 'LingMou' // dark stripe palette; independent of Orion/DataLink",
)
fs.writeFileSync('E:/omp/vla/vla-demo-naive/scripts/generate-samples.mjs', s)

let sp = fs.readFileSync('E:/omp/vla/vla-demo-antd/scripts/generate-samples.spec.js', 'utf8')
sp = sp.replace(/Orion/g, 'LingMou').replace(/vla-demo-antd/g, 'vla-demo-naive')
fs.writeFileSync('E:/omp/vla/vla-demo-naive/scripts/generate-samples.spec.js', sp)
console.log('rewrote generator')