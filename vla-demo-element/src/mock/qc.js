import { seedQcTasks, seedSamplePool } from './seed/qc'

/** DataLink QC mock: multimodal tickets, workflow, sample-check. */

export const MODALITIES = [
  { value: 'text_ner', label: '物流工单 NER', short: '仓储客服 · 实体', hint: 'DL 订单 / 地址 / 电话' },
  { value: 'seg', label: '货架箱体分割', short: '仓内 RGB · Mask', hint: '纸箱 / 托盘 / 货架' },
  { value: 'audio_slice', label: '拣货对讲切片', short: '仓内语音 · 切片', hint: '唤醒 / 库位指令' },
  { value: 'video_det', label: '输送线目标跟踪', short: '分拣视频 · Track', hint: '料箱 / 夹爪 / 皮带' },
  { value: 'point_seg', label: '库区 LiDAR 分割', short: '点云 · 库位', hint: '托盘面 / 叉车' },
]

export const STATUS_FLOW = [
  { value: 'created', label: '已创建', color: 'info' },
  { value: 'assigned', label: '已分配', color: '' },
  { value: 'annotating', label: '标注中', color: 'warning' },
  { value: 'reviewing', label: '初审中', color: 'warning' },
  { value: 'final_review', label: '终审中', color: 'danger' },
  { value: 'done', label: '已完成', color: 'success' },
  { value: 'rejected', label: '已驳回', color: 'danger' },
]

/** Allowed transitions: from → to[] */
export const TRANSITIONS = {
  created: ['assigned'],
  assigned: ['annotating'],
  annotating: ['reviewing'],
  reviewing: ['final_review', 'rejected'],
  final_review: ['done', 'rejected'],
  rejected: ['annotating'],
  done: [],
}

export const REJECT_REASONS = [
  { value: 'label_miss', label: '漏标 / 漏检' },
  { value: 'label_wrong', label: '错标 / 类别错误' },
  { value: 'boundary_bad', label: '边界不准 / 起止帧偏差' },
  { value: 'spec_violate', label: '违反标注规范' },
  { value: 'sample_bad', label: '样本质量不合格' },
  { value: 'other', label: '其他' },
]

export const PRIORITIES = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

/** Sample media + annotation payloads — DataLink 仓储物流域 */
export const SAMPLE_RESOURCES = {
  text_ner: {
    id: 'res-text-01',
    title: '华东仓客服工单 · 脱敏',
    domain: 'warehouse-cs',
    text:
      '货主王敏于2026年11月03日投诉：运单 DL-WH-99021 在苏州吴中仓滞留，要求改派昆山市陆家镇前进路 66 号，联系电话 139****2208。仓管已确认库位 A-12-03。',
    entities: [
      { id: 'e1', text: '王敏', type: 'PERSON', start: 2, end: 4 },
      { id: 'e2', text: '2026年11月03日', type: 'DATE', start: 5, end: 16 },
      { id: 'e3', text: 'DL-WH-99021', type: 'WAYBILL', start: 22, end: 33 },
      { id: 'e4', text: '苏州吴中仓', type: 'WAREHOUSE', start: 35, end: 40 },
      { id: 'e5', text: '昆山市陆家镇前进路 66 号', type: 'ADDRESS', start: 47, end: 61 },
      { id: 'e6', text: '139****2208', type: 'PHONE', start: 67, end: 78 },
      { id: 'e7', text: 'A-12-03', type: 'BIN_LOC', start: 87, end: 94 },
    ],
    labelSet: ['PERSON', 'DATE', 'WAYBILL', 'WAREHOUSE', 'ADDRESS', 'PHONE', 'BIN_LOC'],
  },
  seg: {
    id: 'res-img-01',
    title: '立体货架箱体分割 · B3 巷道',
    domain: 'warehouse-rgb',
    imageUrl: '/samples/images/scene_02.jpg',
    masks: [
      {
        id: 'm1',
        label: 'carton',
        color: '#f59e0b',
        area: 0.14,
        conf: 0.92,
        polygon: [
          [0.18, 0.22],
          [0.38, 0.2],
          [0.4, 0.48],
          [0.16, 0.5],
        ],
      },
      {
        id: 'm2',
        label: 'pallet',
        color: '#0ea5e9',
        area: 0.2,
        conf: 0.9,
        polygon: [
          [0.12, 0.58],
          [0.62, 0.55],
          [0.64, 0.82],
          [0.1, 0.84],
        ],
      },
      {
        id: 'm3',
        label: 'shelf',
        color: '#8b5cf6',
        area: 0.28,
        conf: 0.88,
        polygon: [
          [0.55, 0.08],
          [0.92, 0.1],
          [0.94, 0.72],
          [0.52, 0.7],
        ],
      },
      {
        id: 'm4',
        label: 'aisle_floor',
        color: '#64748b',
        area: 0.22,
        conf: 0.95,
        polygon: [
          [0.05, 0.72],
          [0.5, 0.7],
          [0.55, 0.96],
          [0.02, 0.98],
        ],
      },
    ],
    labelSet: ['carton', 'pallet', 'shelf', 'aisle_floor', 'label_tag', 'other'],
  },
  audio_slice: {
    id: 'res-audio-01',
    title: '拣货对讲 · 库位播报',
    domain: 'warehouse-radio',
    audioUrl: '/samples/audio/clip_01.wav',
    waveformUrl: '/samples/audio/clip_01_wave.png',
    durationSec: 1.1,
    slices: [
      { id: 's1', start: 0.05, end: 0.28, label: '呼号', text: '拣货员 07 呼叫' },
      { id: 's2', start: 0.3, end: 0.72, label: '库位指令', text: '前往 A 区 十二巷 三层' },
      { id: 's3', start: 0.75, end: 1.0, label: '确认', text: '收到，正在移动' },
    ],
    labelSet: ['呼号', '库位指令', '确认', '噪声', '其他'],
  },
  video_det: {
    id: 'res-video-01',
    title: '输送线料箱跟踪 · Line-C',
    domain: 'sortation-video',
    posterUrl: '/samples/video/ep_02_poster.jpg',
    videoUrl: '/samples/video/ep_02.mp4',
    fps: 25,
    frames: 90,
    detections: [
      { id: 'd1', frame: 8, label: 'tote', x: 0.1, y: 0.25, w: 0.2, h: 0.22, conf: 0.93, trackId: 'trk-tote-1' },
      { id: 'd2', frame: 22, label: 'gripper', x: 0.42, y: 0.18, w: 0.14, h: 0.2, conf: 0.88, trackId: 'trk-grip' },
      { id: 'd3', frame: 40, label: 'tote', x: 0.35, y: 0.3, w: 0.18, h: 0.2, conf: 0.91, trackId: 'trk-tote-1' },
      { id: 'd4', frame: 55, label: 'belt', x: 0.02, y: 0.68, w: 0.96, h: 0.22, conf: 0.97, trackId: 'trk-belt' },
      { id: 'd5', frame: 70, label: 'tote', x: 0.58, y: 0.32, w: 0.17, h: 0.19, conf: 0.89, trackId: 'trk-tote-2' },
    ],
    labelSet: ['tote', 'gripper', 'belt', 'scanner', 'person', 'other'],
  },
  point_seg: {
    id: 'res-pc-01',
    title: '库区 LiDAR · B3 巷道俯视',
    domain: 'warehouse-lidar',
    previewUrl: '/samples/pointcloud/warehouse_lidar.svg',
    points: 186420,
    segments: [
      { id: 'p1', label: 'pallet_plane', points: 72000, color: '#38bdf8' },
      { id: 'p2', label: 'carton_A', points: 18400, color: '#fbbf24' },
      { id: 'p3', label: 'carton_B', points: 20100, color: '#34d399' },
      { id: 'p4', label: 'forklift', points: 26800, color: '#fb7185' },
      { id: 'p5', label: 'noise', points: 4200, color: '#94a3b8' },
    ],
    labelSet: ['pallet_plane', 'carton_A', 'carton_B', 'forklift', 'rack', 'noise'],
  },
}

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

/** In-memory mutable store seeded once. */
export function createInitialTasks() {
  const hand = [
    {
      id: 'DL-2026-1104-0312',
      title: '客服工单实体抽取返修',
      modality: 'text_ner',
      status: 'annotating',
      priority: 'high',
      buCode: 'BU-华东',
      creatorId: 'u-dl-admin',
      assigneeId: 'u-dl-annotator',
      collaborators: ['u-dl-annotator', 'u-dl-annotator-2'],
      createdAt: '2026-11-04 09:12:00',
      updatedAt: '2026-11-04 11:20:00',
      batchId: 'BATCH-TX-09',
      sampleCount: 120,
      doneCount: 86,
      resourceId: 'res-text-01',
      comments: [
        {
          id: 'c1',
          at: '2026-11-04 10:05:00',
          authorId: 'u-dl-reviewer',
          authorName: '林晓萱',
          body: 'ORDER_ID 边界请对齐空格，参考规范 §3.2。',
        },
        {
          id: 'c2',
          at: '2026-11-04 10:40:00',
          authorId: 'u-dl-annotator',
          authorName: '陈思远',
          body: '已按规范调整，请复审。',
        },
      ],
      history: [
        { at: '2026-11-04 09:12:00', actor: '周明轩', action: '创建工单', note: '' },
        { at: '2026-11-04 09:15:00', actor: '周明轩', action: '分配给陈思远', note: '' },
        { at: '2026-11-04 09:20:00', actor: '陈思远', action: '开始标注', note: '' },
      ],
      rejectReason: null,
      rejectChain: [],
      labelsSnapshot: clone(SAMPLE_RESOURCES.text_ner.entities),
    },
    {
      id: 'DL-2026-1104-0318',
      title: '桌面抓取语义分割初标',
      modality: 'seg',
      status: 'reviewing',
      priority: 'medium',
      buCode: 'BU-华南',
      creatorId: 'u-dl-admin',
      assigneeId: 'u-dl-annotator-2',
      collaborators: ['u-dl-annotator-2', 'u-dl-reviewer'],
      createdAt: '2026-11-04 08:40:00',
      updatedAt: '2026-11-04 12:05:00',
      batchId: 'BATCH-IMG-22',
      sampleCount: 80,
      doneCount: 80,
      resourceId: 'res-img-01',
      comments: [
        {
          id: 'c3',
          at: '2026-11-04 11:50:00',
          authorId: 'u-dl-annotator-2',
          authorName: '赵雨桐',
          body: 'hand 与 cup 交叠处已按规范切开，请初审。',
        },
      ],
      history: [
        { at: '2026-11-04 08:40:00', actor: '周明轩', action: '创建工单', note: '' },
        { at: '2026-11-04 08:45:00', actor: '周明轩', action: '分配给赵雨桐', note: '' },
        { at: '2026-11-04 09:00:00', actor: '赵雨桐', action: '开始标注', note: '' },
        { at: '2026-11-04 11:55:00', actor: '赵雨桐', action: '提交初审', note: '' },
      ],
      rejectReason: null,
      rejectChain: [],
      labelsSnapshot: clone(SAMPLE_RESOURCES.seg.masks),
    },
    {
      id: 'DL-2026-1103-0288',
      title: '指令语音切片质检',
      modality: 'audio_slice',
      status: 'final_review',
      priority: 'high',
      buCode: 'BU-华北',
      creatorId: 'u-dl-admin',
      assigneeId: 'u-dl-annotator',
      collaborators: ['u-dl-annotator', 'u-dl-reviewer'],
      createdAt: '2026-11-03 16:20:00',
      updatedAt: '2026-11-04 10:30:00',
      batchId: 'BATCH-AUD-07',
      sampleCount: 60,
      doneCount: 60,
      resourceId: 'res-audio-01',
      comments: [
        {
          id: 'c4',
          at: '2026-11-04 09:10:00',
          authorId: 'u-dl-reviewer',
          authorName: '林晓萱',
          body: '初审通过，唤醒词切片边界合格，提交终审。',
        },
      ],
      history: [
        { at: '2026-11-03 16:20:00', actor: '周明轩', action: '创建工单', note: '' },
        { at: '2026-11-03 16:25:00', actor: '周明轩', action: '分配给陈思远', note: '' },
        { at: '2026-11-03 17:00:00', actor: '陈思远', action: '开始标注', note: '' },
        { at: '2026-11-04 08:50:00', actor: '陈思远', action: '提交初审', note: '' },
        { at: '2026-11-04 09:15:00', actor: '林晓萱', action: '初审通过', note: '进入终审' },
      ],
      rejectReason: null,
      rejectChain: [],
      labelsSnapshot: clone(SAMPLE_RESOURCES.audio_slice.slices),
    },
    {
      id: 'DL-2026-1102-0251',
      title: '料箱分拣视频目标检测',
      modality: 'video_det',
      status: 'rejected',
      priority: 'high',
      buCode: 'BU-西南',
      creatorId: 'u-dl-admin',
      assigneeId: 'u-dl-annotator',
      collaborators: ['u-dl-annotator', 'u-dl-annotator-2', 'u-dl-reviewer'],
      createdAt: '2026-11-02 14:10:00',
      updatedAt: '2026-11-04 09:45:00',
      batchId: 'BATCH-VID-15',
      sampleCount: 40,
      doneCount: 40,
      resourceId: 'res-video-01',
      comments: [
        {
          id: 'c5',
          at: '2026-11-04 09:40:00',
          authorId: 'u-dl-reviewer',
          authorName: '林晓萱',
          body: 'gripper 在帧 45 漏检，请返修后重新提交。',
        },
      ],
      history: [
        { at: '2026-11-02 14:10:00', actor: '周明轩', action: '创建工单', note: '' },
        { at: '2026-11-02 14:20:00', actor: '周明轩', action: '分配给陈思远', note: '' },
        { at: '2026-11-03 10:00:00', actor: '陈思远', action: '提交初审', note: '' },
        {
          at: '2026-11-04 09:45:00',
          actor: '林晓萱',
          action: '驳回返修',
          note: '漏标 / 漏检',
        },
      ],
      rejectReason: 'label_miss',
      rejectChain: [{ at: '2026-11-04 09:45:00', by: 'u-dl-reviewer', reason: 'label_miss' }],
      labelsSnapshot: clone(SAMPLE_RESOURCES.video_det.detections),
    },
    {
      id: 'DL-2026-1104-0330',
      title: '桌面点云分割样例入库',
      modality: 'point_seg',
      status: 'assigned',
      priority: 'medium',
      buCode: 'BU-华东',
      creatorId: 'u-dl-admin',
      assigneeId: 'u-dl-annotator-2',
      collaborators: ['u-dl-annotator-2'],
      createdAt: '2026-11-04 11:00:00',
      updatedAt: '2026-11-04 11:05:00',
      batchId: 'BATCH-PC-03',
      sampleCount: 25,
      doneCount: 0,
      resourceId: 'res-pc-01',
      comments: [],
      history: [
        { at: '2026-11-04 11:00:00', actor: '周明轩', action: '创建工单', note: '' },
        { at: '2026-11-04 11:05:00', actor: '周明轩', action: '分配给赵雨桐', note: '' },
      ],
      rejectReason: null,
      rejectChain: [],
      labelsSnapshot: clone(SAMPLE_RESOURCES.point_seg.segments),
    },
    {
      id: 'DL-2026-1101-0204',
      title: '历史文本NER归档抽检',
      modality: 'text_ner',
      status: 'done',
      priority: 'low',
      buCode: 'BU-华南',
      creatorId: 'u-dl-admin',
      assigneeId: 'u-dl-annotator',
      collaborators: ['u-dl-annotator', 'u-dl-reviewer'],
      createdAt: '2026-11-01 10:00:00',
      updatedAt: '2026-11-03 18:20:00',
      batchId: 'BATCH-TX-05',
      sampleCount: 200,
      doneCount: 200,
      resourceId: 'res-text-01',
      comments: [],
      history: [
        { at: '2026-11-01 10:00:00', actor: '周明轩', action: '创建工单', note: '' },
        { at: '2026-11-03 18:20:00', actor: '林晓萱', action: '终审通过', note: '入库回流库' },
      ],
      rejectReason: null,
      rejectChain: [],
      labelsSnapshot: clone(SAMPLE_RESOURCES.text_ner.entities),
      refluxed: true,
    },
  ]
  // ensure hand rows have buCode / rejectChain (defense in depth)
  for (const t of hand) {
    if (!t.buCode) t.buCode = 'BU-华东'
    if (!Array.isArray(t.rejectChain)) t.rejectChain = []
  }
  try {
    return seedQcTasks(hand)
  } catch (e) {
    console.error('[datalink] QC seed failed, fallback thin', e)
    return hand
  }
}

export const SAMPLE_RULES = [
  {
    id: 'RULE-DL-01',
    name: '文本/语音高优批次抽检',
    ratio: 0.15,
    modalities: ['text_ner', 'audio_slice'],
    minSamples: 20,
    qualityThreshold: 0.92,
    enabled: true,
    description: '对高优先级文本与语音工单按 15% 比例随机抽检，覆盖漏标与规范违反项。',
  },
  {
    id: 'RULE-DL-02',
    name: '视觉模态全量复核抽检',
    ratio: 0.1,
    modalities: ['seg', 'video_det', 'point_seg'],
    minSamples: 10,
    qualityThreshold: 0.9,
    enabled: true,
    description: '图像分割、视频检测、点云分割按 10% 抽检，重点核查边界与类别一致性。',
  },
]

/** 人员质量统计（演示伪造聚合） */
export const QUALITY_PERSON_STATS = [
  { userId: 'u-dl-annotator', name: '陈思远', role: 'annotator', done: 186, passRate: 0.94, rejectRate: 0.06, reworkRate: 0.08 },
  { userId: 'u-dl-annotator-2', name: '周可', role: 'annotator', done: 142, passRate: 0.91, rejectRate: 0.09, reworkRate: 0.11 },
  { userId: 'u-dl-reviewer', name: '林晓萱', role: 'reviewer', done: 98, passRate: 0.97, rejectRate: 0.03, reworkRate: 0.04 },
]

export const SPEC_SECTIONS = [
  {
    id: 'spec-1',
    title: '1. 通用原则',
    body: '工单标注须可复现、可审计。实体/框/切片边界以像素或时间轴刻度为准；不确定时标记「待确认」并留言批注，禁止臆造标签。',
  },
  {
    id: 'spec-2',
    title: '2. 文本实体抽取',
    body: 'PERSON/DATE/ORDER_ID/ADDRESS/PHONE 按最长匹配；脱敏号码保留前三后四形态；ORDER_ID 不含两侧空格（§3.2）。',
  },
  {
    id: 'spec-3',
    title: '3. 图像语义分割',
    body: '交叠物体沿可见轮廓切开；手与工具分属不同类别；背景不计入前景面积统计。',
  },
  {
    id: 'spec-4',
    title: '4. 语音切片',
    body: '切片起止避开呼吸声与噪声尖峰；唤醒词与任务指令分片；静音段 >0.3s 可独立标为噪声。',
  },
  {
    id: 'spec-5',
    title: '5. 视频目标检测',
    body: '关键帧必标；遮挡 >50% 仍可见主体则保留框；类别以可见外观为准。',
  },
  {
    id: 'spec-6',
    title: '6. 点云分割',
    body: '桌面平面优先；小物体独立簇；飞点归 noise；结果表须含点数与类别。',
  },
  {
    id: 'spec-7',
    title: '7. 抽检与回流',
    body: '抽检不合格须填写驳回原因；返修后重新进入初审。合格样本写入回流库，供训练集引用。',
  },
  {
    id: 'spec-8',
    title: '8. 标签体系（Taxonomy）',
    body: '文本：PERSON/DATE/ORDER_ID/ADDRESS/PHONE/ORG。视觉：box_A/box_B/gripper/conveyor/person。语音：唤醒词/任务指令/确认/结束语/噪声。点云：table_plane/object_*/robot_arm/noise。VLA：REACH/GRASP/LIFT/MOVE/PLACE/RETREAT。禁止自由造词，跨模态同义词须登记映射表。',
  },
  {
    id: 'spec-9',
    title: '9. 视频轨迹与多边形',
    body: '同一物理目标跨帧复用 trackId；不规则目标可用 polygon，并保留外包 bbox。接触/释放关键帧必标。',
  },
]

export function createInitialSamplePool(tasks = []) {
  const hand = [
    {
      id: 'SPL-DL-1001',
      taskId: 'DL-2026-1101-0204',
      modality: 'text_ner',
      status: 'pending',
      reason: null,
      title: '文本NER样本 #1001',
    },
    {
      id: 'SPL-DL-1002',
      taskId: 'DL-2026-1101-0204',
      modality: 'text_ner',
      status: 'pending',
      reason: null,
      title: '文本NER样本 #1002',
    },
    {
      id: 'SPL-DL-2101',
      taskId: 'DL-2026-1104-0318',
      modality: 'seg',
      status: 'pending',
      reason: null,
      title: '语义分割样本 #2101',
    },
    {
      id: 'SPL-DL-2102',
      taskId: 'DL-2026-1104-0318',
      modality: 'seg',
      status: 'pending',
      reason: null,
      title: '语义分割样本 #2102',
    },
    {
      id: 'SPL-DL-3201',
      taskId: 'DL-2026-1103-0288',
      modality: 'audio_slice',
      status: 'pending',
      reason: null,
      title: '语音切片样本 #3201',
    },
    {
      id: 'SPL-DL-4301',
      taskId: 'DL-2026-1102-0251',
      modality: 'video_det',
      status: 'pending',
      reason: null,
      title: '视频检测样本 #4301',
    },
    {
      id: 'SPL-DL-5401',
      taskId: 'DL-2026-1104-0330',
      modality: 'point_seg',
      status: 'pending',
      reason: null,
      title: '点云分割样本 #5401',
    },
    {
      id: 'SPL-DL-5402',
      taskId: 'DL-2026-1104-0330',
      modality: 'point_seg',
      status: 'pass',
      reason: null,
      title: '点云分割样本 #5402',
      refluxed: false,
    },
  ]
  try {
    return seedSamplePool(hand, tasks)
  } catch (e) {
    console.error('[datalink] sample pool seed failed, fallback thin', e)
    return hand
  }
}
