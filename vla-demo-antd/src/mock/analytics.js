import { createPrng } from './seed/prng'

const rng = createPrng(9051)

export const QUALITY_SCORES = Array.from({ length: 36 }).map((_, i) => {
  const total = Number((62 + rng.next() * 36).toFixed(1))
  const grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'E'
  const dims = {
    completeness: Number((0.7 + rng.next() * 0.28).toFixed(2)),
    consistency: Number((0.65 + rng.next() * 0.3).toFixed(2)),
    clarity: Number((0.6 + rng.next() * 0.35).toFixed(2)),
    alignment: Number((0.68 + rng.next() * 0.3).toFixed(2)),
    coverage: Number((0.72 + rng.next() * 0.25).toFixed(2)),
  }
  const issuePool = [
    { code: 'keynode_miss', msg: '关键节点缺失' },
    { code: 'blur', msg: '清晰度低于阈值' },
    { code: 'instruction_mismatch', msg: '指令与动作不对齐' },
    { code: 'gap', msg: '段间空隙 >5 帧' },
    { code: 'occlusion', msg: '目标遮挡' },
    { code: 'taxonomy_drift', msg: '标签体系漂移' },
  ]
  const nIssues = rng.int(0, 5)
  const issueDetails = Array.from({ length: nIssues }).map((_, j) => {
    const p = issuePool[(i + j) % issuePool.length]
    return {
      id: `QI-${i + 1}-${j + 1}`,
      code: p.code,
      message: p.msg,
      severity: ['low', 'medium', 'high'][(i + j) % 3],
      frame: 12 + (i + j) * 7,
    }
  })
  return {
    id: `QS-${String(i + 1).padStart(3, '0')}`,
    targetType: i % 3 === 0 ? 'vla_task' : 'annotation_task',
    targetId: i % 3 === 0 ? `ORN-VLA-2026-${String((i % 8) + 1).padStart(3, '0')}` : `ORN-2026-1104-${1000 + i}`,
    name: i % 3 === 0 ? `VLA 批次样本质检 #${i + 1}` : `多模态标注质检 #${i + 1}`,
    totalScore: total,
    grade,
    dimensions: dims,
    issues: nIssues,
    issueDetails,
    reviewer: ['林晓萱', '周明轩', '陈思远'][i % 3],
    rulePack: i % 2 ? 'vla_gate_v2' : 'mm_qc_v1',
    trend: Array.from({ length: 7 }).map((_, d) => Number((total - 6 + d * 1.1 + rng.next() * 2).toFixed(1))),
    updatedAt: `2026-11-0${(i % 8) + 1} ${10 + (i % 9)}:${rng.int(10, 59)}:00`,
  }
})

export const PROFILE_STATS = {
  sourceMode: 'demo',
  summary: {
    totalSamples: 18420,
    modalities: 6,
    avgDurationSec: 14.6,
    labelDensity: 6.4,
    openAnomalies: 37,
    peakHour: 14,
    peakIngest: 312,
  },
  missingRate: 0.042,
  modalityShare: [
    { name: '图像', value: 38 },
    { name: '视频/VLA', value: 27 },
    { name: '文本', value: 18 },
    { name: '语音', value: 9 },
    { name: '点云', value: 8 },
  ],
  modalityDistribution: [
    { name: '图像', count: 7020 },
    { name: '视频/VLA', count: 4980 },
    { name: '文本', count: 3310 },
    { name: '语音', count: 1660 },
    { name: '点云', count: 1450 },
  ],
  dailyIngest: [
    { day: '11-03', count: 820, annotate: 610, anomaly: 18 },
    { day: '11-04', count: 1040, annotate: 780, anomaly: 22 },
    { day: '11-05', count: 960, annotate: 720, anomaly: 19 },
    { day: '11-06', count: 1320, annotate: 990, anomaly: 31 },
    { day: '11-07', count: 1180, annotate: 860, anomaly: 27 },
    { day: '11-08', count: 1450, annotate: 1120, anomaly: 35 },
    { day: '11-09', count: 980, annotate: 740, anomaly: 21 },
  ],
  hourly: Array.from({ length: 24 }).map((_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    ingest: Math.round(40 + Math.sin(h / 3.2) * 28 + (h >= 9 && h <= 18 ? 80 : 10) + rng.next() * 20),
    annotate: Math.round(30 + Math.sin(h / 2.8) * 20 + (h >= 10 && h <= 19 ? 55 : 8) + rng.next() * 15),
    anomaly: Math.round(2 + (h >= 13 && h <= 16 ? 8 : 2) + rng.next() * 3),
  })),
  durationHist: [
    { bucket: '0-5s', count: 1280 },
    { bucket: '5-10s', count: 3460 },
    { bucket: '10-15s', count: 5120 },
    { bucket: '15-20s', count: 4210 },
    { bucket: '20-30s', count: 2860 },
    { bucket: '30s+', count: 1490 },
  ],
  sceneDistribution: [
    { scene: '仓拣工位', count: 4120 },
    { scene: '桌面装配', count: 3380 },
    { scene: '传送带分拣', count: 2910 },
    { scene: '实验室台面', count: 2240 },
    { scene: '户外巡检', count: 1680 },
    { scene: '其他', count: 4090 },
  ],
  labelDensity: [
    { modality: '文本 NER', avgLabels: 6.2, coverage: 0.91 },
    { modality: '图像分割', avgLabels: 4.1, coverage: 0.86 },
    { modality: '语音切片', avgLabels: 5.4, coverage: 0.88 },
    { modality: '视频检测', avgLabels: 8.7, coverage: 0.79 },
    { modality: '点云分割', avgLabels: 3.3, coverage: 0.74 },
    { modality: 'VLA 动作', avgLabels: 7.8, coverage: 0.83 },
  ],
  topTags: [
    { tag: 'REACH', count: 312 },
    { tag: 'GRASP', count: 298 },
    { tag: 'box_A', count: 186 },
    { tag: 'PERSON', count: 142 },
    { tag: 'ORDER_ID', count: 121 },
    { tag: 'PLACE', count: 118 },
    { tag: 'conveyor', count: 96 },
    { tag: 'ADDRESS', count: 88 },
  ],
  topIssues: [
    { type: 'blur', count: 86 },
    { type: 'occlusion', count: 64 },
    { type: 'gap', count: 51 },
    { type: 'mismatch', count: 43 },
    { type: 'missing', count: 37 },
    { type: 'jitter', count: 29 },
  ],
  sensorMix: [
    { sensor: 'wrist_rgb', share: 0.28 },
    { sensor: 'overhead_rgb', share: 0.22 },
    { sensor: 'side_depth', share: 0.18 },
    { sensor: 'joint_state', share: 0.16 },
    { sensor: 'mic', share: 0.09 },
    { sensor: 'imu', share: 0.07 },
  ],
}

export const ANOMALIES = Array.from({ length: 24 }).map((_, i) => ({
  id: `ANM-${String(i + 1).padStart(3, '0')}`,
  type: ['blur', 'jitter', 'missing', 'mismatch', 'occlusion'][i % 5],
  severity: ['low', 'medium', 'high'][i % 3],
  source: i % 2 ? 'vla_quality' : 'sample_check',
  targetId: i % 2 ? `ORN-VLA-2026-00${(i % 5) + 1}` : `ORN-2026-1104-${1100 + i}`,
  message: ['清晰度低于阈值', '帧间抖动超标', '关键节点缺失', '指令与动作不匹配', '目标遮挡'][i % 5],
  status: ['open', 'reviewing', 'resolved', 'ignored'][i % 4],
  assignee: ['林晓萱', '周明轩', '陈思远', '赵雨桐'][i % 4],
  evidence: [`rule=${['blur', 'jitter', 'missing', 'mismatch', 'occlusion'][i % 5]}`, `score=${(0.3 + rng.next() * 0.5).toFixed(2)}`, `frame=${20 + i * 5}`],
  createdAt: `2026-11-0${(i % 8) + 1} 15:${rng.int(10, 50)}:00`,
}))
