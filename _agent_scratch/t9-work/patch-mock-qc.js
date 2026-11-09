const fs = require('fs')

// ========== users: dept -> pool ==========
let users = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/users.js', 'utf8')
users = users.replace(/\bdept:/g, 'pool:')
users = users.replace("pool: '算力调度中心'", "pool: '算力调度中心'")
users = users.replace(/质检算力组/, '质检池')
users = users.replace(/标注实验组/g, '标注池-A')
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/users.js', users)
console.log('users', users.includes('pool:'), !users.includes('dept:'))

// ========== qc mock ==========
let qc = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/qc.js', 'utf8')
if (!qc.includes("from './seed/qc'")) {
  qc = "import { seedQcTasks, seedSamplePool } from './seed/qc'\n" + qc
}
qc = qc.replace(
  /export const PRIORITIES = \[[\s\S]*?\]/,
  `export const SLA_CLASSES = [
  { value: 'S', label: 'S级' },
  { value: 'A', label: 'A级' },
  { value: 'B', label: 'B级' },
]

export const TENANTS = [
  { value: 'tn-sc-01', label: '租户 tn-sc-01' },
  { value: 'tn-sc-02', label: '租户 tn-sc-02' },
  { value: 'tn-sc-03', label: '租户 tn-sc-03' },
]`,
)

// Replace priority fields in hand rows
qc = qc.replace(/priority: 'high'/g, "slaClass: 'S'")
qc = qc.replace(/priority: 'medium'/g, "slaClass: 'A'")
qc = qc.replace(/priority: 'low'/g, "slaClass: 'B'")

// Inject tenantCode + reworkTrail after slaClass lines if missing - do via createInitialTasks wrap instead
if (!qc.includes('function buildInitialTasks') && !qc.includes('seedQcTasks(hand)')) {
  qc = qc.replace(
    /\/\*\* In-memory mutable store seeded once\. \*\/\nexport function createInitialTasks\(\) \{\n  return \[/,
    `/** In-memory mutable store seeded once. */
export function createInitialTasks() {
  const hand = [`,
  )
  // If that pattern didn't match, try without comment
  if (!qc.includes('const hand = [')) {
    qc = qc.replace(
      /export function createInitialTasks\(\) \{\n  return \[/,
      `export function createInitialTasks() {
  const hand = [`,
    )
  }
  // Close hand array and call seed - find the end of the return array before createInitialSamplePool or similar
  // Look for pattern ending the tasks array: typically `\n  ]\n}\n\nexport function createInitialSamplePool`
  if (qc.includes('const hand = [')) {
    qc = qc.replace(
      /(\n  \])\n\}\n\n(export function createInitialSamplePool|\/\*\* Sample check)/,
      `$1
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

$2`,
    )
  }
}

// Add tenantCode to hand rows that have slaClass but no tenantCode
if (!qc.includes("tenantCode: 'tn-sc-")) {
  qc = qc.replace(/slaClass: 'S'/g, "slaClass: 'S',\n      tenantCode: 'tn-sc-01'")
  qc = qc.replace(/slaClass: 'A'/g, "slaClass: 'A',\n      tenantCode: 'tn-sc-02'")
  qc = qc.replace(/slaClass: 'B'/g, "slaClass: 'B',\n      tenantCode: 'tn-sc-03'")
}

// Wrap sample pool
if (!qc.includes('seedSamplePool')) {
  // already imported
}
if (qc.includes('export function createInitialSamplePool') && !qc.includes('seedSamplePool(hand')) {
  qc = qc.replace(
    /export function createInitialSamplePool\(tasks = \[\]\) \{\n  return \[/,
    `export function createInitialSamplePool(tasks = []) {
  const hand = [`,
  )
  qc = qc.replace(
    /(\n  \])\n\}\n\n(export const SAMPLE_RULES|export const SPEC_SECTIONS|\/\*\* Spec)/,
    `$1
  try {
    return seedSamplePool(hand, tasks)
  } catch (e) {
    console.error('[starcompute] sample pool seed failed, fallback thin', e)
    return hand
  }
}

$2`,
  )
  // alternate end patterns
  if (!qc.includes('seedSamplePool(hand, tasks)')) {
    qc = qc.replace(
      /(\n  \])\n\}\n\n(export )/,
      (match, a, b) => {
        // only first remaining createInitialSamplePool close - risky; check
        return match
      },
    )
  }
}

fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/qc.js', qc)
console.log('qc mock', {
  seed: qc.includes('seedQcTasks'),
  hand: qc.includes('const hand = ['),
  sla: qc.includes('SLA_CLASSES'),
  tenant: qc.includes('tn-sc-01'),
  priorityLeft: /priority:/.test(qc),
  sampleSeed: qc.includes('seedSamplePool(hand'),
})
