import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('Orion QC thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('uses severity P0-P2 and workspace, not priority/dept', async () => {
    const { createInitialTasks } = await import('@/mock/qc')
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(50)
    expect(tasks.every((t) => t.id.startsWith('ORN-'))).toBe(true)
    expect(tasks.every((t) => ['P0', 'P1', 'P2'].includes(t.severity))).toBe(true)
    expect(tasks.every((t) => typeof t.workspace === 'string')).toBe(true)
    expect(tasks.some((t) => 'priority' in t)).toBe(false)
    const { users } = await import('@/mock/users')
    expect(users.every((u) => typeof u.team === 'string')).toBe(true)
    expect(users.some((u) => 'dept' in u)).toBe(false)
  })

  it('pages with severity filter', async () => {
    const { listQcTasks } = await import('@/services/qc')
    const res = await listQcTasks({ page: 1, pageSize: 10, severity: 'P0' })
    expect(res.items.every((t) => t.severity === 'P0')).toBe(true)
    expect((await listQcTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
