const fs = require('fs')
const p = 'E:/omp/vla/vla-demo-naive/src/mock/seed/vla.js'
let s = fs.readFileSync(p, 'utf8')
s = s.replace(
  /function makeSignal\(rng, frames = 24, dof = 7\) \{\s*const dof = \[\]\s*const claw = \[\]\s*const t = \[\]\s*for \(let i = 0; i < frames; i \+= 1\) \{\s*dof\.push\(\s*Array\.from\(\{ length: dof \}/,
  `function makeSignal(rng, frames = 24, dofCount = 7) {
  const dof = []
  const claw = []
  const t = []
  for (let i = 0; i < frames; i += 1) {
    dof.push(
      Array.from({ length: dofCount }`,
)
fs.writeFileSync(p, s)
// verify
const v = fs.readFileSync(p, 'utf8')
console.log(v.slice(0, 450))
console.log('--- sceneMap ---')
const m = v.match(/const sceneMap = \{[\s\S]*?\n  \}/)
console.log(m && m[0])
console.log('scenes array', v.match(/const scenes = \[[\s\S]*?\]/))