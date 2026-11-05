import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('Orion train thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('uses catalog/ckptList/evalGrid/cmMatrix/runLog', async () => {
    const { EXPERIMENTS } = await import('@/mock/train')
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(50)
    const e = EXPERIMENTS.find((x) => x.id === 'ORN-EXP-2026-001')
    expect(e).toBeTruthy()
    expect(e.catalog[0]).toEqual(
      expect.objectContaining({ fold: expect.any(String), rev: expect.any(String) }),
    )
    expect(e.ckptList.length).toBeGreaterThanOrEqual(1)
    expect(e.evalGrid.length).toBeGreaterThanOrEqual(3)
    expect(e.cmMatrix.length).toBeGreaterThanOrEqual(3)
    expect(e.runLog.length).toBeGreaterThanOrEqual(30)
    expect(e).not.toHaveProperty('datasets')
    expect(e).not.toHaveProperty('logs')
  })

  it('pages experiments with status filter', async () => {
    const { listExperiments } = await import('@/services/train')
    const res = await listExperiments({ page: 1, pageSize: 10, status: 'finished' })
    expect(res.items.every((e) => e.status === 'finished')).toBe(true)
    expect((await listExperiments({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
