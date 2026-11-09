import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VLA_TASKS } from '@/mock/vla'

describe('Element VLA thick episodes', () => {
  it('has 50+ DL-VLA episodes with trajectory JSON and diversified media', () => {
    expect(VLA_TASKS.length).toBeGreaterThanOrEqual(50)
    expect(VLA_TASKS.every((t) => t.id.startsWith('DL-VLA-'))).toBe(true)
    const withTraj = VLA_TASKS.filter((t) => t.trajectory?.joints?.length >= 5)
    expect(withTraj.length).toBeGreaterThanOrEqual(40)
    const videos = new Set(VLA_TASKS.map((t) => t.videoUrl))
    expect(videos.size).toBeGreaterThanOrEqual(4)
    expect(VLA_TASKS.some((t) => t.id === 'DL-VLA-2026-001')).toBe(true)
  })
})

describe('Element VLA list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('pages and filters by scene', async () => {
    const { listVlaTasks, getVlaTask } = await import('@/services/vla')
    const res = await listVlaTasks({ page: 1, pageSize: 10 })
    expect(res.total).toBeGreaterThanOrEqual(50)
    expect(res.items).toHaveLength(10)
    const filtered = await listVlaTasks({ page: 1, pageSize: 50, scene: 'warehouse_bin' })
    expect(filtered.total).toBeGreaterThanOrEqual(1)
    expect(filtered.items.every((t) => t.scene === 'warehouse_bin')).toBe(true)
    const one = await getVlaTask('DL-VLA-2026-001')
    expect(one.trajectory.joints[0].length).toBeGreaterThanOrEqual(6)
    expect(one.trajectory.gripper.length).toBe(one.trajectory.tSec.length)
    expect(one.trajectory).toEqual(
      expect.objectContaining({
        joints: expect.any(Array),
        gripper: expect.any(Array),
        tSec: expect.any(Array),
      }),
    )
  })
})
