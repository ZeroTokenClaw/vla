const fs = require('fs')
for (const f of ['TextPrelabel.vue', 'VisionPrelabel.vue']) {
  const s = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/views/prelabel/' + f, 'utf8')
  const i = s.indexOf('class="side"')
  console.log('====', f, 'pag', s.includes('n-pagination'), 'res.items', s.includes('res.items'))
  console.log(s.slice(i, i + 900))
}
