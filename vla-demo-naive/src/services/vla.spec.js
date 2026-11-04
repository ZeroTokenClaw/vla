import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VLA_TASKS, ISSUE_TYPES } from '@/mock/vla'
import { buildVlaExportFilename } from '@/services/vla'

describe('VLA mock seeds', () => {
  it('seeds LM-VLA tasks with actions and five issue types', () => {
    expect(VLA_TASKS.length).toBeGreaterThanOrEqual(2)
    expect(VLA_TASKS.every((t) => t.id.startsWith('LM-VLA-'))).toBe(true)
    expect(VLA_TASKS[0].actions.length).toBeGreaterThan(0)
    expect(ISSUE_TYPES.map((i) => i.key)).toEqual([
      'jitter',
      'occlusion',
      'blur',
      'missing',
      'mismatch',
    ])
    const types = new Set(VLA_TASKS[0].issuesSeed.map((i) => i.type))
    for (const k of ['jitter', 'occlusion', 'blur', 'missing', 'mismatch']) {
      expect(types.has(k)).toBe(true)
    }
  })
})

describe('VLA export filename', () => {
  it('builds LM-VLA-{taskId}-{timestamp}.{ext} without double prefix', () => {
    expect(buildVlaExportFilename('LM-VLA-2026-001', 'json', '20261104120000')).toBe(
      'LM-VLA-2026-001-20261104120000.json',
    )
    expect(buildVlaExportFilename('LM-VLA-2026-001', 'csv', '20261104120000')).toBe(
      'LM-VLA-2026-001-20261104120000.csv',
    )
    expect(buildVlaExportFilename('LM-VLA-2026-001', 'excel', '20261104120000')).toBe(
      'LM-VLA-2026-001-20261104120000.xlsx',
    )
    expect(buildVlaExportFilename('009', 'json', '20261104120000')).toBe(
      'LM-VLA-009-20261104120000.json',
    )
  })
})

describe('VLA services', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetModules()
  })

  it('createCollectTask generates LM-VLA id and required fields', async () => {
    const { createCollectTask } = await import('@/services/vla')
    const task = await createCollectTask({
      name: '单元测试采集',
      scene: 'lab_bench',
      plan: 'wipe_surface',
      mode: 'scripted',
      actionTemplateIds: ['tpl-reach', 'tpl-wipe'],
      personnelIds: ['u-lm-annotator'],
      instruction: '测试指令',
    })
    expect(task.id.startsWith('LM-VLA-2026-')).toBe(true)
    expect(task.name).toBe('单元测试采集')
    expect(task.actionTemplateIds).toContain('tpl-wipe')
  })

  it('detectIssues returns five issue categories', async () => {
    const { detectIssues } = await import('@/services/vla')
    const { issues, summary } = await detectIssues('LM-VLA-2026-001')
    expect(issues.length).toBeGreaterThanOrEqual(5)
    expect(summary.jitter).toBeGreaterThan(0)
    expect(summary.occlusion).toBeGreaterThan(0)
    expect(summary.blur).toBeGreaterThan(0)
    expect(summary.missing).toBeGreaterThan(0)
    expect(summary.mismatch).toBeGreaterThan(0)
  })

  it('saveActionSpan appends ordered span', async () => {
    const { saveActionSpan, getVlaTask } = await import('@/services/vla')
    await saveActionSpan({
      taskId: 'LM-VLA-2026-003',
      startFrame: 10,
      endFrame: 25,
      action: 'WIPE',
      instruction: '第一遍擦拭',
      keyNode: true,
    })
    const t = await getVlaTask('LM-VLA-2026-003')
    expect(t.actions.some((a) => a.action === 'WIPE' && a.startFrame === 10)).toBe(true)
  })
})
