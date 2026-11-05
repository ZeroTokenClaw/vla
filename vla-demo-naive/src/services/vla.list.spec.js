import { describe, it, expect, beforeEach, vi } from 'vitest'
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
