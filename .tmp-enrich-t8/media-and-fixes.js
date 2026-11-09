const fs = require('fs')

// Fix Naive v-model on filter inputs we added
for (const rel of [
  'src/views/vla/CollectConfig.vue',
  'src/views/train/AlgoConfig.vue',
]) {
  const p = 'E:/omp/vla/vla-demo-naive/' + rel
  let s = fs.readFileSync(p, 'utf8')
  s = s.replace(/v-model:value="filters\./g, 'v-model="filters.')
  s = s.replace(/v-model:value="listFilters\./g, 'v-model="listFilters.')
  fs.writeFileSync(p, s)
}

// Fix existing vla.spec createCollectTask scene
let vs = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/services/vla.spec.js', 'utf8')
vs = vs.replace("scene: 'lab_bench'", "scene: 'clean_bench'")
fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/services/vla.spec.js', vs)

// Media generator based on Orion, brand LingMou, dark striped colors
const gen = fs.readFileSync('E:/omp/vla/vla-demo-antd/scripts/generate-samples.mjs', 'utf8')
  .replace(/Orion/g, 'LingMou')
  .replace(/brand = 'LingMou'/, "brand = 'LingMou'")
let genOut = gen
// Change color palette to dark stripe-ish
genOut = genOut.replace(
  /const colors = \[[^\]]+\]/,
  "const colors = ['#1f1f2e','#2a1f3d','#1a2a3a','#2e1a2a','#1f2e28','#3a2a1f']",
)
// Use noise/geq to differentiate hashes if present; otherwise color alone differs
fs.writeFileSync('E:/omp/vla/vla-demo-naive/scripts/generate-samples.mjs', genOut)

const genSpec = fs.readFileSync('E:/omp/vla/vla-demo-antd/scripts/generate-samples.spec.js', 'utf8')
  .replace(/Orion/g, 'LingMou')
  .replace(/vla-demo-antd/g, 'vla-demo-naive')
fs.writeFileSync('E:/omp/vla/vla-demo-naive/scripts/generate-samples.spec.js', genSpec)

console.log('media scripts ready', genOut.includes('LingMou'), genOut.includes('#1f1f2e'))
console.log(fs.readFileSync('E:/omp/vla/vla-demo-naive/scripts/generate-samples.mjs','utf8').slice(0,500))