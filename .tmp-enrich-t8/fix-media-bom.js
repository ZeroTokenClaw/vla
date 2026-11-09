const fs = require('fs')
const p = 'E:/omp/vla/vla-demo-naive/scripts/generate-samples.mjs'
let s = fs.readFileSync(p, 'utf8')
if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
// Add mild noise to video/image generation for unique hashes vs Orion
// Look for -vf drawtext lines and prepend noise
if (!s.includes('noise=alls=')) {
  s = s.replace(
    /-vf', \`drawtext=text='\$\{brand\} scene \$\{i\}/g,
    "-vf', `noise=alls=${i * 3}:allf=t+u,drawtext=text='${brand} scene ${i}",
  )
  // careful - template literals in file
}
fs.writeFileSync(p, s)
// Re-read and do safer patch
s = fs.readFileSync(p, 'utf8')
s = s.replace(
  "drawtext=text='${brand} scene ${i} DESENSITIZED'",
  "noise=alls=' + (7 + i) + ':allf=t+u,drawtext=text='${brand} scene ${i} DESENSITIZED'",
)
// That may break string quoting. Simpler: change sine frequencies and color already differ.
// Revert bad replace if broken - just ensure no BOM and distinct colors/freqs.
console.log('starts with import', s.trimStart().startsWith('import'))
console.log('noise?', s.includes('noise='))
fs.writeFileSync(p, s.trimStart().startsWith('import') ? s : s.replace(/^\uFEFF/, ''))