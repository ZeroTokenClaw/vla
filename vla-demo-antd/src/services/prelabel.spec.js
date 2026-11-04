import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TEXT_DOCS, VISION_IMAGES, ACCEPT_STEPS, createAcceptJobs } from '@/mock/prelabel'
import { useAuthStore } from '@/stores/auth'

describe('Prelabel mock seeds', () => {
  it('seeds ORN- text/vision samples with intentional model errors', () => {
    expect(TEXT_DOCS.length).toBeGreaterThanOrEqual(2)
    expect(TEXT_DOCS.every((d) => d.id.startsWith('ORN-TXT-'))).toBe(true)
    // intentional wrong entity type ORG instead of ADDRESS
    const bad = TEXT_DOCS[0].model.entities.find((e) => e.id === 'te4')
    expect(bad?.type).toBe('ORG')
    expect(VISION_IMAGES.every((v) => v.id.startsWith('ORN-IMG-'))).toBe(true)
    expect(VISION_IMAGES[0].yoloModel.some((b) => b.label === 'tool')).toBe(true)
  })

  it('defines accept wizard four steps', () => {
    expect(ACCEPT_STEPS.map((s) => s.key)).toEqual(['confirm', 'annotate', 'qa', 'accept'])
    const jobs = createAcceptJobs()
    expect(jobs.every((j) => j.id.startsWith('ORN-ACC-'))).toBe(true)
  })
})

describe('Prelabel services', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('runTextPipeline returns classify/entities/relations/structured', async () => {
    const { runTextPipeline } = await import('@/services/prelabel')
    const res = await runTextPipeline('ORN-TXT-2026-001')
    expect(res.classify.label).toBeTruthy()
    expect(res.entities.length).toBeGreaterThan(0)
    expect(res.relations.length).toBeGreaterThan(0)
    expect(res.structured.orderId).toBe('ORN-ORD-9902')
  })

  it('blocks annotator from final accept', async () => {
    const auth = useAuthStore()
    auth.setRole('annotator')
    const { advanceAcceptStep, listAcceptJobs } = await import('@/services/prelabel')
    // find a job already at accept if any; otherwise walk a fresh one is heavy —
    // create path: use job at confirm and force by advancing is slow; instead
    // call advance when step is accept by mutating via repeated advances from ACC-003 mid-step
    const jobs = await listAcceptJobs()
    const job = jobs.find((j) => j.id === 'ORN-ACC-2026-003')
    expect(job).toBeTruthy()
    // annotate -> qa
    await advanceAcceptStep(job.id)
    // qa -> accept
    await advanceAcceptStep(job.id, { qaNote: '抽检通过' })
    await expect(advanceAcceptStep(job.id)).rejects.toThrow(/审核员|管理员/)
  })
})
