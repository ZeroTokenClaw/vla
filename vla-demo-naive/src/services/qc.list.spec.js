import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('LingMou QC thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('uses urgency/lane/squad and LM- ids', async () => {
    const { createInitialTasks } = await import('@/mock/qc')
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(50)
    expect(tasks.every((t) => t.id.startsWith('LM-'))).toBe(true)
    expect(tasks.every((t) => ['urgent', 'normal', 'backlog'].includes(t.urgency))).toBe(true)
    expect(tasks.every((t) => String(t.lane).startsWith('lane-'))).toBe(true)
    expect(tasks.some((t) => 'severity' in t || 'priority' in t)).toBe(false)
    const showcase = tasks.find((t) => t.id === 'LM-2026-1104-0312')
    expect(showcase).toBeTruthy()
    const { users } = await import('@/mock/users')
    expect(users.every((u) => typeof u.squad === 'string')).toBe(true)
    expect(users.some((u) => 'dept' in u)).toBe(false)
  })

  it('pages with urgency filter and falls back illegal page', async () => {
    const { listQcTasks } = await import('@/services/qc')
    const res = await listQcTasks({ page: 1, pageSize: 10, urgency: 'urgent' })
    expect(res.items.every((t) => t.urgency === 'urgent')).toBe(true)
    expect(res.total).toBeGreaterThanOrEqual(1)
    expect((await listQcTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
