import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TEXT_DOCS, VISION_IMAGES } from '@/mock/prelabel'

describe('Element prelabel thick seeds', () => {
  it('keeps intentional Diff and grows to 50+', () => {
    expect(TEXT_DOCS.length).toBeGreaterThanOrEqual(50)
    expect(VISION_IMAGES.length).toBeGreaterThanOrEqual(50)
    const bad = TEXT_DOCS.find((d) => d.id === 'DL-TXT-2026-001')
    expect(bad.model.entities.find((e) => e.id === 'te4')?.type).toBe('ORG')
    expect(TEXT_DOCS.every((d) => typeof d.progressPct === 'number')).toBe(true)
    expect(TEXT_DOCS.every((d) => 'spotCheckPass' in d)).toBe(true)
  })
})

describe('Element prelabel list paging', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })
  it('pages text docs and supports empty filter', async () => {
    const { listTextDocs } = await import('@/services/prelabel')
    const res = await listTextDocs({ page: 1, pageSize: 10 })
    expect(res.items).toHaveLength(10)
    expect(res.total).toBeGreaterThanOrEqual(50)
    const empty = await listTextDocs({ page: 1, pageSize: 10, keyword: '___none___' })
    expect(empty.total).toBe(0)
  })
})