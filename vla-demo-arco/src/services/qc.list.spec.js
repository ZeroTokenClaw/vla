import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('StarCompute QC thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('uses slaClass/tenantCode/pool and SC- ids', async () => {
    const { createInitialTasks } = await import('@/mock/qc')
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(50)
    expect(tasks.every((t) => t.id.startsWith('SC-'))).toBe(true)
    expect(tasks.every((t) => ['S', 'A', 'B'].includes(t.slaClass))).toBe(true)
    expect(tasks.every((t) => String(t.tenantCode).startsWith('tn-sc-'))).toBe(true)
    expect(tasks.some((t) => 'severity' in t || 'priority' in t || 'urgency' in t)).toBe(false)
    const showcase = tasks.find((t) => t.id === 'SC-2026-1104-0312')
    expect(showcase).toBeTruthy()
    const { users } = await import('@/mock/users')
    expect(users.every((u) => typeof u.pool === 'string')).toBe(true)
    expect(users.some((u) => 'dept' in u)).toBe(false)
  })

  it('pages with slaClass filter and falls back illegal page', async () => {
    const { listQcTasks } = await import('@/services/qc')
    const res = await listQcTasks({ page: 1, pageSize: 10, slaClass: 'S' })
    expect(res.items.every((t) => t.slaClass === 'S')).toBe(true)
    expect(res.total).toBeGreaterThanOrEqual(1)
    expect((await listQcTasks({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
