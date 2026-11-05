import { describe, it, expect, beforeEach, vi } from 'vitest'
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
