import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('Orion VLA thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('episodes use telem.qpos/grip/tsMs and Orion scenes', async () => {
    const { VLA_TASKS, SCENE_OPTIONS } = await import('@/mock/vla')
    expect(VLA_TASKS.length).toBeGreaterThanOrEqual(50)
    expect(SCENE_OPTIONS.map((s) => s.value)).toEqual([
      'aisle_pick',
      'cold_lab',
      'mezzanine',
      'lobby_desk',
    ])
    const ep = VLA_TASKS.find((t) => t.telem?.qpos?.length >= 5)
    expect(ep).toBeTruthy()
    expect(ep.telem.grip.length).toBe(ep.telem.tsMs.length)
    expect(new Set(VLA_TASKS.map((t) => t.videoUrl)).size).toBeGreaterThanOrEqual(4)
    expect(VLA_TASKS.some((t) => t.id === 'ORN-VLA-2026-001')).toBe(true)
    expect(VLA_TASKS.some((t) => 'trajectory' in t)).toBe(false)
  })

  it('pages vla tasks with scene filter', async () => {
    const { listVlaTasks } = await import('@/services/vla')
    const res = await listVlaTasks({ page: 1, pageSize: 10, scene: 'aisle_pick' })
    expect(res.items.every((t) => t.scene === 'aisle_pick')).toBe(true)
    expect((await listVlaTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
