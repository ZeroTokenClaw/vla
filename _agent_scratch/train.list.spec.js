import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { EXPERIMENTS } from '@/mock/train'

describe('Element train thick experiments', () => {
  it('seeds 50+ DL-EXP with datasets/checkpoints/valTable/confusionMatrix', () => {
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(50)
    const fin = EXPERIMENTS.find((e) => e.id === 'DL-EXP-2026-001')
    expect(fin).toBeTruthy()
    expect(fin.datasets.length).toBeGreaterThanOrEqual(2)
    expect(fin.datasets[0]).toEqual(
      expect.objectContaining({
        split: expect.any(String),
        versionPin: expect.any(String),
      }),
    )
    expect(fin.checkpoints.length).toBeGreaterThanOrEqual(1)
    expect(fin.valTable.length).toBeGreaterThanOrEqual(3)
    expect(fin.confusionMatrix.length).toBeGreaterThanOrEqual(3)
    expect(fin.logs.length).toBeGreaterThanOrEqual(30)
  })
})

describe('Element train list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('pages experiments and filters status', async () => {
    const { listExperiments, getExperiment } = await import('@/services/train')
    const res = await listExperiments({ page: 1, pageSize: 10, status: 'finished' })
    expect(res.total).toBeGreaterThanOrEqual(1)
    expect(res.items).toBeDefined()
    expect(res.items.every((e) => e.status === 'finished')).toBe(true)
    expect(res.items.length).toBeLessThanOrEqual(10)
    const bad = await listExperiments({ page: -1, pageSize: 10 })
    expect(bad.page).toBe(1)
    const one = await getExperiment('DL-EXP-2026-001')
    expect(one.datasets.length).toBeGreaterThanOrEqual(2)
    expect(one.checkpoints.length).toBeGreaterThanOrEqual(1)
    expect(one.valTable.length).toBeGreaterThanOrEqual(3)
    expect(one.confusionMatrix.length).toBeGreaterThanOrEqual(3)
  })
})
