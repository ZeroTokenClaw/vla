import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('Element QC thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('seeds at least 50 QC tasks with DL- prefix and priority field', async () => {
    const { createInitialTasks } = await import('@/mock/qc')
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(50)
    expect(tasks.every((t) => String(t.id).startsWith('DL-'))).toBe(true)
    expect(tasks.every((t) => ['high', 'medium', 'low'].includes(t.priority))).toBe(true)
    expect(tasks.every((t) => typeof t.buCode === 'string')).toBe(true)
    // preserve showcase reject chain
    expect(tasks.some((t) => t.id === 'DL-2026-1102-0251' && t.status === 'rejected')).toBe(true)
  })

  it('listQcTasks pages and filters by status/modality/priority', async () => {
    const { listQcTasks } = await import('@/services/qc')
    const page1 = await listQcTasks({ page: 1, pageSize: 10 })
    expect(page1.items).toHaveLength(10)
    expect(page1.total).toBeGreaterThanOrEqual(50)
    expect(page1.page).toBe(1)

    const filtered = await listQcTasks({ page: 1, pageSize: 50, status: 'rejected' })
    expect(filtered.items.every((t) => t.status === 'rejected')).toBe(true)
    expect(filtered.total).toBe(filtered.items.length)

    const empty = await listQcTasks({ page: 1, pageSize: 10, keyword: '___no_such___' })
    expect(empty.total).toBe(0)
    expect(empty.items).toEqual([])

    const bad = await listQcTasks({ page: 999, pageSize: 10 })
    expect(bad.page).toBe(1)
  })
})
