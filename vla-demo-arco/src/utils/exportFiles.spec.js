import { describe, it, expect } from 'vitest'
import { toCSV } from './exportFiles'

describe('toCSV', () => {
  it('joins header and rows', () => {
    const csv = toCSV([
      { id: 'SC-1', status: 'done' },
      { id: 'SC-2', status: 'reject' },
    ])
    expect(csv.split('\n')[0]).toContain('id')
    expect(csv).toContain('SC-1')
  })
})
