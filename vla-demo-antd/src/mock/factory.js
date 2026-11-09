import { createPrng } from './seed/prng'

/** AI Data Factory — production tasks, workflow templates, executions (fake but realistic). */

export const NODE_CATALOG = [
  { type: 'import', label: '数据导入', group: '接入', color: '#1677ff' },
  { type: 'parse', label: '文件解析', group: '接入', color: '#1677ff' },
  { type: 'frame_extract', label: '视频帧提取', group: '接入', color: '#1677ff' },
  { type: 'ocr', label: 'OCR识别', group: '算法', color: '#722ed1' },
  { type: 'yolo', label: 'YOLO检测', group: '算法', color: '#722ed1' },
  { type: 'nlp_ner', label: 'NLP实体识别', group: '算法', color: '#722ed1' },
  { type: 'nlp_rel', label: '文本关系抽取', group: '算法', color: '#722ed1' },
  { type: 'seg', label: '图像语义分割', group: '算法', color: '#722ed1' },
  { type: 'audio_slice', label: '语音切片', group: '算法', color: '#722ed1' },
  { type: 'point_seg', label: '点云分割', group: '算法', color: '#722ed1' },
  { type: 'human_annotate', label: '人工标注', group: '人工', color: '#fa8c16' },
  { type: 'quality_check', label: '质量检测', group: '质控', color: '#eb2f96' },
  { type: 'human_review', label: '人工审核', group: '人工', color: '#fa8c16' },
  { type: 'vla_struct', label: 'VLA数据结构化', group: '产出', color: '#13c2c2' },
  { type: 'export', label: '数据导出', group: '产出', color: '#13c2c2' },
  { type: 'train', label: '算法训练', group: '产出', color: '#52c41a' },
]

export const TASK_TYPES = [
  { value: 'multimodal_label', label: '多模态标注生产' },
  { value: 'prelabel_accel', label: '预标注加速' },
  { value: 'vla_pipeline', label: 'VLA 具身数据生产' },
  { value: 'train_loop', label: '训练闭环' },
]

export const DATA_SOURCES = [
  { value: 'object_store', label: '对象存储导入' },
  { value: 'upload', label: '本地上传' },
  { value: 'dataset_reflux', label: '数据集回流' },
  { value: 'robot_capture', label: '机器人采集回传' },
]

export const DATA_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'image', label: '图像' },
  { value: 'audio', label: '语音' },
  { value: 'video', label: '视频' },
  { value: 'pointcloud', label: '点云' },
  { value: 'vla_mixed', label: 'VLA 多模态' },
]

export const DATASETS = [
  { id: 'DS-ADF-QC-01', name: 'QC-Multimodal-v3', modality: 'mixed', samples: 12840 },
  { id: 'DS-ADF-PRE-02', name: 'Prelabel-Vision-v2', modality: 'image', samples: 5620 },
  { id: 'DS-ADF-VLA-01', name: 'VLA-PickPlace-v1', modality: 'vla_mixed', samples: 918 },
  { id: 'DS-ADF-TRAIN-01', name: 'Train-Ready-Det-v5', modality: 'image', samples: 22014 },
]

function nodeMeta(type) {
  return NODE_CATALOG.find((n) => n.type === type) || { type, label: type, color: '#94a3b8' }
}

function makeNodes(types) {
  return types.map((type, i) => ({
    key: `n${i + 1}`,
    type,
    label: nodeMeta(type).label,
    params: defaultParams(type),
    retry: { maxRetries: 2, backoffSec: 5 },
    x: 40 + (i % 4) * 200,
    y: 40 + Math.floor(i / 4) * 120,
  }))
}

function makeEdges(count) {
  const edges = []
  for (let i = 0; i < count - 1; i += 1) {
    edges.push({ from: `n${i + 1}`, to: `n${i + 2}`, when: 'always' })
  }
  return edges
}

function defaultParams(type) {
  const map = {
    import: { source: 'object_store', path: 's3://adf-demo/raw/2026-11/' },
    parse: { extractMeta: true },
    frame_extract: { fps: 5, maxFrames: 120 },
    ocr: { modelVersion: 'paddleocr-v4.0-demo', conf: 0.6 },
    yolo: { modelVersion: 'yolov8n-orn-demo', conf: 0.35, imgsz: 640 },
    nlp_ner: { modelVersion: 'bert-ner-zh-demo', conf: 0.5 },
    nlp_rel: { modelVersion: 'rel-extract-demo' },
    seg: { modelVersion: 'segformer-lite-demo' },
    audio_slice: { vad: 'silero-demo', minSec: 0.4 },
    point_seg: { format: 'pcd', gridSize: 0.05 },
    human_annotate: { role: 'annotator', slaHours: 24 },
    quality_check: { ruleset: 'vla-qc-0.1-demo', threshold: 0.85 },
    human_review: { levels: 2 },
    vla_struct: { schema: 'vla-episode-v1' },
    export: { formats: ['json', 'xlsx', 'csv'] },
    train: { algorithm: 'YOLOv8-finetune', epochs: 12, batchSize: 8 },
  }
  return { ...(map[type] || {}) }
}

export const WORKFLOW_TEMPLATES = [
  {
    id: 'WF-ADF-VLA-01',
    name: 'VLA 具身数据线',
    description: '导入 → 抽帧 → VLA 结构化 → 质检 → 审核 → 三格式导出',
    version: 3,
    status: 'published',
    updatedAt: '2026-11-07 16:20:00',
    nodes: makeNodes(['import', 'parse', 'frame_extract', 'vla_struct', 'quality_check', 'human_review', 'export']),
    edges: makeEdges(7),
  },
  {
    id: 'WF-ADF-PRE-01',
    name: '预标注加速线',
    description: '导入 → OCR/YOLO/NLP → 人工确认 → 质检 → 回流导出',
    version: 2,
    status: 'published',
    updatedAt: '2026-11-06 11:05:00',
    nodes: makeNodes(['import', 'ocr', 'yolo', 'nlp_ner', 'human_annotate', 'quality_check', 'export']),
    edges: makeEdges(7),
  },
  {
    id: 'WF-ADF-MULTI-01',
    name: '多模态标注生产线',
    description: '解析后进入人工标注与多级审核，最终导出训练集',
    version: 1,
    status: 'published',
    updatedAt: '2026-11-05 09:40:00',
    nodes: makeNodes(['import', 'parse', 'human_annotate', 'quality_check', 'human_review', 'export', 'train']),
    edges: makeEdges(7),
  },
  {
    id: 'WF-ADF-DRAFT-01',
    name: '点云+语音实验草稿',
    description: '草稿流程，可编辑后发布',
    version: 1,
    status: 'draft',
    updatedAt: '2026-11-08 19:12:00',
    nodes: makeNodes(['import', 'audio_slice', 'point_seg', 'human_annotate', 'export']),
    edges: makeEdges(5),
  },
]

const rng = createPrng(20261109)
const STATUSES = ['draft', 'ready', 'running', 'waiting_human', 'succeeded', 'failed', 'paused']
const PRIORITIES = ['P0', 'P1', 'P2']

function pad(n) {
  return String(n).padStart(3, '0')
}

function buildProductionTasks() {
  const hand = [
    {
      id: 'ADF-PROD-2026-001',
      name: 'VLA-PickPlace 周批次生产',
      type: 'vla_pipeline',
      description: '仓拣红盒抓取放置周更数据包，含质检与导出',
      source: 'robot_capture',
      dataType: 'vla_mixed',
      datasetId: 'DS-ADF-VLA-01',
      workflowId: 'WF-ADF-VLA-01',
      workflowVersion: 3,
      executorIds: ['u-orn-annotator', 'u-orn-annotator-2'],
      reviewerIds: ['u-orn-reviewer'],
      priority: 'P0',
      scheduleAt: '2026-11-09 09:00:00',
      completeCondition: { minQualifiedRate: 0.92, minSamples: 80 },
      status: 'running',
      progress: 0.62,
      currentNode: 'quality_check',
      createdAt: '2026-11-08 14:22:00',
      elapsedSec: 18640,
      error: null,
    },
    {
      id: 'ADF-PROD-2026-002',
      name: 'Vision OCR/YOLO 预标回流',
      type: 'prelabel_accel',
      description: '对 DS-ADF-PRE-02 跑 OCR+YOLO 后人工验收',
      source: 'dataset_reflux',
      dataType: 'image',
      datasetId: 'DS-ADF-PRE-02',
      workflowId: 'WF-ADF-PRE-01',
      workflowVersion: 2,
      executorIds: ['u-orn-annotator'],
      reviewerIds: ['u-orn-reviewer', 'u-orn-admin'],
      priority: 'P1',
      scheduleAt: '2026-11-09 10:30:00',
      completeCondition: { minQualifiedRate: 0.9 },
      status: 'waiting_human',
      progress: 0.55,
      currentNode: 'human_annotate',
      createdAt: '2026-11-08 18:01:00',
      elapsedSec: 9200,
      error: null,
    },
    {
      id: 'ADF-PROD-2026-003',
      name: 'Det 训练集周闭环',
      type: 'train_loop',
      description: '标注导出后触发 YOLO fine-tune（演示指标）',
      source: 'dataset_reflux',
      dataType: 'image',
      datasetId: 'DS-ADF-TRAIN-01',
      workflowId: 'WF-ADF-MULTI-01',
      workflowVersion: 1,
      executorIds: ['u-orn-admin'],
      reviewerIds: ['u-orn-admin'],
      priority: 'P1',
      scheduleAt: '2026-11-10 02:00:00',
      completeCondition: { requireTrainSucceed: true },
      status: 'ready',
      progress: 0,
      currentNode: null,
      createdAt: '2026-11-09 08:15:00',
      elapsedSec: 0,
      error: null,
    },
  ]

  const extras = []
  for (let i = 4; i <= 28; i += 1) {
    const wf = rng.pick(WORKFLOW_TEMPLATES.filter((w) => w.status === 'published'))
    const status = rng.pick(STATUSES)
    const progress =
      status === 'succeeded' ? 1 : status === 'ready' || status === 'draft' ? 0 : rng.next() * 0.95
    extras.push({
      id: `ADF-PROD-2026-${pad(i)}`,
      name: `${rng.pick(['周更', '紧急', '返修', '补采'])}-${rng.pick(['文本', '视觉', 'VLA', '点云'])}生产批次`,
      type: rng.pick(TASK_TYPES).value,
      description: '自动生成的逼真伪造生产任务，用于列表筛选与监控演示。',
      source: rng.pick(DATA_SOURCES).value,
      dataType: rng.pick(DATA_TYPES).value,
      datasetId: rng.pick(DATASETS).id,
      workflowId: wf.id,
      workflowVersion: wf.version,
      executorIds: ['u-orn-annotator'],
      reviewerIds: ['u-orn-reviewer'],
      priority: rng.pick(PRIORITIES),
      scheduleAt: `2026-11-${rng.int(1, 9)} ${rng.int(8, 20)}:${rng.int(10, 59)}:00`,
      completeCondition: { minQualifiedRate: 0.85 + rng.next() * 0.1 },
      status,
      progress: Number(progress.toFixed(2)),
      currentNode: status === 'running' || status === 'waiting_human' ? rng.pick(wf.nodes).type : null,
      createdAt: `2026-11-${rng.int(1, 8)} ${rng.int(9, 18)}:00:00`,
      elapsedSec: rng.int(0, 86400),
      error: status === 'failed' ? 'NODE_TIMEOUT: yolo inference exceeded 120s (demo)' : null,
    })
  }
  return [...hand, ...extras]
}

export const PRODUCTION_TASKS = buildProductionTasks()

export function buildExecutionFromTask(task, workflow) {
  const nodes = (workflow?.nodes || []).map((n, idx) => {
    let status = 'pending'
    const p = task.progress || 0
    const ratio = (idx + 1) / workflow.nodes.length
    if (task.status === 'succeeded') status = 'succeeded'
    else if (task.status === 'failed' && ratio >= p) status = idx === Math.floor(p * workflow.nodes.length) ? 'failed' : ratio < p ? 'succeeded' : 'pending'
    else if (ratio < p) status = 'succeeded'
    else if (Math.abs(ratio - p) < 1 / workflow.nodes.length + 0.01) {
      status = task.status === 'waiting_human' ? 'waiting_human' : task.status === 'running' ? 'running' : 'pending'
    }
    return {
      key: n.key,
      type: n.type,
      label: n.label,
      status,
      attempt: status === 'failed' ? 2 : 1,
      elapsedSec: status === 'pending' ? 0 : rng.int(3, 420),
      logs: buildNodeLogs(n, status),
      outputSummary: status === 'succeeded' ? fakeOutput(n.type) : null,
    }
  })
  return {
    id: `ADF-EXE-${task.id.replace('ADF-PROD-', '')}`,
    productionTaskId: task.id,
    workflowId: task.workflowId,
    workflowVersion: task.workflowVersion,
    status: task.status === 'ready' ? 'pending' : task.status,
    startedAt: task.createdAt,
    finishedAt: task.status === 'succeeded' || task.status === 'failed' ? '2026-11-09 08:00:00' : null,
    nodes,
  }
}

function buildNodeLogs(node, status) {
  const base = [
    `[INFO] node=${node.type} key=${node.key} scheduled`,
    `[INFO] params=${JSON.stringify(node.params || {})}`,
  ]
  if (status === 'running' || status === 'waiting_human') {
    base.push(`[INFO] worker=demo-pool-${rng.int(1, 4)} claimed job`)
    base.push(`[INFO] progress heartbeat ok`)
  }
  if (status === 'succeeded') {
    base.push(`[INFO] wrote artifact to mock://runs/${node.key}/out.json`)
    base.push(`[INFO] succeeded in ${rng.int(2, 90)}s`)
  }
  if (status === 'failed') {
    base.push(`[ERROR] ${node.type} failed: simulated timeout`)
    base.push(`[WARN] retry policy remaining=0`)
  }
  if (status === 'waiting_human') {
    base.push(`[INFO] waiting human gate — AnnotationTask ORN-JOB-pending`)
  }
  return base
}

function fakeOutput(type) {
  const samples = {
    import: { sampleIds: 128, bytes: '1.4GB' },
    ocr: { boxes: 842, avgConf: 0.91 },
    yolo: { detections: 1560, classes: 12 },
    nlp_ner: { entities: 420, relations: 88 },
    quality_check: { passRate: 0.93, issues: 17 },
    vla_struct: { episodes: 46, actionNodes: 312 },
    export: { files: ['json', 'xlsx', 'csv'], sizeMB: 86 },
    train: { bestMap: 0.47, epochsDone: 12 },
  }
  return samples[type] || { ok: true }
}

export const DASHBOARD_SERIES = {
  dailyThroughput: [
    { day: '11-03', samples: 820, tasks: 6 },
    { day: '11-04', samples: 1040, tasks: 8 },
    { day: '11-05', samples: 960, tasks: 7 },
    { day: '11-06', samples: 1320, tasks: 11 },
    { day: '11-07', samples: 1180, tasks: 9 },
    { day: '11-08', samples: 1450, tasks: 12 },
    { day: '11-09', samples: 780, tasks: 5 },
  ],
  modalityShare: [
    { name: '图像', value: 38 },
    { name: '视频/VLA', value: 27 },
    { name: '文本', value: 18 },
    { name: '语音', value: 9 },
    { name: '点云', value: 8 },
  ],
  nodeFailTop: [
    { node: 'yolo', fails: 14 },
    { node: 'quality_check', fails: 9 },
    { node: 'ocr', fails: 7 },
    { node: 'train', fails: 5 },
    { node: 'frame_extract', fails: 3 },
  ],
}

export const EXPORT_RECORDS = Array.from({ length: 18 }).map((_, i) => ({
  id: `ADF-EXP-${pad(i + 1)}`,
  name: `导出包-${rng.pick(['VLA', 'QC', 'Prelabel', 'Train'])}-${i + 1}`,
  format: rng.pick(['json', 'xlsx', 'csv', 'zip']),
  sourceType: rng.pick(['vla', 'qc', 'production', 'train']),
  sourceId: rng.pick(['ORN-VLA-2026-001', 'ADF-PROD-2026-001', 'ORN-EXP-2026-001']),
  sizeMB: Number((rng.next() * 120 + 2).toFixed(1)),
  status: rng.pick(['ready', 'ready', 'ready', 'running', 'failed']),
  createdAt: `2026-11-${rng.int(1, 9)} ${rng.int(9, 20)}:12:00`,
  fileName: `adf_export_${i + 1}.${rng.pick(['json', 'xlsx', 'csv'])}`,
}))

export const MODEL_REGISTRY = [
  {
    id: 'MDL-OCR-01',
    name: 'PaddleOCR-v4',
    taskType: 'ocr',
    version: '4.0.0-demo',
    framework: 'paddle',
    status: 'active',
    params: { conf: 0.6, lang: 'ch' },
    updatedAt: '2026-10-28',
  },
  {
    id: 'MDL-DET-01',
    name: 'YOLOv8n-Orion',
    taskType: 'yolo',
    version: '8.2.1-demo',
    framework: 'pytorch',
    status: 'active',
    params: { conf: 0.35, imgsz: 640 },
    updatedAt: '2026-11-01',
  },
  {
    id: 'MDL-NER-01',
    name: 'BERT-NER-ZH',
    taskType: 'nlp_ner',
    version: '1.3.0-demo',
    framework: 'transformers',
    status: 'active',
    params: { conf: 0.5 },
    updatedAt: '2026-09-18',
  },
  {
    id: 'MDL-SEG-01',
    name: 'SegFormer-Lite',
    taskType: 'seg',
    version: '0.9.2-demo',
    framework: 'pytorch',
    status: 'deprecated',
    params: {},
    updatedAt: '2026-08-02',
  },
]

export const DEVICES = [
  {
    id: 'DEV-CAM-01',
    name: '腕部 RGB 相机',
    type: 'wrist_camera',
    typeLabel: '手腕相机',
    robot: 'UR5e-Orion',
    status: 'online',
    tasks: 12,
    location: '仓拣工位-1',
    sn: 'SN-WRIST-4410',
    fps: 30,
    resolution: '1280x720',
    lastHeartbeat: '2026-11-09 09:52:11',
    boundTaskIds: ['ORN-VLA-2026-001', 'ADF-PROD-2026-001'],
  },
  {
    id: 'DEV-CAM-02',
    name: '全局俯视相机',
    type: 'rgb_camera',
    typeLabel: 'RGB 相机',
    robot: 'UR5e-Orion',
    status: 'online',
    tasks: 12,
    location: '仓拣工位-1',
    sn: 'SN-CAM-8821',
    fps: 30,
    resolution: '1920x1080',
    lastHeartbeat: '2026-11-09 09:52:09',
    boundTaskIds: ['ORN-VLA-2026-001'],
  },
  {
    id: 'DEV-MIC-01',
    name: '指令麦克风',
    type: 'microphone',
    typeLabel: '麦克风',
    robot: '—',
    status: 'idle',
    tasks: 3,
    location: '实验台-2',
    sn: 'SN-MIC-2201',
    fps: null,
    resolution: null,
    lastHeartbeat: '2026-11-09 09:50:33',
    boundTaskIds: [],
  },
  {
    id: 'DEV-ARM-01',
    name: 'UR5e 本体',
    type: 'manipulator',
    typeLabel: '机械臂',
    robot: 'UR5e-Orion',
    status: 'busy',
    tasks: 8,
    location: '仓拣工位-1',
    sn: 'SN-ARM-UR5E-01',
    fps: null,
    resolution: null,
    lastHeartbeat: '2026-11-09 09:51:58',
    boundTaskIds: ['ORN-VLA-2026-001', 'ORN-VLA-2026-002'],
  },
  {
    id: 'DEV-IPC-01',
    name: '采集工控机',
    type: 'edge_pc',
    typeLabel: '工控机',
    robot: 'UR5e-Orion',
    status: 'online',
    tasks: 15,
    location: '仓拣工位-1',
    sn: 'SN-IPC-9901',
    fps: null,
    resolution: null,
    lastHeartbeat: '2026-11-09 09:52:01',
    boundTaskIds: ['ADF-PROD-2026-001'],
  },
  {
    id: 'DEV-DEPTH-01',
    name: '深度相机 RealSense',
    type: 'depth_camera',
    typeLabel: '深度相机',
    robot: 'UR5e-Orion',
    status: 'offline',
    tasks: 0,
    location: '实验台-2',
    sn: 'SN-D435-1102',
    fps: 15,
    resolution: '848x480',
    lastHeartbeat: '2026-11-08 19:12:00',
    boundTaskIds: [],
  },
]

export const SCENES = [
  {
    id: 'SCN-01',
    name: '货架拣选通道',
    category: '仓储',
    description: '标准货架通道，红蓝料箱混放',
    environment: '室内照明 450lux',
    space: '通道宽 1.2m',
    tags: ['pick', 'aisle'],
    imageUrl: '/samples/video/bin_pick.svg',
  },
  {
    id: 'SCN-02',
    name: '冷链实验室',
    category: '实验室',
    description: '低温柜开合与样品拿取',
    environment: '4℃ 冷柜区域',
    space: '操作台 0.8×1.2m',
    tags: ['cold', 'lab'],
    imageUrl: '/samples/images/desk_seg.svg',
  },
  {
    id: 'SCN-03',
    name: '夹层作业台',
    category: '装配',
    description: '零件分拣与拧紧辅助',
    environment: '工业白光',
    space: '台面 1.5×0.9m',
    tags: ['assembly'],
    imageUrl: '/samples/images/desk_seg.svg',
  },
]

export const COLLECTION_PLANS = [
  {
    id: 'PLAN-01',
    name: '标准抓取放置方案',
    goal: '红盒抓取至托盘',
    steps: ['接近', '抓取', '抬升', '运送', '放置'],
    frequencyHz: 10,
    durationSec: 12,
    devices: ['DEV-CAM-01', 'DEV-CAM-02', 'DEV-ARM-01'],
    dataTypes: ['video', 'image', 'action'],
    qualityReq: '无严重抖动/遮挡，指令完整',
  },
  {
    id: 'PLAN-02',
    name: '开抽屉序列方案',
    goal: '拉开抽屉并取出物体',
    steps: ['定位把手', '抓握', '抽拉', '取物'],
    frequencyHz: 15,
    durationSec: 18,
    devices: ['DEV-CAM-01', 'DEV-ARM-01'],
    dataTypes: ['video', 'action'],
    qualityReq: '关键帧可见把手与物体',
  },
]

export function nextProdId(seq) {
  return `ADF-PROD-2026-${pad(seq)}`
}

export { nodeMeta }
