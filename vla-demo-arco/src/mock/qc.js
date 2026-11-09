import { seedQcTasks, seedSamplePool } from './seed/qc'
/** StarCompute QC mock: multimodal tickets, workflow, sample-check. */

export const MODALITIES = [
  { value: 'text_ner', label: '巡检告警 NER', short: '多租户 · 告警单', hint: 'SITE / ALERT / ASSET' },
  { value: 'seg', label: '卡口画面分割', short: '安防 RGB · Mask', hint: '行人 / 门禁 / 包裹' },
  { value: 'audio_slice', label: '对讲电台切片', short: '调度语音 · 切片', hint: '呼叫号 / 确认码' },
  { value: 'video_det', label: '路侧目标检测', short: '巡检视频 · Track', hint: '车 / 人 / 路障' },
  { value: 'point_seg', label: '路缘 LiDAR 分割', short: 'Curb Sweep', hint: '路面 / 路缘 / 车辆' },
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

export const SLA_CLASSES = [
  { value: 'S', label: 'S级' },
  { value: 'A', label: 'A级' },
  { value: 'B', label: 'B级' },
]

export const TENANTS = [
  { value: 'tn-sc-01', label: '租户 tn-sc-01' },
  { value: 'tn-sc-02', label: '租户 tn-sc-02' },
  { value: 'tn-sc-03', label: '租户 tn-sc-03' },
]

/** Sample media — StarCompute 安防巡检 / 多租户域 */
export const SAMPLE_RESOURCES = {
  text_ner: {
    id: 'res-text-01',
    title: '巡检告警单 · tn-sc-02',
    domain: 'security-ticket',
    text:
      '租户 tn-sc-02 巡检告警：站点 SC-GATE-北门 于 2026-11-06 21:40 触发 ALERT-INTRUSION，关联资产 CAM-12B，值班员周凯已签收。',
    entities: [
      { id: 'e1', text: 'tn-sc-02', type: 'TENANT', start: 3, end: 11 },
      { id: 'e2', text: 'SC-GATE-北门', type: 'SITE', start: 20, end: 30 },
      { id: 'e3', text: '2026-11-06 21:40', type: 'TIMESTAMP', start: 33, end: 49 },
      { id: 'e4', text: 'ALERT-INTRUSION', type: 'ALERT', start: 53, end: 68 },
      { id: 'e5', text: 'CAM-12B', type: 'ASSET', start: 74, end: 81 },
      { id: 'e6', text: '周凯', type: 'OPERATOR', start: 85, end: 87 },
    ],
    relations: [
      { id: 'r1', type: '归属租户', subj: 'e2', obj: 'e1' },
      { id: 'r2', type: '触发告警', subj: 'e2', obj: 'e4' },
      { id: 'r3', type: '关联资产', subj: 'e4', obj: 'e5' },
    ],
    labelSet: ['TENANT', 'SITE', 'TIMESTAMP', 'ALERT', 'ASSET', 'OPERATOR'],
    relationTypes: ['归属租户', '触发告警', '关联资产', '值班签收'],
  },
  seg: {
    id: 'res-img-01',
    title: '卡口画面分割 · 北门闸机',
    domain: 'security-rgb',
    imageUrl: '/samples/images/scene_05.jpg',
    masks: [
      {
        id: 'm1',
        label: 'pedestrian',
        color: '#4ade80',
        area: 0.1,
        conf: 0.92,
        polygon: [
          [0.3, 0.2],
          [0.4, 0.18],
          [0.42, 0.62],
          [0.28, 0.64],
        ],
      },
      {
        id: 'm2',
        label: 'gate',
        color: '#c084fc',
        area: 0.18,
        conf: 0.9,
        polygon: [
          [0.5, 0.15],
          [0.78, 0.12],
          [0.8, 0.7],
          [0.48, 0.72],
        ],
      },
      {
        id: 'm3',
        label: 'package',
        color: '#f87171',
        area: 0.06,
        conf: 0.86,
        polygon: [
          [0.12, 0.55],
          [0.26, 0.54],
          [0.27, 0.72],
          [0.11, 0.73],
        ],
      },
      {
        id: 'm4',
        label: 'road',
        color: '#67e8f9',
        area: 0.28,
        conf: 0.95,
        polygon: [
          [0.02, 0.7],
          [0.98, 0.68],
          [0.99, 0.98],
          [0.01, 0.99],
        ],
      },
    ],
    labelSet: ['pedestrian', 'gate', 'package', 'road', 'vehicle', 'other'],
  },
  audio_slice: {
    id: 'res-audio-01',
    title: '调度对讲切片 · 北门频道',
    domain: 'security-radio',
    audioUrl: '/samples/audio/clip_03.wav',
    waveformUrl: '/samples/audio/clip_03_wave.png',
    durationSec: 1.3,
    wavePeaks: Array.from({ length: 64 }, (_, i) => {
      const t = i / 64
      return Math.min(1, Math.abs(Math.sin(t * 22) * 0.6 + Math.sin(t * 5) * 0.3) + (t > 0.15 && t < 0.7 ? 0.2 : 0.04))
    }),
    slices: [
      { id: 's1', start: 0.05, end: 0.35, label: '呼叫号', text: '北门一号呼叫中心', speaker: 'SPK_GATE' },
      { id: 's2', start: 0.4, end: 0.85, label: '告警描述', text: '可疑包裹滞留闸机外侧', speaker: 'SPK_GATE' },
      { id: 's3', start: 0.9, end: 1.2, label: '确认码', text: '收到，派员核查', speaker: 'SPK_CMD' },
    ],
    labelSet: ['呼叫号', '告警描述', '确认码', '噪声', '其他'],
    speakers: ['SPK_GATE', 'SPK_CMD', 'SPK_PATROL'],
  },
  video_det: {
    id: 'res-video-01',
    title: '路侧巡检检测 · EP-06',
    domain: 'security-video',
    posterUrl: '/samples/video/ep_06_poster.jpg',
    videoUrl: '/samples/video/ep_06.mp4',
    fps: 25,
    frames: 120,
    keyFrames: [10, 35, 70, 100],
    detections: [
      { id: 'd1', frame: 10, trackId: 'T-car', label: 'vehicle', x: 0.55, y: 0.35, w: 0.28, h: 0.22, conf: 0.94 },
      { id: 'd1b', frame: 35, trackId: 'T-car', label: 'vehicle', x: 0.4, y: 0.38, w: 0.26, h: 0.21, conf: 0.92 },
      { id: 'd2', frame: 35, trackId: 'T-ped', label: 'pedestrian', x: 0.18, y: 0.4, w: 0.08, h: 0.28, conf: 0.89 },
      { id: 'd3', frame: 70, trackId: 'T-barrier', label: 'barrier', x: 0.62, y: 0.55, w: 0.2, h: 0.15, conf: 0.87 },
      { id: 'd4', frame: 100, trackId: 'T-ped', label: 'pedestrian', x: 0.3, y: 0.42, w: 0.07, h: 0.26, conf: 0.9 },
    ],
    labelSet: ['vehicle', 'pedestrian', 'barrier', 'package', 'other'],
  },
  point_seg: {
    id: 'res-pc-01',
    title: '路缘 LiDAR 扫描 · 北门外侧',
    domain: 'security-lidar',
    previewUrl: '/samples/pointcloud/curb_lidar.svg',
    points: 210500,
    clusters: [
      { id: 'p1', label: 'road_plane', color: '#67e8f9', center: [0, -0.4, 0], spread: [1.0, 0.04, 0.8], count: 480 },
      { id: 'p2', label: 'curb', color: '#c084fc', center: [-0.35, -0.15, 0.1], spread: [0.35, 0.06, 0.12], count: 120 },
      { id: 'p3', label: 'vehicle', color: '#f87171', center: [0.4, 0.05, -0.1], spread: [0.22, 0.14, 0.18], count: 160 },
      { id: 'p4', label: 'pedestrian', color: '#4ade80', center: [-0.55, 0.15, 0.2], spread: [0.06, 0.22, 0.06], count: 70 },
      { id: 'p5', label: 'noise', color: '#94a3b8', center: [0.75, 0.45, -0.4], spread: [0.12, 0.12, 0.12], count: 35 },
    ],
    segments: [
      { id: 'p1', label: 'road_plane', points: 98000, color: '#67e8f9' },
      { id: 'p2', label: 'curb', points: 22000, color: '#c084fc' },
      { id: 'p3', label: 'vehicle', points: 34000, color: '#f87171' },
      { id: 'p4', label: 'pedestrian', points: 8600, color: '#4ade80' },
      { id: 'p5', label: 'noise', points: 4100, color: '#94a3b8' },
    ],
    labelSet: ['road_plane', 'curb', 'vehicle', 'pedestrian', 'noise'],
  },
}

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

/** In-memory mutable store seeded once. */
export function createInitialTasks() {
  const hand = [
    {
      id: 'SC-2026-1104-0312',
      title: '客服工单实体抽取返修',
      modality: 'text_ner',
      status: 'annotating',
      slaClass: 'S',
      tenantCode: 'tn-sc-01',
      creatorId: 'u-sc-admin',
      assigneeId: 'u-sc-annotator',
      collaborators: ['u-sc-annotator', 'u-sc-annotator-2'],
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
          authorId: 'u-sc-reviewer',
          authorName: '林晓萱',
          body: 'ORDER_ID 边界请对齐空格，参考规范 §3.2。',
        },
        {
          id: 'c2',
          at: '2026-11-04 10:40:00',
          authorId: 'u-sc-annotator',
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
      labelsSnapshot: clone(SAMPLE_RESOURCES.text_ner.entities),
    },
    {
      id: 'SC-2026-1104-0318',
      title: '桌面抓取语义分割初标',
      modality: 'seg',
      status: 'reviewing',
      slaClass: 'A',
      tenantCode: 'tn-sc-02',
      creatorId: 'u-sc-admin',
      assigneeId: 'u-sc-annotator-2',
      collaborators: ['u-sc-annotator-2', 'u-sc-reviewer'],
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
          authorId: 'u-sc-annotator-2',
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
      labelsSnapshot: clone(SAMPLE_RESOURCES.seg.masks),
    },
    {
      id: 'SC-2026-1103-0288',
      title: '指令语音切片质检',
      modality: 'audio_slice',
      status: 'final_review',
      slaClass: 'S',
      tenantCode: 'tn-sc-01',
      creatorId: 'u-sc-admin',
      assigneeId: 'u-sc-annotator',
      collaborators: ['u-sc-annotator', 'u-sc-reviewer'],
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
          authorId: 'u-sc-reviewer',
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
      labelsSnapshot: clone(SAMPLE_RESOURCES.audio_slice.slices),
    },
    {
      id: 'SC-2026-1102-0251',
      title: '料箱分拣视频目标检测',
      modality: 'video_det',
      status: 'rejected',
      slaClass: 'S',
      tenantCode: 'tn-sc-01',
      creatorId: 'u-sc-admin',
      assigneeId: 'u-sc-annotator',
      collaborators: ['u-sc-annotator', 'u-sc-annotator-2', 'u-sc-reviewer'],
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
          authorId: 'u-sc-reviewer',
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
      labelsSnapshot: clone(SAMPLE_RESOURCES.video_det.detections),
    },
    {
      id: 'SC-2026-1104-0330',
      title: '桌面点云分割样例入库',
      modality: 'point_seg',
      status: 'assigned',
      slaClass: 'A',
      tenantCode: 'tn-sc-02',
      creatorId: 'u-sc-admin',
      assigneeId: 'u-sc-annotator-2',
      collaborators: ['u-sc-annotator-2'],
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
      labelsSnapshot: clone(SAMPLE_RESOURCES.point_seg.segments),
    },
    {
      id: 'SC-2026-1101-0204',
      title: '历史文本NER归档抽检',
      modality: 'text_ner',
      status: 'done',
      slaClass: 'B',
      tenantCode: 'tn-sc-03',
      creatorId: 'u-sc-admin',
      assigneeId: 'u-sc-annotator',
      collaborators: ['u-sc-annotator', 'u-sc-reviewer'],
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
      labelsSnapshot: clone(SAMPLE_RESOURCES.text_ner.entities),
      refluxed: true,
    },
  ]
  try {
    return seedQcTasks(hand)
  } catch (e) {
    console.error('[starcompute] qc seed failed, fallback thin', e)
    return hand.map((t) => ({
      ...t,
      slaClass: t.slaClass || 'A',
      tenantCode: t.tenantCode || 'tn-sc-01',
      reworkTrail: t.reworkTrail || [],
    }))
  }
}

export const SAMPLE_RULES = [
  {
    id: 'RULE-SC-01',
    name: '文本/语音高优批次抽检',
    ratio: 0.15,
    modalities: ['text_ner', 'audio_slice'],
    minSamples: 20,
    enabled: true,
    description: '对高优先级文本与语音工单按 15% 比例随机抽检，覆盖漏标与规范违反项。',
  },
  {
    id: 'RULE-SC-02',
    name: '视觉模态全量复核抽检',
    ratio: 0.1,
    modalities: ['seg', 'video_det', 'point_seg'],
    minSamples: 10,
    enabled: true,
    description: '图像分割、视频检测、点云分割按 10% 抽检，重点核查边界与类别一致性。',
  },
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
      id: 'SPL-SC-1001',
      taskId: 'SC-2026-1101-0204',
      modality: 'text_ner',
      status: 'pending',
      reason: null,
      title: '文本NER样本 #1001',
    },
    {
      id: 'SPL-SC-1002',
      taskId: 'SC-2026-1101-0204',
      modality: 'text_ner',
      status: 'pending',
      reason: null,
      title: '文本NER样本 #1002',
    },
    {
      id: 'SPL-SC-2101',
      taskId: 'SC-2026-1104-0318',
      modality: 'seg',
      status: 'pending',
      reason: null,
      title: '语义分割样本 #2101',
    },
    {
      id: 'SPL-SC-2102',
      taskId: 'SC-2026-1104-0318',
      modality: 'seg',
      status: 'pending',
      reason: null,
      title: '语义分割样本 #2102',
    },
    {
      id: 'SPL-SC-3201',
      taskId: 'SC-2026-1103-0288',
      modality: 'audio_slice',
      status: 'pending',
      reason: null,
      title: '语音切片样本 #3201',
    },
    {
      id: 'SPL-SC-4301',
      taskId: 'SC-2026-1102-0251',
      modality: 'video_det',
      status: 'pending',
      reason: null,
      title: '视频检测样本 #4301',
    },
    {
      id: 'SPL-SC-5401',
      taskId: 'SC-2026-1104-0330',
      modality: 'point_seg',
      status: 'pending',
      reason: null,
      title: '点云分割样本 #5401',
    },
    {
      id: 'SPL-SC-5402',
      taskId: 'SC-2026-1104-0330',
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
    console.error('[starcompute] sample pool seed failed, fallback thin', e)
    return hand
  }
}
