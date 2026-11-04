import { describe, it, expect } from 'vitest'
import { toCSV } from './exportFiles'

describe('toCSV', () => {
  it('joins header and rows', () => {
    const csv = toCSV([
      { id: 'ORN-1', status: 'done' },
      { id: 'ORN-2', status: 'reject' },
    ])
    expect(csv.split('\n')[0]).toContain('id')
    expect(csv).toContain('ORN-1')
  })
})
