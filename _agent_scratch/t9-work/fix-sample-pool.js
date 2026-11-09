const fs = require('fs')
let qc = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/qc.js', 'utf8')
qc = qc.replace(
  `export function createInitialSamplePool() {
  return [`,
  `export function createInitialSamplePool(tasks = []) {
  const hand = [`,
)
qc = qc.replace(
  `      refluxed: false,
    },
  ]
}`,
  `      refluxed: false,
    },
  ]
  try {
    return seedSamplePool(hand, tasks)
  } catch (e) {
    console.error('[starcompute] sample pool seed failed, fallback thin', e)
    return hand
  }
}`,
)
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/qc.js', qc)
console.log('sample pool wrapped', qc.includes('seedSamplePool(hand, tasks)'), qc.includes('seedQcTasks(hand)'))
