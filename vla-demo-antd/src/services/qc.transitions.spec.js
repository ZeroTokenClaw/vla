import { describe, it, expect } from 'vitest'
import { TRANSITIONS, createInitialTasks, MODALITIES } from '@/mock/qc'

describe('QC state machine', () => {
  it('defines full review loop including reject rework', () => {
    expect(TRANSITIONS.created).toContain('assigned')
    expect(TRANSITIONS.assigned).toContain('annotating')
    expect(TRANSITIONS.annotating).toContain('reviewing')
    expect(TRANSITIONS.reviewing).toEqual(expect.arrayContaining(['final_review', 'rejected']))
    expect(TRANSITIONS.final_review).toEqual(expect.arrayContaining(['done', 'rejected']))
    expect(TRANSITIONS.rejected).toContain('annotating')
  })

  it('seeds at least five ORN-2026 tasks across five modalities', () => {
    const tasks = createInitialTasks()
    expect(tasks.length).toBeGreaterThanOrEqual(5)
    expect(tasks.every((t) => t.id.startsWith('ORN-JOB-2026-'))).toBe(true)
    const mods = new Set(tasks.map((t) => t.modality))
    for (const m of MODALITIES) {
      expect(mods.has(m.value)).toBe(true)
    }
  })
})
