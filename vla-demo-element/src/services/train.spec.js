import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { EXPERIMENTS, mockMetricPoint } from '@/mock/train'
import { useAuthStore } from '@/stores/auth'
import { metricsSeriesLength, mockMetricPoint as svcPoint } from '@/services/train'

describe('Train mock seeds', () => {
  it('seeds DL-EXP experiments with GPU card names', () => {
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(2)
    expect(EXPERIMENTS.every((e) => e.id.startsWith('DL-EXP-'))).toBe(true)
    expect(EXPERIMENTS.some((e) => e.id === 'DL-EXP-2026-001')).toBe(true)
    const finished = EXPERIMENTS.find((e) => e.status === 'finished')
    expect(finished.metrics.loss.length).toBe(finished.epochs)
    expect(finished.gpuIds.length).toBeGreaterThan(0)
  })

  it('mockMetricPoint keeps series within ranges', () => {
    const p = mockMetricPoint(5, 20)
    expect(p.loss).toBeGreaterThan(0)
    expect(p.acc).toBeGreaterThan(0)
    expect(p.map).toBeGreaterThan(0)
    expect(svcPoint(5, 20).loss).toBe(p.loss)
  })
})

describe('Train services', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('blocks annotator from createExperiment', async () => {
    const auth = useAuthStore()
    auth.setRole('annotator')
    const { createExperiment } = await import('@/services/train')
    await expect(
      createExperiment({
        name: 'x',
        algorithm: 'det_yolo',
        version: 'v8.2',
        model: 'yolov8n',
        batchSize: 8,
        learningRate: 0.001,
        epochs: 5,
        augment: false,
      }),
    ).rejects.toThrow(/管理员/)
  })

  it('admin create + tickEpoch grows metrics series equally', async () => {
    const auth = useAuthStore()
    auth.setRole('admin')
    const {
      createExperiment,
      allocateGpu,
      startTrain,
      tickEpoch,
      getMetrics,
    } = await import('@/services/train')
    const exp = await createExperiment({
      name: '单测实验',
      algorithm: 'det_yolo',
      version: 'v8.2',
      model: 'yolov8n',
      batchSize: 8,
      learningRate: 0.001,
      epochs: 5,
      augment: true,
      augmentOps: ['flip'],
    })
    expect(exp.id.startsWith('DL-EXP-')).toBe(true)
    await allocateGpu(exp.id, ['gpu-4'])
    await startTrain(exp.id)
    await tickEpoch(exp.id)
    await tickEpoch(exp.id)
    const m = await getMetrics(exp.id)
    const lens = metricsSeriesLength(m)
    expect(lens.loss).toBe(2)
    expect(lens.acc).toBe(2)
    expect(lens.map).toBe(2)
  })
})
