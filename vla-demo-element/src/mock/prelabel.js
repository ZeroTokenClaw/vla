import { seedTextDocs, seedVisionImages, seedAcceptJobs } from './seed/prelabel'

/** DataLink 智能预标 mock：文本管线、OCR/YOLO、验收向导。故意植入可修正错误便于 Diff 演示。 */

const HAND_TEXT_DOCS = [
  {
    id: 'DL-TXT-2026-001',
    title: '客服工单-物流改派（脱敏）',
    batchId: 'PRE-BATCH-T01',
    status: 'ready',
    rawText:
      '用户李某于2026年11月02日致电反映：订单 DL-ORD-9902 包裹破损，申请退回至杭州市西湖区文三路100号，联系电话139****8832。客服登记后转入质检组复核。',
    /** 模型原始输出（含故意错误） */
    model: {
      classify: { label: '投诉-物流延误', conf: 0.81 },
      entities: [
        { id: 'te1', text: '李某', type: 'PERSON', start: 2, end: 4, conf: 0.94 },
        { id: 'te2', text: '2026年11月02日', type: 'DATE', start: 5, end: 16, conf: 0.97 },
        { id: 'te3', text: 'DL-ORD-9902', type: 'ORDER_ID', start: 24, end: 35, conf: 0.99 },
        // 故意错：把 ADDRESS 标成 ORG
        { id: 'te4', text: '杭州市西湖区文三路100号', type: 'ORG', start: 45, end: 58, conf: 0.72 },
        { id: 'te5', text: '139****8832', type: 'PHONE', start: 63, end: 74, conf: 0.96 },
      ],
      relations: [
        { id: 'tr1', head: 'te1', tail: 'te3', type: 'COMPLAINS_ABOUT', conf: 0.88 },
        // 故意错：应为 LOCATED_AT，模型给出 SHIPS_TO
        { id: 'tr2', head: 'te3', tail: 'te4', type: 'SHIPS_TO', conf: 0.61 },
      ],
      structured: {
        orderId: 'DL-ORD-9902',
        customer: '李某',
        issue: '包裹破损',
        address: '杭州市西湖区文三路100号',
        phone: '139****8832',
        channel: '电话客服',
      },
    },
    /** 人工金标准参考（不直接展示，用于提示） */
    goldHint: {
      classify: '投诉-包裹破损',
      entityFix: { te4: 'ADDRESS' },
      relationFix: { tr2: 'RETURN_TO' },
    },
  },
  {
    id: 'DL-TXT-2026-002',
    title: '具身指令语料-抓取杯子',
    batchId: 'PRE-BATCH-T02',
    status: 'ready',
    rawText:
      '请机器人在桌面场景中抓取红色马克杯，并放置到托盘左侧。注意避开蓝色盘子。任务编号 DL-VLA-CMD-118。',
    model: {
      classify: { label: '具身-抓取放置', conf: 0.93 },
      entities: [
        { id: 'te6', text: '红色马克杯', type: 'OBJECT', start: 13, end: 18, conf: 0.91 },
        // 故意错：漏标「蓝色盘子」；托盘位置类型标错
        { id: 'te7', text: '托盘左侧', type: 'OBJECT', start: 23, end: 27, conf: 0.66 },
        { id: 'te8', text: 'DL-VLA-CMD-118', type: 'TASK_ID', start: 40, end: 54, conf: 0.99 },
      ],
      relations: [
        { id: 'tr3', head: 'te6', tail: 'te7', type: 'PLACE_ON', conf: 0.84 },
      ],
      structured: {
        action: 'pick_and_place',
        target: '红色马克杯',
        destination: '托盘左侧',
        avoid: null,
        taskId: 'DL-VLA-CMD-118',
      },
    },
    goldHint: {
      classify: '具身-抓取放置',
      entityFix: { te7: 'LOCATION' },
      note: '应补充实体「蓝色盘子」类型 OBJECT',
    },
  },
]

function buildTextDocs() {
  try {
    return seedTextDocs(HAND_TEXT_DOCS)
  } catch (e) {
    console.error('[datalink] prelabel text seed failed, fallback thin', e)
    return HAND_TEXT_DOCS.map((d) => ({
      ...d,
      progressPct: d.progressPct ?? 100,
      spotCheckPass: d.spotCheckPass ?? true,
    }))
  }
}

export const TEXT_DOCS = buildTextDocs()

export const ENTITY_TYPES = ['PERSON', 'DATE', 'ORDER_ID', 'ADDRESS', 'PHONE', 'ORG', 'OBJECT', 'LOCATION', 'TASK_ID']
export const RELATION_TYPES = ['COMPLAINS_ABOUT', 'SHIPS_TO', 'RETURN_TO', 'PLACE_ON', 'AVOID', 'LOCATED_AT']
export const CLASS_LABELS = ['投诉-物流延误', '投诉-包裹破损', '咨询-进度', '具身-抓取放置', '其他']

const HAND_VISION_IMAGES = [
  {
    id: 'DL-IMG-2026-001',
    title: '桌面抓取-铭牌 OCR + YOLO',
    imageUrl: '/samples/images/desk_seg.jpg',
    width: 640,
    height: 400,
    status: 'ready',
    ocrModel: [
      { id: 'o1', text: 'CUP-A12', x: 0.12, y: 0.18, w: 0.16, h: 0.08, conf: 0.91 },
      // 故意错：把 PLATE-B 识别成 PLATE-8
      { id: 'o2', text: 'PLATE-8', x: 0.42, y: 0.55, w: 0.18, h: 0.07, conf: 0.63 },
      { id: 'o3', text: 'TRAY-L', x: 0.68, y: 0.72, w: 0.14, h: 0.06, conf: 0.88 },
    ],
    yoloModel: [
      { id: 'y1', label: 'cup', x: 0.1, y: 0.12, w: 0.2, h: 0.28, conf: 0.93 },
      { id: 'y2', label: 'plate', x: 0.38, y: 0.42, w: 0.28, h: 0.26, conf: 0.9 },
      // 故意错：把手标成 tool
      { id: 'y3', label: 'tool', x: 0.58, y: 0.2, w: 0.18, h: 0.3, conf: 0.58 },
      { id: 'y4', label: 'tray', x: 0.62, y: 0.62, w: 0.3, h: 0.28, conf: 0.87 },
    ],
    labelSet: ['cup', 'plate', 'hand', 'tray', 'tool', 'table', 'other'],
  },
  {
    id: 'DL-IMG-2026-002',
    title: '料箱分拣-箱号 OCR + YOLO',
    imageUrl: '/samples/images/desk_grasp.jpg',
    width: 640,
    height: 400,
    status: 'ready',
    ocrModel: [
      { id: 'o4', text: 'BIN-07', x: 0.2, y: 0.15, w: 0.15, h: 0.08, conf: 0.95 },
      // 故意错
      { id: 'o5', text: 'BIN-O1', x: 0.55, y: 0.2, w: 0.15, h: 0.08, conf: 0.55 },
    ],
    yoloModel: [
      { id: 'y5', label: 'box_A', x: 0.15, y: 0.25, w: 0.25, h: 0.35, conf: 0.92 },
      { id: 'y6', label: 'box_B', x: 0.5, y: 0.28, w: 0.26, h: 0.34, conf: 0.89 },
      { id: 'y7', label: 'gripper', x: 0.35, y: 0.05, w: 0.18, h: 0.2, conf: 0.84 },
    ],
    labelSet: ['box_A', 'box_B', 'gripper', 'conveyor', 'other'],
  },
]

function buildVisionImages() {
  try {
    return seedVisionImages(HAND_VISION_IMAGES)
  } catch (e) {
    console.error('[datalink] prelabel vision seed failed, fallback thin', e)
    return HAND_VISION_IMAGES.map((d) => ({
      ...d,
      batchId: d.batchId ?? 'PRE-BATCH-V01',
      progressPct: d.progressPct ?? 100,
      spotCheckPass: d.spotCheckPass ?? true,
    }))
  }
}

export const VISION_IMAGES = buildVisionImages()

export const ACCEPT_STEPS = [
  { key: 'confirm', label: '确认预标', desc: '核对模型结果与样例匹配度，确认进入精标' },
  { key: 'annotate', label: '人工精标', desc: '完成漏标补标、错标修正与结构化核对' },
  { key: 'qa', label: '质量检查', desc: '按规范抽检关键字段，记录质检意见' },
  { key: 'accept', label: '结果验收', desc: '审核员/管理员终验入库' },
]

/** 可选手动切换的预标模型（演示伪造） */
export const PRELABEL_MODELS = [
  {
    id: 'mdl-ner-bert-zh',
    name: 'BERT-Base-ZH NER',
    type: 'text_pipeline',
    version: 'v2.3.1',
    backend: 'transformers',
    defaultParams: { maxLen: 512, confThres: 0.55, temperature: 0.2 },
  },
  {
    id: 'mdl-llm-struct',
    name: '数联结构化 LLM',
    type: 'text_pipeline',
    version: 'v0.9-demo',
    backend: 'llm_json',
    defaultParams: { maxLen: 2048, confThres: 0.4, temperature: 0.1 },
  },
  {
    id: 'mdl-paddle-ocr',
    name: 'PaddleOCR-CN',
    type: 'ocr',
    version: 'v2.7.1',
    backend: 'paddleocr',
    defaultParams: { confThres: 0.5, detDbThresh: 0.3, useAngle: true },
  },
  {
    id: 'mdl-yolov8n',
    name: 'YOLOv8n-Desk',
    type: 'yolo',
    version: 'v8.2.0',
    backend: 'ultralytics',
    defaultParams: { confThres: 0.35, imgsz: 640, iou: 0.45 },
  },
  {
    id: 'mdl-yolov8m',
    name: 'YOLOv8m-Desk',
    type: 'yolo',
    version: 'v8.2.0',
    backend: 'ultralytics',
    defaultParams: { confThres: 0.3, imgsz: 640, iou: 0.5 },
  },
]

export function createPrelabelJobs() {
  return [
    {
      id: 'DL-PRE-2026-001',
      title: '客服文本批次 PRE-BATCH-T01',
      type: 'text_pipeline',
      modelId: 'mdl-ner-bert-zh',
      modelVersion: 'v2.3.1',
      params: { maxLen: 512, confThres: 0.55, temperature: 0.2 },
      sampleIds: ['DL-TXT-2026-001', 'DL-TXT-2026-002'],
      status: 'success',
      progressPct: 100,
      successCount: 2,
      failCount: 0,
      retryCount: 0,
      errorMessage: null,
      createdAt: '2026-11-08 10:12:00',
      finishedAt: '2026-11-08 10:14:22',
      diffStats: { entityFixRate: 0.18, relationFixRate: 0.22, classifyFixRate: 0.08 },
    },
    {
      id: 'DL-PRE-2026-002',
      title: '桌面视觉 OCR+YOLO',
      type: 'batch_mixed',
      modelId: 'mdl-yolov8n',
      modelVersion: 'v8.2.0',
      params: { confThres: 0.35, imgsz: 640, iou: 0.45 },
      sampleIds: ['DL-IMG-2026-001'],
      status: 'success',
      progressPct: 100,
      successCount: 1,
      failCount: 0,
      retryCount: 0,
      errorMessage: null,
      createdAt: '2026-11-08 14:01:00',
      finishedAt: '2026-11-08 14:03:41',
      diffStats: { ocrFixRate: 0.12, yoloFixRate: 0.09 },
    },
    {
      id: 'DL-PRE-2026-003',
      title: '料箱批次 YOLO 失败重试样例',
      type: 'yolo',
      modelId: 'mdl-yolov8m',
      modelVersion: 'v8.2.0',
      params: { confThres: 0.3, imgsz: 640, iou: 0.5 },
      sampleIds: ['DL-IMG-2026-002', 'DL-IMG-2026-003'],
      status: 'failed',
      progressPct: 46,
      successCount: 0,
      failCount: 2,
      retryCount: 1,
      errorMessage: 'CUDA OOM（演示）：batch 过大，请降低 imgsz 或重试',
      createdAt: '2026-11-09 07:40:00',
      finishedAt: '2026-11-09 07:41:18',
      diffStats: null,
    },
    {
      id: 'DL-PRE-2026-004',
      title: '指令语料 LLM 结构化（运行中）',
      type: 'text_pipeline',
      modelId: 'mdl-llm-struct',
      modelVersion: 'v0.9-demo',
      params: { maxLen: 2048, confThres: 0.4, temperature: 0.1 },
      sampleIds: ['DL-TXT-2026-002'],
      status: 'running',
      progressPct: 62,
      successCount: 0,
      failCount: 0,
      retryCount: 0,
      errorMessage: null,
      createdAt: '2026-11-09 08:55:00',
      finishedAt: null,
      diffStats: null,
    },
  ]
}

export function createAcceptJobs() {
  const hand = [
    {
      id: 'DL-ACC-2026-001',
      title: '文本预标验收 · 客服工单批次',
      sourceType: 'text',
      sourceId: 'DL-TXT-2026-001',
      step: 'confirm',
      stepDone: [],
      qaNote: '',
      acceptedAt: null,
      acceptedBy: null,
      status: 'in_progress',
    },
    {
      id: 'DL-ACC-2026-002',
      title: '视觉预标验收 · 桌面抓取',
      sourceType: 'vision',
      sourceId: 'DL-IMG-2026-001',
      step: 'confirm',
      stepDone: [],
      qaNote: '',
      acceptedAt: null,
      acceptedBy: null,
      status: 'in_progress',
    },
    {
      id: 'DL-ACC-2026-003',
      title: '混合批次验收 · 指令+箱号',
      sourceType: 'text',
      sourceId: 'DL-TXT-2026-002',
      step: 'annotate',
      stepDone: ['confirm'],
      qaNote: '',
      acceptedAt: null,
      acceptedBy: null,
      status: 'in_progress',
    },
  ]
  try {
    return seedAcceptJobs(hand)
  } catch (e) {
    console.error('[datalink] prelabel accept seed failed, fallback thin', e)
    return hand
  }
}
