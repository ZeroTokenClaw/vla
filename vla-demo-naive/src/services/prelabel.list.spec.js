import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('LingMou prelabel thick list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('seeds LM-TXT/LM-IMG >=50 and keeps showcase Diff id', async () => {
    const { TEXT_DOCS, VISION_IMAGES } = await import('@/mock/prelabel')
    expect(TEXT_DOCS.length).toBeGreaterThanOrEqual(50)
    expect(VISION_IMAGES.length).toBeGreaterThanOrEqual(50)
    expect(TEXT_DOCS.every((d) => d.id.startsWith('LM-TXT-'))).toBe(true)
    expect(VISION_IMAGES.every((d) => d.id.startsWith('LM-IMG-'))).toBe(true)
    const showcase = TEXT_DOCS.find((d) => d.id === 'LM-TXT-2026-001')
    expect(showcase.model.entities.some((e) => e.id === 'te4' && e.type === 'ORG')).toBe(true)
  })

  it('pages text docs', async () => {
    const { listTextDocs } = await import('@/services/prelabel')
    const res = await listTextDocs({ page: 1, pageSize: 10 })
    expect(res.items.length).toBe(10)
    expect(res.total).toBeGreaterThanOrEqual(50)
  })
})
