import { describe, it, expect } from 'vitest'
import { toCSV } from './exportFiles'

describe('toCSV', () => {
  it('joins header and rows', () => {
    const csv = toCSV([
      { id: 'LM-1', status: 'done' },
      { id: 'LM-2', status: 'reject' },
    ])
    expect(csv.split('\n')[0]).toContain('id')
    expect(csv).toContain('LM-1')
  })
})
