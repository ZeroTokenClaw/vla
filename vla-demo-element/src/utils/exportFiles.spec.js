import { describe, it, expect } from 'vitest'
import { toCSV } from './exportFiles'

describe('toCSV', () => {
  it('joins header and rows', () => {
    const csv = toCSV([
      { id: 'DL-1', status: 'done' },
      { id: 'DL-2', status: 'reject' },
    ])
    expect(csv.split('\n')[0]).toContain('id')
    expect(csv).toContain('DL-1')
  })
})
