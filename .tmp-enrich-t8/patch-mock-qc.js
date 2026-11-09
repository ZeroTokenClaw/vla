const fs = require('fs')
const path = require('path')

// ---------- users ----------
fs.writeFileSync(
  'E:/omp/vla/vla-demo-naive/src/mock/users.js',
  `/** Demo accounts for 灵眸 VLA Studio role switching. */
export const users = [
  {
    id: 'u-lm-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    squad: '具身数据中心',
  },
  {
    id: 'u-lm-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    squad: '质检哨',
  },
  {
    id: 'u-lm-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    squad: '夜班标注舱',
  },
  {
    id: 'u-lm-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    squad: '夜班标注舱',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]
`,
)
console.log('users ok')

// ---------- qc mock ----------
let qc = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/mock/qc.js', 'utf8')
qc = qc.replace(
  /export const PRIORITIES = \[[\s\S]*?\]/,
  `export const URGENCIES = [
  { value: 'urgent', label: '紧急' },
  { value: 'normal', label: '普通' },
  { value: 'backlog', label: '积压' },
]

export const LANES = [
  { value: 'lane-alpha', label: 'Lane Alpha' },
  { value: 'lane-beta', label: 'Lane Beta' },
  { value: 'lane-gamma', label: 'Lane Gamma' },
]`,
)
// map hand priority fields
qc = qc.replace(/priority: 'high'/g, "urgency: 'urgent',\n      lane: 'lane-alpha'")
qc = qc.replace(/priority: 'medium'/g, "urgency: 'normal',\n      lane: 'lane-beta'")
qc = qc.replace(/priority: 'low'/g, "urgency: 'backlog',\n      lane: 'lane-gamma'")
// ensure rejected has bounceLog placeholder (seed will fill)
qc = qc.replace(
  "export function createInitialTasks() {\n  return [",
  `import { seedQcTasks, seedSamplePool } from './seed/qc'

export function createInitialTasks() {
  const hand = [`,
)
// close hand array and wrap seed — find the end of createInitialTasks return array
// Original ends with `  ]\n}` before SAMPLE_RULES
if (!qc.includes("import { seedQcTasks")) {
  // already handled above if replace worked; if import was inserted mid-file, move it to top
}
// Move import to top
qc = qc.replace(/\nimport \{ seedQcTasks, seedSamplePool \} from '\.\/seed\/qc'\n/, '\n')
qc = "import { seedQcTasks, seedSamplePool } from './seed/qc'\n" + qc.replace(
  /^import \{ seedQcTasks, seedSamplePool \} from '\.\/seed\/qc'\n/,
  '',
)

// Replace trailing of createInitialTasks
qc = qc.replace(
  /(\n    \},\n  \])\n\}(\n\n\nexport const SAMPLE_RULES)/,
  `$1
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
}$2`,
)

qc = qc.replace(
  /export function createInitialSamplePool\(\) \{\n  return \[/,
  `export function createInitialSamplePool(tasks = []) {
  const hand = [`,
)
qc = qc.replace(
  /(\n    \},\n  \])\n\}(\s*)$/,
  `$1
  try {
    return seedSamplePool(hand, tasks)
  } catch (e) {
    console.error('[lingmou] sample pool seed failed, fallback thin', e)
    return hand
  }
}
`,
)

// update spec section text about bounceLog
qc = qc.replace(
  '抽检不合格须填写驳回原因；返修后重新进入初审。合格样本写入回流库，供训练集引用。',
  '抽检不合格须填写驳回原因并写入 bounceLog；返修后重新进入初审。合格样本写入回流库，供训练侧 corpora 引用。',
)

fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/mock/qc.js', qc)
console.log('qc mock', qc.includes('seedQcTasks'), qc.includes('URGENCIES'), qc.includes('priority:'))