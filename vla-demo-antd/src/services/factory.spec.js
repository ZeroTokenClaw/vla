import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  listProductionTasks,
  createProductionTask,
  runProductionTask,
  tickProductionTask,
  getExecution,
  listWorkflows,
  getDashboard,
} from './factory'

describe('factory services (fake data)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lists production tasks with pagination', async () => {
    const res = await listProductionTasks({ page: 1, pageSize: 10 })
    expect(res.total).toBeGreaterThanOrEqual(20)
    expect(res.items.length).toBe(10)
  })

  it('creates and runs a production task with node execution logs', async () => {
    const wfs = await listWorkflows({ page: 1, pageSize: 10 })
    const published = wfs.items.find((w) => w.status === 'published')
    expect(published).toBeTruthy()

    const task = await createProductionTask({
      name: '单测生产任务',
      workflowId: published.id,
      datasetId: 'DS-ADF-VLA-01',
      type: 'vla_pipeline',
    })
    expect(task.id).toMatch(/^ADF-PROD-/)

    const running = await runProductionTask(task.id)
    expect(running.status).toBe('running')

    const exe = await getExecution(task.id)
    expect(exe.nodes.length).toBeGreaterThan(3)
    expect(exe.nodes.some((n) => n.logs?.length)).toBe(true)

    const stepped = await tickProductionTask(task.id)
    expect(stepped.progress).toBeGreaterThan(0)
  })

  it('dashboard returns KPI counts', async () => {
    const dash = await getDashboard()
    expect(dash.counts.total).toBeGreaterThan(0)
    expect(dash.series.dailyThroughput.length).toBe(7)
  })
})
