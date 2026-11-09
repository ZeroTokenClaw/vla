const fs = require('fs')
let qc = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/qc.js', 'utf8')

// Fix createInitialTasks to call seedQcTasks
qc = qc.replace(
  `  ]
  try {
    return seedSamplePool(hand, tasks)
  } catch (e) {
    console.error('[starcompute] sample pool seed failed, fallback thin', e)
    return hand
  }
}

export const SAMPLE_RULES = [`,
  `  ]
  try {
    return seedQcTasks(hand)
  } catch (e) {
    console.error('[starcompute] qc seed failed, fallback thin', e)
    return hand.map((t) => ({
      ...t,
      slaClass: t.slaClass || 'A',
      tenantCode: t.tenantCode || 'tn-sc-01',
      reworkTrail: t.reworkTrail || [],
    }))
  }
}

export const SAMPLE_RULES = [`,
)

// Fix createInitialSamplePool
console.log('createInitialSamplePool at', qc.indexOf('export function createInitialSamplePool'))
const poolStart = qc.indexOf('export function createInitialSamplePool')
console.log(qc.slice(poolStart, poolStart + 400))

fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/qc.js', qc)
