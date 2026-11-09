const fs = require('fs')
const p = 'E:/omp/vla/vla-demo-naive/src/mock/qc.js'
let qc = fs.readFileSync(p, 'utf8')

// Fix createInitialTasks closing: currently ends hand array then bare }
const marker = `      refluxed: true,
    },
  ]
}

export const SAMPLE_RULES`
const replacement = `      refluxed: true,
    },
  ]
  try {
    return seedQcTasks(hand)
  } catch (e) {
    console.error('[lingmou] qc seed failed, fallback thin', e)
    return hand.map((t) => ({
      ...t,
      urgency: t.urgency || 'normal',
      lane: t.lane || 'lane-alpha',
      bounceLog: t.bounceLog || [],
    }))
  }
}

export const SAMPLE_RULES`
if (!qc.includes(marker)) {
  console.error('marker not found')
  // try softer
  const idx = qc.indexOf('export const SAMPLE_RULES')
  console.log(JSON.stringify(qc.slice(idx - 120, idx)))
  process.exit(1)
}
qc = qc.replace(marker, replacement)
fs.writeFileSync(p, qc)
console.log('fixed', qc.includes('return seedQcTasks(hand)'))