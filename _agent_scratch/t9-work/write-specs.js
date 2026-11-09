const fs = require('fs')

fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/qc.list.spec.js', `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('StarCompute QC thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('uses slaClass/tenantCode/pool and SC- ids', async () => {
    const { createInitialTasks } = await import('@/mock/qc')
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(50)
    expect(tasks.every((t) => t.id.startsWith('SC-'))).toBe(true)
    expect(tasks.every((t) => ['S', 'A', 'B'].includes(t.slaClass))).toBe(true)
    expect(tasks.every((t) => String(t.tenantCode).startsWith('tn-sc-'))).toBe(true)
    expect(tasks.some((t) => 'severity' in t || 'priority' in t || 'urgency' in t)).toBe(false)
    const showcase = tasks.find((t) => t.id === 'SC-2026-1104-0312')
    expect(showcase).toBeTruthy()
    const { users } = await import('@/mock/users')
    expect(users.every((u) => typeof u.pool === 'string')).toBe(true)
    expect(users.some((u) => 'dept' in u)).toBe(false)
  })

  it('pages with slaClass filter and falls back illegal page', async () => {
    const { listQcTasks } = await import('@/services/qc')
    const res = await listQcTasks({ page: 1, pageSize: 10, slaClass: 'S' })
    expect(res.items.every((t) => t.slaClass === 'S')).toBe(true)
    expect(res.total).toBeGreaterThanOrEqual(1)
    expect((await listQcTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
`)

fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/vla.list.spec.js', `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('StarCompute VLA thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('episodes use stream.joints/eeOpen/stamp and StarCompute scenes', async () => {
    const { VLA_TASKS, SCENE_OPTIONS } = await import('@/mock/vla')
    expect(VLA_TASKS.length).toBeGreaterThanOrEqual(50)
    expect(SCENE_OPTIONS.map((s) => s.value)).toEqual([
      'pack_station',
      'chem_hood',
      'sku_cage',
      'sit_stand',
    ])
    expect(VLA_TASKS.some((t) => t.id === 'SC-VLA-2026-001')).toBe(true)
    const ep = VLA_TASKS.find((t) => t.stream?.joints?.length >= 5)
    expect(ep).toBeTruthy()
    expect(ep.stream.eeOpen.length).toBe(ep.stream.stamp.length)
    expect(ep).not.toHaveProperty('trajectory')
    expect(ep).not.toHaveProperty('telem')
    expect(ep).not.toHaveProperty('signal')
    expect(new Set(VLA_TASKS.map((t) => t.videoUrl)).size).toBeGreaterThanOrEqual(4)
  })

  it('pages vla tasks by scene', async () => {
    const { listVlaTasks } = await import('@/services/vla')
    const res = await listVlaTasks({ page: 1, pageSize: 10, scene: 'pack_station' })
    expect(res.items.every((t) => t.scene === 'pack_station')).toBe(true)
    expect((await listVlaTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
`)

fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/train.list.spec.js', `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('StarCompute train thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('uses repos/weights/evalSheet/errorGrid/trainLog', async () => {
    const { EXPERIMENTS } = await import('@/mock/train')
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(50)
    const e = EXPERIMENTS.find((x) => x.id === 'SC-EXP-2026-001')
    expect(e).toBeTruthy()
    expect(e.repos[0]).toEqual(
      expect.objectContaining({ partition: expect.any(String), pin: expect.any(String) }),
    )
    expect(e.weights.length).toBeGreaterThanOrEqual(1)
    expect(e.evalSheet.length).toBeGreaterThanOrEqual(3)
    expect(e.errorGrid.length).toBeGreaterThanOrEqual(3)
    expect(e.trainLog.length).toBeGreaterThanOrEqual(30)
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
`)

fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/prelabel.list.spec.js', `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('StarCompute prelabel thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('seeds SC-TXT/SC-IMG >=50 and keeps showcase Diff id', async () => {
    const { TEXT_DOCS, VISION_IMAGES } = await import('@/mock/prelabel')
    expect(TEXT_DOCS.length).toBeGreaterThanOrEqual(50)
    expect(VISION_IMAGES.length).toBeGreaterThanOrEqual(50)
    expect(TEXT_DOCS.every((d) => d.id.startsWith('SC-TXT-'))).toBe(true)
    expect(VISION_IMAGES.every((d) => d.id.startsWith('SC-IMG-'))).toBe(true)
    const showcase = TEXT_DOCS.find((d) => d.id === 'SC-TXT-2026-001')
    expect(showcase.model.entities.some((e) => e.id === 'te4' && e.type === 'ORG')).toBe(true)
  })

  it('pages text docs', async () => {
    const { listTextDocs } = await import('@/services/prelabel')
    const res = await listTextDocs({ page: 1, pageSize: 10 })
    expect(res.items.length).toBe(10)
    expect(res.total).toBeGreaterThanOrEqual(50)
  })
})
`)

// Fix existing specs
let vlaSpec = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/services/vla.spec.js', 'utf8')
vlaSpec = vlaSpec.replace("scene: 'lab_bench'", "scene: 'chem_hood'")
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/vla.spec.js', vlaSpec)

let preSpec = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/services/prelabel.spec.js', 'utf8')
preSpec = preSpec.replace(
  'const jobs = await listAcceptJobs()\n    const job = jobs.find',
  'const jobs = (await listAcceptJobs({ page: 1, pageSize: 200 })).items\n    const job = jobs.find',
)
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/services/prelabel.spec.js', preSpec)

console.log('specs written')
