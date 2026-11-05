import { describe, it, expect, beforeEach, vi } from 'vitest'
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
