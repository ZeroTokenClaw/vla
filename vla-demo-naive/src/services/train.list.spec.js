import { describe, it, expect, beforeEach, vi } from 'vitest'
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
