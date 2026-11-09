import { describe, it, expect } from 'vitest'
import { paginate } from './paginate'
import { createPrng } from './prng'

describe('createPrng', () => {
  it('is deterministic for the same seed', () => {
    const a = createPrng(0xD11A7E01)
    const b = createPrng(0xD11A7E01)
    expect([a.next(), a.next(), a.int(0, 10)]).toEqual([b.next(), b.next(), b.int(0, 10)])
  })
})

describe('paginate', () => {
  const rows = Array.from({ length: 55 }, (_, i) => ({ id: i + 1 }))

  it('returns page slice and total', () => {
    const r = paginate(rows, { page: 2, pageSize: 10 })
    expect(r.total).toBe(55)
    expect(r.page).toBe(2)
    expect(r.pageSize).toBe(10)
    expect(r.items.map((x) => x.id)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  })

  it('falls back to page 1 on illegal or out-of-range page', () => {
    expect(paginate(rows, { page: 0, pageSize: 10 }).page).toBe(1)
    expect(paginate(rows, { page: -3, pageSize: 10 }).page).toBe(1)
    expect(paginate(rows, { page: 'abc', pageSize: 10 }).page).toBe(1)
    expect(paginate(rows, { page: 99, pageSize: 10 }).page).toBe(1)
  })

  it('returns empty items with total 0 when rows empty', () => {
    const r = paginate([], { page: 3, pageSize: 10 })
    expect(r).toEqual({ items: [], total: 0, page: 1, pageSize: 10 })
  })
})