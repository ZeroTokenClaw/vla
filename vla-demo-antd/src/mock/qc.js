import { seedQcTasks, seedSamplePool } from './seed/qc'

/** Orion Annotate QC mock: multimodal tickets, workflow, sample-check. */

export const MODALITIES = [
  { value: 'text_ner', label: 'Cell Incident NER', short: 'WS-SG · Ticket', hint: 'Robot cell / Part / Site' },
  { value: 'seg', label: 'Fixture Masking', short: 'RGB · Workpiece', hint: 'jig / EE / fixture' },
  { value: 'audio_slice', label: 'Operator VO Slice', short: 'EN Wake · Clip', hint: 'Hey Orion commands' },
  { value: 'video_det', label: 'Line Cam Tracking', short: 'EP video · BBox', hint: 'part / gripper tracks' },
  { value: 'point_seg', label: 'Assembly LiDAR', short: '3D Cell Scan', hint: 'jig plane / EE cloud' },
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

export const SEVERITIES = [
  { value: 'P0', label: 'P0' },
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
]

export const WORKSPACES = [
  { value: 'ws-sg', label: 'Singapore' },
  { value: 'ws-eu', label: 'Europe' },
  { value: 'ws-us', label: 'US' },
]

/** Sample media — Orion 产线机器人域（多站点英文混排） */
export const SAMPLE_RESOURCES = {
  text_ner: {
    id: 'res-text-01',
    title: 'Cell Incident Ticket · SG-07',
    domain: 'robot-cell',
    text:
      'Operator Lim reported at 2026-11-02 14:18 that Cell ORN-CELL-SG07 stopped: Part SKU-AX-441 jammed in fixture F-2. Site Singapore Bay. Escalate to L2.',
    entities: [
      { id: 'e1', text: 'Lim', type: 'OPERATOR', start: 9, end: 12 },
      { id: 'e2', text: '2026-11-02 14:18', type: 'TIMESTAMP', start: 25, end: 41 },
      { id: 'e3', text: 'ORN-CELL-SG07', type: 'CELL_ID', start: 52, end: 65 },
      { id: 'e4', text: 'SKU-AX-441', type: 'PART_SKU', start: 80, end: 90 },
      { id: 'e5', text: 'F-2', type: 'FIXTURE', start: 109, end: 112 },
      { id: 'e6', text: 'Singapore Bay', type: 'SITE', start: 119, end: 132 },
    ],
    labelSet: ['OPERATOR', 'TIMESTAMP', 'CELL_ID', 'PART_SKU', 'FIXTURE', 'SITE', 'SEVERITY'],
  },
  seg: {
    id: 'res-img-01',
    title: 'Assembly Fixture Mask · Station B',
    domain: 'cell-rgb',
    imageUrl: '/samples/images/desk_grasp.jpg',
    masks: [
      { id: 'm1', label: 'workpiece', color: '#818cf8', area: 0.11, conf: 0.94 },
      { id: 'm2', label: 'fixture', color: '#a3e635', area: 0.16, conf: 0.91 },
      { id: 'm3', label: 'end_effector', color: '#fb923c', area: 0.08, conf: 0.89 },
      { id: 'm4', label: 'jig_base', color: '#22d3ee', area: 0.33, conf: 0.96 },
    ],
    labelSet: ['workpiece', 'fixture', 'end_effector', 'jig_base', 'cable', 'other'],
  },
  audio_slice: {
    id: 'res-audio-01',
    title: 'Operator Voice · EN wake',
    domain: 'cell-voice',
    audioUrl: '/samples/audio/clip_02.wav',
    waveformUrl: '/samples/audio/clip_02_wave.png',
    durationSec: 1.2,
    slices: [
      { id: 's1', start: 0.05, end: 0.32, label: 'wake', text: 'Hey Orion' },
      { id: 's2', start: 0.35, end: 0.85, label: 'command', text: 'release clamp on fixture F-2' },
      { id: 's3', start: 0.9, end: 1.15, label: 'ack', text: 'confirmed' },
    ],
    labelSet: ['wake', 'command', 'ack', 'noise', 'other'],
  },
  video_det: {
    id: 'res-video-01',
    title: 'Line Camera Tracking · EP-04',
    domain: 'cell-video',
    posterUrl: '/samples/video/ep_04_poster.jpg',
    videoUrl: '/samples/video/ep_04.mp4',
    fps: 30,
    frames: 60,
    detections: [
      { id: 'd1', frame: 5, label: 'workpiece', x: 0.28, y: 0.3, w: 0.16, h: 0.18, conf: 0.92, trackId: 'T-part' },
      { id: 'd2', frame: 18, label: 'end_effector', x: 0.45, y: 0.15, w: 0.14, h: 0.2, conf: 0.9, trackId: 'T-ee' },
      { id: 'd3', frame: 32, label: 'fixture', x: 0.2, y: 0.48, w: 0.35, h: 0.28, conf: 0.94, trackId: 'T-fix' },
      { id: 'd4', frame: 48, label: 'workpiece', x: 0.5, y: 0.35, w: 0.15, h: 0.17, conf: 0.88, trackId: 'T-part' },
    ],
    labelSet: ['workpiece', 'end_effector', 'fixture', 'human', 'other'],
  },
  point_seg: {
    id: 'res-pc-01',
    title: 'Assembly Cell LiDAR · SG-07',
    domain: 'cell-lidar',
    previewUrl: '/samples/pointcloud/assembly_cell.svg',
    points: 152880,
    segments: [
      { id: 'p1', label: 'jig_plane', points: 58000, color: '#22d3ee' },
      { id: 'p2', label: 'workpiece', points: 12600, color: '#818cf8' },
      { id: 'p3', label: 'end_effector', points: 21400, color: '#fb923c' },
      { id: 'p4', label: 'fixture', points: 9800, color: '#a3e635' },
      { id: 'p5', label: 'noise', points: 3600, color: '#64748b' },
    ],
    labelSet: ['jig_plane', 'workpiece', 'end_effector', 'fixture', 'noise'],
  },
}

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

/** In-memory mutable store seeded once. */
export function createInitialTasks() {
  const hand = [
    {
      id: 'ORN-JOB-2026-1104-0312',
      title: '客服工单实体抽取返修',
      modality: 'text_ner',
      status: 'annotating',
      severity: 'P0',
      workspace: 'ws-sg',
      creatorId: 'u-orn-admin',
      assigneeId: 'u-orn-annotator',
      collaborators: ['u-orn-annotator', 'u-orn-annotator-2'],
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
          authorId: 'u-orn-reviewer',
          authorName: '林晓萱',
          body: 'ORDER_ID 边界请对齐空格，参考规范 §3.2。',
        },
        {
          id: 'c2',
          at: '2026-11-04 10:40:00',
          authorId: 'u-orn-annotator',
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
      id: 'ORN-JOB-2026-1104-0318',
      title: '桌面抓取语义分割初标',
      modality: 'seg',
      status: 'reviewing',
      severity: 'P1',
      workspace: 'ws-eu',
      creatorId: 'u-orn-admin',
      assigneeId: 'u-orn-annotator-2',
      collaborators: ['u-orn-annotator-2', 'u-orn-reviewer'],
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
          authorId: 'u-orn-annotator-2',
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
      id: 'ORN-JOB-2026-1103-0288',
      title: '指令语音切片质检',
      modality: 'audio_slice',
      status: 'final_review',
      severity: 'P0',
      workspace: 'ws-sg',
      creatorId: 'u-orn-admin',
      assigneeId: 'u-orn-annotator',
      collaborators: ['u-orn-annotator', 'u-orn-reviewer'],
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
          authorId: 'u-orn-reviewer',
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
      id: 'ORN-JOB-2026-1102-0251',
      title: '料箱分拣视频目标检测',
      modality: 'video_det',
      status: 'rejected',
      severity: 'P0',
      workspace: 'ws-sg',
      creatorId: 'u-orn-admin',
      assigneeId: 'u-orn-annotator',
      collaborators: ['u-orn-annotator', 'u-orn-annotator-2', 'u-orn-reviewer'],
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
          authorId: 'u-orn-reviewer',
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
      id: 'ORN-JOB-2026-1104-0330',
      title: '桌面点云分割样例入库',
      modality: 'point_seg',
      status: 'assigned',
      severity: 'P1',
      workspace: 'ws-eu',
      creatorId: 'u-orn-admin',
      assigneeId: 'u-orn-annotator-2',
      collaborators: ['u-orn-annotator-2'],
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
      id: 'ORN-JOB-2026-1101-0204',
      title: '历史文本NER归档抽检',
      modality: 'text_ner',
      status: 'done',
      severity: 'P2',
      workspace: 'ws-us',
      creatorId: 'u-orn-admin',
      assigneeId: 'u-orn-annotator',
      collaborators: ['u-orn-annotator', 'u-orn-reviewer'],
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
    console.error('[orion] qc seed failed, fallback thin', e)
    return hand.map((t) => ({
      ...t,
      severity: t.severity || 'P1',
      workspace: t.workspace || 'ws-sg',
      rejectionTrail: t.rejectionTrail || [],
    }))
  }
}


export const SAMPLE_RULES = [
  {
    id: 'RULE-ORN-01',
    name: '文本/语音高 severity 批次抽检',
    ratio: 0.15,
    modalities: ['text_ner', 'audio_slice'],
    minSamples: 20,
    enabled: true,
    description: '对 P0/P1 文本与语音工单按 15% 比例随机抽检，覆盖漏标与规范违反项。',
  },
  {
    id: 'RULE-ORN-02',
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
    body: 'Orion 工单标注须可复现、可审计。实体/框/切片边界以像素或时间轴刻度为准；不确定时标记「待确认」并留言批注，禁止臆造标签。',
    checklist: ['可复现边界', '批注必留痕', '禁止臆造标签'],
    examples: ['正确：实体边界贴合字符像素', '错误：凭经验补全被裁切文字'],
    rejectCodes: ['boundary_guess', 'missing_comment'],
  },
  {
    id: 'spec-2',
    title: '2. 文本实体抽取',
    body: 'PERSON/DATE/ORDER_ID/ADDRESS/PHONE 按最长匹配；脱敏号码保留前三后四形态；ORDER_ID 不含两侧空格（§3.2）。',
    checklist: ['最长匹配', '脱敏形态', '实体类型互斥'],
    examples: ['138****5678 → PHONE', 'ORD-20261109-88 → ORDER_ID'],
    rejectCodes: ['entity_overlap', 'phone_format'],
  },
  {
    id: 'spec-3',
    title: '3. 图像语义分割',
    body: '交叠物体沿可见轮廓切开；手与工具分属不同类别；背景不计入前景面积统计。',
    checklist: ['可见轮廓切开', '人手/工具分离', '背景不计入'],
    examples: ['手握扳手：hand + wrench 两多边形'],
    rejectCodes: ['mask_bleed', 'class_merge'],
  },
  {
    id: 'spec-4',
    title: '4. 语音切片',
    body: '切片起止避开呼吸声与噪声尖峰；唤醒词与任务指令分片；静音段 >0.3s 可独立标为噪声。',
    checklist: ['避开呼吸尖峰', '唤醒词独立', '静音可标噪声'],
    examples: ['「小奥，把红盒放到托盘」→ wake + instruction 两片'],
    rejectCodes: ['slice_noise', 'wake_merge'],
  },
  {
    id: 'spec-5',
    title: '5. 视频目标检测',
    body: '关键帧必标；遮挡 >50% 仍可见主体则保留框；类别以可见外观为准。',
    checklist: ['关键帧必标', '半遮挡保留', '外观定类'],
    examples: ['红盒被手遮 60% 但仍可见角点 → 保留 bbox'],
    rejectCodes: ['keyframe_miss', 'occlusion_drop'],
  },
  {
    id: 'spec-6',
    title: '6. 点云分割',
    body: '桌面平面优先；小物体独立簇；飞点归 noise；结果表须含点数与类别。',
    checklist: ['平面优先', '小物体独立', '飞点归 noise'],
    examples: ['桌面 plane + 杯子 cluster + noise'],
    rejectCodes: ['cluster_merge', 'noise_as_object'],
  },
  {
    id: 'spec-7',
    title: '7. 抽检与回流',
    body: '抽检不合格须填写驳回原因并写入 rejectionTrail；返修后重新进入初审。合格样本写入回流库，供训练集 catalog 引用。',
    checklist: ['驳回必选原因码', '返修回初审', '合格入回流库'],
    examples: ['抽检失败 → rejectReason=label_miss → 标注中'],
    rejectCodes: ['sample_fail', 'reflux_skip'],
  },
  {
    id: 'spec-8',
    title: '8. VLA 动作序列',
    body: '动作段 endFrame > startFrame；关键节点覆盖抓取/放置等语义转折；指令文本须覆盖动作词表；段间空隙 >5 帧需补标或说明。',
    checklist: ['帧区间合法', '关键节点齐全', '指令-动作对齐', '空隙说明'],
    examples: ['REACH→GRASP→LIFT→PLACE 连续且关键节点齐全'],
    rejectCodes: ['span_illegal', 'keynode_miss', 'instruction_mismatch'],
  },
  {
    id: 'spec-9',
    title: '9. 标签体系（Taxonomy）',
    body: '文本：PERSON/DATE/ORDER_ID/ADDRESS/PHONE/ORG。视觉：box_A/box_B/gripper/conveyor。VLA：REACH/GRASP/LIFT/MOVE/PLACE/RETREAT。禁止自由造词，跨模态同义词须登记映射表。',
    checklist: ['仅用登记标签', '同义词入映射表', '新增标签走评审'],
    examples: ['ADDRESS 不得标成 ORG'],
    rejectCodes: ['taxonomy_drift'],
  },
]

export function createInitialSamplePool(tasks = []) {
  const hand = [
    {
      id: 'SPL-ORN-1001',
      taskId: 'ORN-JOB-2026-1101-0204',
      modality: 'text_ner',
      status: 'pending',
      reason: null,
      title: '文本NER样本 #1001',
    },
    {
      id: 'SPL-ORN-1002',
      taskId: 'ORN-JOB-2026-1101-0204',
      modality: 'text_ner',
      status: 'pending',
      reason: null,
      title: '文本NER样本 #1002',
    },
    {
      id: 'SPL-ORN-2101',
      taskId: 'ORN-JOB-2026-1104-0318',
      modality: 'seg',
      status: 'pending',
      reason: null,
      title: '语义分割样本 #2101',
    },
    {
      id: 'SPL-ORN-2102',
      taskId: 'ORN-JOB-2026-1104-0318',
      modality: 'seg',
      status: 'pending',
      reason: null,
      title: '语义分割样本 #2102',
    },
    {
      id: 'SPL-ORN-3201',
      taskId: 'ORN-JOB-2026-1103-0288',
      modality: 'audio_slice',
      status: 'pending',
      reason: null,
      title: '语音切片样本 #3201',
    },
    {
      id: 'SPL-ORN-4301',
      taskId: 'ORN-JOB-2026-1102-0251',
      modality: 'video_det',
      status: 'pending',
      reason: null,
      title: '视频检测样本 #4301',
    },
    {
      id: 'SPL-ORN-5401',
      taskId: 'ORN-JOB-2026-1104-0330',
      modality: 'point_seg',
      status: 'pending',
      reason: null,
      title: '点云分割样本 #5401',
    },
    {
      id: 'SPL-ORN-5402',
      taskId: 'ORN-JOB-2026-1104-0330',
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
    console.error('[orion] sample pool seed failed, fallback thin', e)
    return hand
  }
}
