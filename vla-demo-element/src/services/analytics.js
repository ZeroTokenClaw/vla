import dayjs from 'dayjs'
import { businessDelay } from './delay'
import { listQcTasks, listMeta as qcMeta, getQualityDashboard, MODALITIES } from './qc'
import { listVlaTasks, getCollectStats } from './vla'
import { listExperiments, listMeta as trainMeta } from './train'
import { listTextDocs, listVisionImages, listPrelabelJobs } from './prelabel'

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

/** 工作台驾驶舱聚合（演示伪造汇总） */
export async function getDashboardStats() {
  await businessDelay()
  const [qc, vla, train, texts, visions, jobs, quality, collect] = await Promise.all([
    listQcTasks({ page: 1, pageSize: 500 }),
    listVlaTasks({ page: 1, pageSize: 500 }),
    listExperiments({ page: 1, pageSize: 200 }),
    listTextDocs({ page: 1, pageSize: 200 }),
    listVisionImages({ page: 1, pageSize: 200 }),
    listPrelabelJobs({ page: 1, pageSize: 100 }),
    getQualityDashboard(),
    getCollectStats(),
  ])

  const qcItems = qc.items || []
  const passed = qcItems.filter((t) => t.status === 'done').length
  const pendingReview = qcItems.filter((t) => ['reviewing', 'final_review'].includes(t.status)).length
  const rejected = qcItems.filter((t) => t.status === 'rejected').length
  const trainItems = train.items || []
  const training = trainItems.filter((e) => ['running', 'paused'].includes(e.status)).length
  const gpus = trainMeta().gpus || []
  const gpuBusy = gpus.filter((g) => !g.free).length
  const preJobs = jobs.items || []
  const preRunning = preJobs.filter((j) => j.status === 'running').length

  const todos = [
    ...qcItems
      .filter((t) => ['assigned', 'annotating', 'rejected', 'reviewing'].includes(t.status))
      .slice(0, 4)
      .map((t) => ({
        id: t.id,
        title: t.title,
        module: '质控中心',
        path: `/qc/annotate/${t.id}`,
        priority: t.priority === 'high' ? '高' : t.priority === 'low' ? '低' : '中',
        status: t.status,
      })),
    ...preJobs
      .filter((j) => j.status === 'failed' || j.status === 'running')
      .slice(0, 2)
      .map((j) => ({
        id: j.id,
        title: j.title,
        module: '智能预标',
        path: '/prelabel/jobs',
        priority: j.status === 'failed' ? '高' : '中',
        status: j.status,
      })),
  ]

  return {
    generatedAt: now(),
    sourceMode: 'demo',
    kpis: [
      { key: 'qc', label: '质控工单', value: qcItems.length },
      {
        key: 'passRate',
        label: '抽检合格率',
        value: Math.round((quality.totals?.passRate || 0) * 100),
        unit: '%',
      },
      { key: 'pendingReview', label: '待审工单', value: pendingReview },
      { key: 'rejected', label: '驳回返修', value: rejected },
      { key: 'prelabel', label: '预标样例', value: (texts.total || 0) + (visions.total || 0) },
      { key: 'preJobs', label: '预标任务运行中', value: preRunning },
      { key: 'vla', label: 'VLA 采集任务', value: vla.total || collect.taskTotal || 0 },
      { key: 'collectPct', label: '采集进度', value: collect.progressPct || 0, unit: '%' },
      { key: 'training', label: '训练中实验', value: training },
      { key: 'gpu', label: 'GPU 占用', value: gpuBusy, unit: `/${gpus.length}` },
      { key: 'done', label: '已完成工单', value: passed },
    ],
    todos,
    modalityMeta: MODALITIES,
    qcMeta: qcMeta(),
  }
}
