/** StarCompute QC mock: multimodal tickets, workflow, sample-check. */

export const MODALITIES = [
  { value: 'text_ner', label: '文本实体抽取', short: '文本NER' },
  { value: 'seg', label: '图像语义分割', short: '图像分割' },
  { value: 'audio_slice', label: '语音切片', short: '语音切片' },
  { value: 'video_det', label: '视频目标检测', short: '视频检测' },
  { value: 'point_seg', label: '点云分割', short: '点云分割' },
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

/** Sample media + annotation payloads per modality (desensitized). */
export const SAMPLE_RESOURCES = {
  text_ner: {
    id: 'res-text-01',
    title: '客服工单原文-脱敏',
    text:
      '用户张某于2026年10月28日致电反映：订单 SC-ORD-8821 物流延误，希望改派至上海市浦东新区张江路88号，联系电话138****6521。客服已登记并承诺48小时内回电。',
    entities: [
      { id: 'e1', text: '张某', type: 'PERSON', start: 2, end: 4 },
      { id: 'e2', text: '2026年10月28日', type: 'DATE', start: 5, end: 16 },
      { id: 'e3', text: 'SC-ORD-8821', type: 'ORDER_ID', start: 24, end: 35 },
      { id: 'e4', text: '上海市浦东新区张江路88号', type: 'ADDRESS', start: 44, end: 58 },
      { id: 'e5', text: '138****6521', type: 'PHONE', start: 63, end: 74 },
    ],
    labelSet: ['PERSON', 'DATE', 'ORDER_ID', 'ADDRESS', 'PHONE', 'ORG'],
  },
  seg: {
    id: 'res-img-01',
    title: '桌面抓取场景-语义分割',
    imageUrl: '/samples/images/desk_seg.jpg',
    masks: [
      { id: 'm1', label: 'cup', color: '#1677ff', area: 0.12, conf: 0.93 },
      { id: 'm2', label: 'plate', color: '#52c41a', area: 0.18, conf: 0.91 },
      { id: 'm3', label: 'hand', color: '#fa8c16', area: 0.09, conf: 0.88 },
      { id: 'm4', label: 'table', color: '#722ed1', area: 0.41, conf: 0.96 },
    ],
    labelSet: ['cup', 'plate', 'hand', 'table', 'background', 'tool'],
  },
  audio_slice: {
    id: 'res-audio-01',
    title: '指令语音-切片样例',
    audioUrl: '/samples/audio/instruction.wav',
    waveformUrl: '/samples/audio/instruction_wave.png',
    durationSec: 4.7,
    slices: [
      { id: 's1', start: 0.2, end: 1.0, label: '唤醒词', text: '你好数联' },
      { id: 's2', start: 1.1, end: 2.6, label: '任务指令', text: '请把红色杯子放到托盘上' },
      { id: 's3', start: 2.7, end: 3.4, label: '确认', text: '是的，红色那个' },
      { id: 's4', start: 3.6, end: 4.5, label: '结束语', text: '完成后来告诉我' },
    ],
    labelSet: ['唤醒词', '任务指令', '确认', '结束语', '噪声', '其他'],
  },
  video_det: {
    id: 'res-video-01',
    title: '料箱分拣-目标检测',
    posterUrl: '/samples/video/bin_pick_poster.jpg',
    videoUrl: '/samples/video/bin_pick.mp4',
    fps: 30,
    frames: 180,
    detections: [
      { id: 'd1', frame: 12, label: 'box_A', x: 0.12, y: 0.2, w: 0.18, h: 0.22, conf: 0.91 },
      { id: 'd2', frame: 45, label: 'gripper', x: 0.4, y: 0.35, w: 0.15, h: 0.2, conf: 0.87 },
      { id: 'd3', frame: 90, label: 'box_B', x: 0.55, y: 0.28, w: 0.2, h: 0.25, conf: 0.9 },
      { id: 'd4', frame: 140, label: 'conveyor', x: 0.05, y: 0.65, w: 0.9, h: 0.25, conf: 0.95 },
    ],
    labelSet: ['box_A', 'box_B', 'gripper', 'conveyor', 'person', 'other'],
  },
  point_seg: {
    id: 'res-pc-01',
    title: '桌面点云分割预览',
    previewUrl: '/samples/pointcloud/desk_pc.png',
    points: 128460,
    segments: [
      { id: 'p1', label: 'table_plane', points: 62400, color: '#13c2c2' },
      { id: 'p2', label: 'object_cup', points: 8420, color: '#1677ff' },
      { id: 'p3', label: 'object_bottle', points: 12100, color: '#eb2f96' },
      { id: 'p4', label: 'noise', points: 3180, color: '#8c8c8c' },
    ],
    labelSet: ['table_plane', 'object_cup', 'object_bottle', 'robot_arm', 'noise'],
  },
}

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

/** In-memory mutable store seeded once. */
export function createInitialTasks() {
  return [
    {
      id: 'SC-2026-1104-0312',
      title: '客服工单实体抽取返修',
      modality: 'text_ner',
      status: 'annotating',
      priority: 'high',
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
      priority: 'medium',
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
      priority: 'high',
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
      priority: 'high',
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
      priority: 'medium',
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
      priority: 'low',
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
]

export function createInitialSamplePool() {
  return [
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
}
