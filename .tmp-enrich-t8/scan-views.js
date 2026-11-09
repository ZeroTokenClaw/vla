const fs = require('fs')

function showHits(p) {
  const s = fs.readFileSync(p, 'utf8')
  s.split('\n').forEach((l, i) => {
    if (/listQc|listSample|listVla|listExp|listText|listVision|\.items|pageSize|dept|priority|logs/.test(l)) {
      console.log(p.split('naive/')[1] + ':' + (i + 1), l.trim())
    }
  })
}
for (const f of [
  'src/views/qc/WorkflowBoard.vue',
  'src/views/qc/AnnotateWorkbench.vue',
  'src/views/qc/SampleCheck.vue',
  'src/views/vla/CollectConfig.vue',
  'src/views/train/AlgoConfig.vue',
  'src/views/prelabel/TextPrelabel.vue',
  'src/views/prelabel/VisionPrelabel.vue',
]) {
  console.log('====', f)
  showHits('E:/omp/vla/vla-demo-naive/' + f)
}