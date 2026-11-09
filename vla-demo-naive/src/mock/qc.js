import { seedQcTasks, seedSamplePool } from './seed/qc'
/** Lingmou QC mock: multimodal tickets, workflow, sample-check. */

export const MODALITIES = [
  { value: 'text_ner', label: '具身任务日志 NER', short: 'EIDE · 指令实体', hint: 'ACTION / OBJECT / LOC' },
  { value: 'seg', label: '台面物体分割', short: '具身 RGB · Mask', hint: 'mug / tray / arm' },
  { value: 'audio_slice', label: 'VLA 语音指令', short: '灵眸唤醒 · 切片', hint: '任务句 / 确认回声' },
  { value: 'video_det', label: '抓取过程检测', short: 'Episode · Track', hint: '夹爪轨迹 / 目标物' },
  { value: 'point_seg', label: '岛台点云分割', short: 'Kitchen Scan', hint: '台面 / 杯 / 臂' },
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

export const URGENCIES = [
  { value: 'urgent', label: '紧急' },
  { value: 'normal', label: '普通' },
  { value: 'backlog', label: '积压' },
]

export const LANES = [
  { value: 'lane-alpha', label: 'Lane Alpha' },
  { value: 'lane-beta', label: 'Lane Beta' },
  { value: 'lane-gamma', label: 'Lane Gamma' },
]

/** Sample media — Lingmou EIDE 具身智能域 */
export const SAMPLE_RESOURCES = {
  text_ner: {
    id: 'res-text-01',
    title: '具身任务日记 · Lane Alpha',
    domain: 'embodied-log',
    text:
      '任务日记：灵眸于 2026-11-05 09:12 执行「把蓝色马克杯放到托盘」。对象 mug-blue，位置 island-left，结果 SUCCESS。指令号 LM-ACT-441。',
    entities: [
      { id: 'e1', text: '灵眸', type: 'AGENT', start: 5, end: 7 },
      { id: 'e2', text: '2026-11-05 09:12', type: 'TIMESTAMP', start: 9, end: 25 },
      { id: 'e3', text: '把蓝色马克杯放到托盘', type: 'ACTION', start: 29, end: 39 },
      { id: 'e4', text: 'mug-blue', type: 'OBJECT', start: 44, end: 52 },
      { id: 'e5', text: 'island-left', type: 'LOC', start: 56, end: 67 },
      { id: 'e6', text: 'SUCCESS', type: 'STATUS', start: 71, end: 78 },
      { id: 'e7', text: 'LM-ACT-441', type: 'ACT_ID', start: 83, end: 93 },
    ],
    relations: [
      { id: 'r1', head: 'e1', tail: 'e3', type: 'EXECUTES' },
      { id: 'r2', head: 'e3', tail: 'e4', type: 'TARGETS' },
      { id: 'r3', head: 'e3', tail: 'e5', type: 'DEST_LOC' },
    ],
    labelSet: ['AGENT', 'TIMESTAMP', 'ACTION', 'OBJECT', 'LOC', 'STATUS', 'ACT_ID'],
  },
  seg: {
    id: 'res-img-01',
    title: '厨房岛台物体分割 · Episode',
    domain: 'embodied-rgb',
    imageUrl: '/samples/images/scene_03.jpg',
    masks: [
      { id: 'm1', label: 'mug', color: '#60a5fa', area: 0.09, conf: 0.94 },
      { id: 'm2', label: 'tray', color: '#f472b6', area: 0.15, conf: 0.91 },
      { id: 'm3', label: 'robot_arm', color: '#fbbf24', area: 0.12, conf: 0.9 },
      { id: 'm4', label: 'countertop', color: '#34d399', area: 0.36, conf: 0.97 },
    ],
    labelSet: ['mug', 'tray', 'robot_arm', 'countertop', 'sponge', 'other'],
  },
  audio_slice: {
    id: 'res-audio-01',
    title: 'VLA 语音指令 · 灵眸唤醒',
    domain: 'embodied-voice',
    audioUrl: '/samples/audio/instruction.wav',
    waveformUrl: '/samples/audio/instruction_wave.png',
    durationSec: 4.7,
    slices: [
      { id: 's1', start: 0.2, end: 0.9, label: '唤醒', text: '你好灵眸' },
      { id: 's2', start: 1.0, end: 2.8, label: '任务句', text: '把蓝色马克杯放到左侧托盘' },
      { id: 's3', start: 2.9, end: 3.6, label: '确认回声', text: '好的，正在执行' },
      { id: 's4', start: 3.8, end: 4.5, label: '完成提示', text: '已经放好了' },
    ],
    labelSet: ['唤醒', '任务句', '确认回声', '完成提示', '噪声', '其他'],
  },
  video_det: {
    id: 'res-video-01',
    title: '抓取过程检测 · EP-05',
    domain: 'embodied-video',
    posterUrl: '/samples/video/ep_05_poster.jpg',
    videoUrl: '/samples/video/ep_05.mp4',
    fps: 20,
    frames: 100,
    detections: [
      {
        id: 'd1',
        frame: 10,
        label: 'mug',
        trackId: 'trk-mug',
        shape: 'bbox',
        x: 0.22,
        y: 0.35,
        w: 0.12,
        h: 0.16,
        conf: 0.93,
      },
      {
        id: 'd2',
        frame: 28,
        label: 'gripper',
        trackId: 'trk-grip',
        shape: 'bbox',
        x: 0.4,
        y: 0.2,
        w: 0.14,
        h: 0.18,
        conf: 0.9,
      },
      {
        id: 'd3',
        frame: 55,
        label: 'tray',
        trackId: 'trk-tray',
        shape: 'polygon',
        x: 0.55,
        y: 0.5,
        w: 0.28,
        h: 0.2,
        conf: 0.92,
        polygon: [
          [0.55, 0.5],
          [0.83, 0.52],
          [0.82, 0.7],
          [0.54, 0.68],
        ],
      },
      {
        id: 'd4',
        frame: 78,
        label: 'mug',
        trackId: 'trk-mug',
        shape: 'bbox',
        x: 0.6,
        y: 0.52,
        w: 0.11,
        h: 0.15,
        conf: 0.91,
      },
    ],
    labelSet: ['mug', 'gripper', 'tray', 'hand', 'other'],
  },
  point_seg: {
    id: 'res-pc-01',
    title: '岛台点云扫描 · Kitchen',
    domain: 'embodied-lidar',
    previewUrl: '/samples/pointcloud/kitchen_scan.svg',
    points: 142300,
    segments: [
      { id: 'p1', label: 'countertop', points: 68000, color: '#34d399' },
      { id: 'p2', label: 'mug', points: 7200, color: '#60a5fa' },
      { id: 'p3', label: 'tray', points: 11800, color: '#f472b6' },
      { id: 'p4', label: 'robot_arm', points: 24600, color: '#fbbf24' },
      { id: 'p5', label: 'noise', points: 2800, color: '#6b7280' },
    ],
    labelSet: ['countertop', 'mug', 'tray', 'robot_arm', 'noise'],
  },
}

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

/** In-memory mutable store seeded once. */

export function createInitialTasks() {
  const hand = [
    {
      id: 'LM-2026-1104-0312',
      title: '客服工单实体抽取返修',
      modality: 'text_ner',
      status: 'annotating',
      urgency: 'urgent',
      lane: 'lane-alpha',
      creatorId: 'u-lm-admin',
      assigneeId: 'u-lm-annotator',
      collaborators: ['u-lm-annotator', 'u-lm-annotator-2'],
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
          authorId: 'u-lm-reviewer',
          authorName: '林晓萱',
          body: 'ORDER_ID 边界请对齐空格，参考规范 §3.2。',
        },
        {
          id: 'c2',
          at: '2026-11-04 10:40:00',
          authorId: 'u-lm-annotator',
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
      id: 'LM-2026-1104-0318',
      title: '桌面抓取语义分割初标',
      modality: 'seg',
      status: 'reviewing',
      urgency: 'normal',
      lane: 'lane-beta',
      creatorId: 'u-lm-admin',
      assigneeId: 'u-lm-annotator-2',
      collaborators: ['u-lm-annotator-2', 'u-lm-reviewer'],
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
          authorId: 'u-lm-annotator-2',
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
      id: 'LM-2026-1103-0288',
      title: '指令语音切片质检',
      modality: 'audio_slice',
      status: 'final_review',
      urgency: 'urgent',
      lane: 'lane-alpha',
      creatorId: 'u-lm-admin',
      assigneeId: 'u-lm-annotator',
      collaborators: ['u-lm-annotator', 'u-lm-reviewer'],
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
          authorId: 'u-lm-reviewer',
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
      id: 'LM-2026-1102-0251',
      title: '料箱分拣视频目标检测',
      modality: 'video_det',
      status: 'rejected',
      urgency: 'urgent',
      lane: 'lane-alpha',
      creatorId: 'u-lm-admin',
      assigneeId: 'u-lm-annotator',
      collaborators: ['u-lm-annotator', 'u-lm-annotator-2', 'u-lm-reviewer'],
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
          authorId: 'u-lm-reviewer',
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
      id: 'LM-2026-1104-0330',
      title: '桌面点云分割样例入库',
      modality: 'point_seg',
      status: 'assigned',
      urgency: 'normal',
      lane: 'lane-beta',
      creatorId: 'u-lm-admin',
      assigneeId: 'u-lm-annotator-2',
      collaborators: ['u-lm-annotator-2'],
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
      id: 'LM-2026-1101-0204',
      title: '历史文本NER归档抽检',
      modality: 'text_ner',
      status: 'done',
      urgency: 'backlog',
      lane: 'lane-gamma',
      creatorId: 'u-lm-admin',
      assigneeId: 'u-lm-annotator',
      collaborators: ['u-lm-annotator', 'u-lm-reviewer'],
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
    console.error('[lingmou] qc seed failed, fallback thin', e)
    return hand.map((t) => ({
      ...t,
      urgency: t.urgency || 'normal',
      lane: t.lane || 'lane-alpha',
      bounceLog: t.bounceLog || [],
    }))
  }
}

export const SAMPLE_RULES = [
  {
    id: 'RULE-LM-01',
    name: '文本/语音高优批次抽检',
    ratio: 0.15,
    modalities: ['text_ner', 'audio_slice'],
    minSamples: 20,
    enabled: true,
    description: '对高优先级文本与语音工单按 15% 比例随机抽检，覆盖漏标与规范违反项。',
  },
  {
    id: 'RULE-LM-02',
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
    body: '抽检不合格须填写驳回原因并写入 bounceLog；返修后重新进入初审。合格样本写入回流库，供训练侧 corpora 引用。',
  },
  {
    id: 'spec-8',
    title: '8. 标签体系（Taxonomy）',
    body: '文本：PERSON/DATE/ORDER_ID/ADDRESS/PHONE/ORG。视觉：box_A/box_B/gripper/conveyor/person。语音：唤醒词/任务指令/确认/结束语/噪声。点云：table_plane/object_*/robot_arm/noise。VLA 动作：REACH/GRASP/LIFT/MOVE/PLACE/RETREAT/OPEN/WIPE。跨模态标签须登记同义词映射表，禁止自由造词。',
  },
  {
    id: 'spec-9',
    title: '9. 视频轨迹与多边形',
    body: '同一物理目标跨帧须复用 trackId；遮挡重现时沿用原 trackId。不规则目标可用 polygon（归一化顶点），同时保留外包 bbox 供列表展示。关键帧（接触/释放）必须标注。',
  },
]

export function createInitialSamplePool(tasks = []) {
  const hand = [
    {
      id: 'SPL-LM-1001',
      taskId: 'LM-2026-1101-0204',
      modality: 'text_ner',
      status: 'pending',
      reason: null,
      title: '文本NER样本 #1001',
    },
    {
      id: 'SPL-LM-1002',
      taskId: 'LM-2026-1101-0204',
      modality: 'text_ner',
      status: 'pending',
      reason: null,
      title: '文本NER样本 #1002',
    },
    {
      id: 'SPL-LM-2101',
      taskId: 'LM-2026-1104-0318',
      modality: 'seg',
      status: 'pending',
      reason: null,
      title: '语义分割样本 #2101',
    },
    {
      id: 'SPL-LM-2102',
      taskId: 'LM-2026-1104-0318',
      modality: 'seg',
      status: 'pending',
      reason: null,
      title: '语义分割样本 #2102',
    },
    {
      id: 'SPL-LM-3201',
      taskId: 'LM-2026-1103-0288',
      modality: 'audio_slice',
      status: 'pending',
      reason: null,
      title: '语音切片样本 #3201',
    },
    {
      id: 'SPL-LM-4301',
      taskId: 'LM-2026-1102-0251',
      modality: 'video_det',
      status: 'pending',
      reason: null,
      title: '视频检测样本 #4301',
    },
    {
      id: 'SPL-LM-5401',
      taskId: 'LM-2026-1104-0330',
      modality: 'point_seg',
      status: 'pending',
      reason: null,
      title: '点云分割样本 #5401',
    },
    {
      id: 'SPL-LM-5402',
      taskId: 'LM-2026-1104-0330',
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
    console.error('[lingmou] sample pool seed failed, fallback thin', e)
    return hand
  }
}
