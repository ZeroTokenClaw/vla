const fs = require('fs')

// Verify CollectConfig imports and filters
let s = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/views/vla/CollectConfig.vue', 'utf8')
console.log('Collect import', s.match(/import \{[^}]+\} from 'vue'/))
console.log('filters def', s.includes('const filters = reactive'))
console.log('page def', s.includes('const page = ref'))
// If reactive missing
if (s.includes('filters = reactive') && !/import \{[^}]*reactive/.test(s)) {
  s = s.replace(/import \{([^}]+)\} from 'vue'/, (m, inner) => `import { ${inner.trim()}, reactive } from 'vue'`)
  fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/views/vla/CollectConfig.vue', s)
  console.log('added reactive to CollectConfig')
}

let a = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/views/train/AlgoConfig.vue', 'utf8')
console.log('Algo import', a.match(/import \{[^}]+\} from 'vue'/))
if (a.includes('listFilters = reactive') && !/import \{[^}]*reactive/.test(a)) {
  a = a.replace(/import \{([^}]+)\} from 'vue'/, (m, inner) => `import { ${inner.trim()}, reactive } from 'vue'`)
  fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/views/train/AlgoConfig.vue', a)
  console.log('added reactive to AlgoConfig')
}

// Write list specs
const qcSpec = `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('LingMou QC thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('uses urgency/lane/squad and LM- ids', async () => {
    const { createInitialTasks } = await import('@/mock/qc')
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(50)
    expect(tasks.every((t) => t.id.startsWith('LM-'))).toBe(true)
    expect(tasks.every((t) => ['urgent', 'normal', 'backlog'].includes(t.urgency))).toBe(true)
    expect(tasks.every((t) => String(t.lane).startsWith('lane-'))).toBe(true)
    expect(tasks.some((t) => 'severity' in t || 'priority' in t)).toBe(false)
    const showcase = tasks.find((t) => t.id === 'LM-2026-1104-0312')
    expect(showcase).toBeTruthy()
    const { users } = await import('@/mock/users')
    expect(users.every((u) => typeof u.squad === 'string')).toBe(true)
    expect(users.some((u) => 'dept' in u)).toBe(false)
  })

  it('pages with urgency filter and falls back illegal page', async () => {
    const { listQcTasks } = await import('@/services/qc')
    const res = await listQcTasks({ page: 1, pageSize: 10, urgency: 'urgent' })
    expect(res.items.every((t) => t.urgency === 'urgent')).toBe(true)
    expect(res.total).toBeGreaterThanOrEqual(1)
    expect((await listQcTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
`

const vlaSpec = `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('LingMou VLA thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('episodes use signal.dof/claw/t and LingMou scenes', async () => {
    const { VLA_TASKS, SCENE_OPTIONS } = await import('@/mock/vla')
    expect(VLA_TASKS.length).toBeGreaterThanOrEqual(50)
    expect(SCENE_OPTIONS.map((s) => s.value)).toEqual([
      'stove_top',
      'clean_bench',
      'tote_wall',
      'dual_monitor',
    ])
    expect(VLA_TASKS.some((t) => t.id === 'LM-VLA-2026-001')).toBe(true)
    const ep = VLA_TASKS.find((t) => t.signal?.dof?.length >= 5)
    expect(ep).toBeTruthy()
    expect(ep.signal.claw.length).toBe(ep.signal.t.length)
    expect(ep).not.toHaveProperty('trajectory')
    expect(ep).not.toHaveProperty('telem')
    expect(new Set(VLA_TASKS.map((t) => t.videoUrl)).size).toBeGreaterThanOrEqual(4)
  })

  it('pages vla tasks by scene', async () => {
    const { listVlaTasks } = await import('@/services/vla')
    const res = await listVlaTasks({ page: 1, pageSize: 10, scene: 'stove_top' })
    expect(res.items.every((t) => t.scene === 'stove_top')).toBe(true)
    expect((await listVlaTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
`

const trainSpec = `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('LingMou train thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('uses corpora/snapshots/scoreSheet/mixMatrix/consoleLines', async () => {
    const { EXPERIMENTS } = await import('@/mock/train')
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(50)
    const e = EXPERIMENTS.find((x) => x.id === 'LM-EXP-2026-001')
    expect(e).toBeTruthy()
    expect(e.corpora[0]).toEqual(
      expect.objectContaining({ part: expect.any(String), tag: expect.any(String) }),
    )
    expect(e.snapshots.length).toBeGreaterThanOrEqual(1)
    expect(e.scoreSheet.length).toBeGreaterThanOrEqual(3)
    expect(e.mixMatrix.length).toBeGreaterThanOrEqual(3)
    expect(e.consoleLines.length).toBeGreaterThanOrEqual(30)
    expect(e).not.toHaveProperty('catalog')
    expect(e).not.toHaveProperty('datasets')
    expect(e).not.toHaveProperty('logs')
  })

  it('pages experiments', async () => {
    const { listExperiments } = await import('@/services/train')
    const res = await listExperiments({ page: 1, pageSize: 10 })
    expect(res.items.length).toBe(10)
    expect(res.total).toBeGreaterThanOrEqual(50)
    expect((await listExperiments({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
`

const preSpec = `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('LingMou prelabel thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('seeds LM-TXT/LM-IMG >=50 and keeps showcase Diff id', async () => {
    const { TEXT_DOCS, VISION_IMAGES } = await import('@/mock/prelabel')
    expect(TEXT_DOCS.length).toBeGreaterThanOrEqual(50)
    expect(VISION_IMAGES.length).toBeGreaterThanOrEqual(50)
    expect(TEXT_DOCS.every((d) => d.id.startsWith('LM-TXT-'))).toBe(true)
    expect(VISION_IMAGES.every((d) => d.id.startsWith('LM-IMG-'))).toBe(true)
    const showcase = TEXT_DOCS.find((d) => d.id === 'LM-TXT-2026-001')
    expect(showcase.model.entities.some((e) => e.id === 'te4' && e.type === 'ORG')).toBe(true)
  })

  it('pages text docs', async () => {
    const { listTextDocs } = await import('@/services/prelabel')
    const res = await listTextDocs({ page: 1, pageSize: 10 })
    expect(res.items.length).toBe(10)
    expect(res.total).toBeGreaterThanOrEqual(50)
  })
})
`

const dir = 'E:/omp/vla/vla-demo-naive/src/services'
fs.writeFileSync(dir + '/qc.list.spec.js', qcSpec)
fs.writeFileSync(dir + '/vla.list.spec.js', vlaSpec)
fs.writeFileSync(dir + '/train.list.spec.js', trainSpec)
fs.writeFileSync(dir + '/prelabel.list.spec.js', preSpec)
console.log('specs written')