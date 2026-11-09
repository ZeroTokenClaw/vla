import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('Orion prelabel thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('text and vision docs >=50 with ORN- prefixes', async () => {
    const { TEXT_DOCS, VISION_IMAGES } = await import('@/mock/prelabel')
    expect(TEXT_DOCS.length).toBeGreaterThanOrEqual(50)
    expect(VISION_IMAGES.length).toBeGreaterThanOrEqual(50)
    expect(TEXT_DOCS.every((d) => d.id.startsWith('ORN-TXT-'))).toBe(true)
    expect(VISION_IMAGES.every((d) => d.id.startsWith('ORN-IMG-'))).toBe(true)
    expect(TEXT_DOCS.some((d) => d.id === 'ORN-TXT-2026-001')).toBe(true)
    expect(VISION_IMAGES.some((d) => d.id === 'ORN-IMG-2026-001')).toBe(true)
  })

  it('pages text docs and falls back illegal page', async () => {
    const { listTextDocs } = await import('@/services/prelabel')
    const res = await listTextDocs({ page: 2, pageSize: 10 })
    expect(res.total).toBeGreaterThanOrEqual(50)
    expect(res.items).toHaveLength(10)
    expect(res.page).toBe(2)
    expect((await listTextDocs({ page: 99, pageSize: 10 })).page).toBe(1)
  })
})
