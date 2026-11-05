import { seedVlaEpisodes } from './seed/vla'
/** StarCompute 具身采集标注 mock：采集任务、动作模板、时间轴片段、质检问题。 */

export const COLLECT_MODES = [
  { value: 'teleop', label: '遥操作采集' },
  { value: 'scripted', label: '脚本化采集' },
  { value: 'human_demo', label: '真人示范' },
  { value: 'mixed', label: '混合模式' },
]

export const SCENE_OPTIONS = [
  { value: 'pack_station', label: '打包工位' },
  { value: 'chem_hood', label: '化学通风橱' },
  { value: 'sku_cage', label: 'SKU 笼车' },
  { value: 'sit_stand', label: '升降工位' },
]

export const PLAN_OPTIONS = [
  { value: 'pick_place_std', label: '标准抓取放置方案' },
  { value: 'open_drawer', label: '开抽屉序列方案' },
  { value: 'wipe_surface', label: '擦拭表面方案' },
  { value: 'sort_parts', label: '零件分拣方案' },
]

export const ACTION_TEMPLATES = [
  { id: 'tpl-reach', name: '伸手接近', code: 'REACH' },
  { id: 'tpl-grasp', name: '闭合抓取', code: 'GRASP' },
  { id: 'tpl-lift', name: '抬升', code: 'LIFT' },
  { id: 'tpl-move', name: '平移运送', code: 'MOVE' },
  { id: 'tpl-place', name: '放置释放', code: 'PLACE' },
  { id: 'tpl-retreat', name: '回撤复位', code: 'RETREAT' },
  { id: 'tpl-open', name: '开合机构', code: 'OPEN' },
  { id: 'tpl-wipe', name: '擦拭', code: 'WIPE' },
]

export const ISSUE_TYPES = [
  { key: 'jitter', label: '样本抖动', color: 'warning' },
  { key: 'occlusion', label: '遮挡', color: 'danger' },
  { key: 'blur', label: '模糊', color: 'warning' },
  { key: 'missing', label: '数据缺失', color: 'info' },
  { key: 'mismatch', label: '样本与任务不匹配', color: 'danger' },
]

/** Seed collect tasks with linked multimodal assets + action spans. */
const VLA_HAND = [
  {
    id: 'SC-VLA-2026-001',
    name: '仓拣-红盒抓取放置',
    scene: 'warehouse_bin',
    plan: 'pick_place_std',
    mode: 'teleop',
    actionTemplateIds: ['tpl-reach', 'tpl-grasp', 'tpl-lift', 'tpl-move', 'tpl-place', 'tpl-retreat'],
    personnelIds: ['u-sc-annotator', 'u-sc-annotator-2'],
    instruction: '请将料箱中的红色零件盒抓起，平稳放置到传送带左侧托盘，避开蓝色障碍物。',
    imageUrl: '/samples/video/bin_pick_poster.jpg',
    videoUrl: '/samples/video/bin_pick.mp4',
    fps: 10,
    totalFrames: 120,
    durationSec: 12,
    status: 'annotating',
    createdAt: '2026-11-03 10:18:00',
    actions: [
      {
        id: 'act-1',
        startFrame: 5,
        endFrame: 22,
        action: 'REACH',
        actionLabel: '伸手接近',
        instruction: '末端接近红色零件盒上方',
        keyNode: true,
      },
      {
        id: 'act-2',
        startFrame: 23,
        endFrame: 38,
        action: 'GRASP',
        actionLabel: '闭合抓取',
        instruction: '夹爪闭合抓稳红盒',
        keyNode: true,
      },
      {
        id: 'act-3',
        startFrame: 39,
        endFrame: 55,
        action: 'LIFT',
        actionLabel: '抬升',
        instruction: '抬升至安全高度',
        keyNode: false,
      },
      {
        id: 'act-4',
        startFrame: 56,
        endFrame: 85,
        action: 'MOVE',
        actionLabel: '平移运送',
        instruction: '平移至托盘上方，避开蓝障',
        keyNode: true,
      },
      {
        id: 'act-5',
        startFrame: 86,
        endFrame: 102,
        action: 'PLACE',
        actionLabel: '放置释放',
        instruction: '放置到托盘左侧并松开',
        keyNode: true,
      },
      {
        id: 'act-6',
        startFrame: 103,
        endFrame: 118,
        action: 'RETREAT',
        actionLabel: '回撤复位',
        instruction: '回撤到初始姿态',
        keyNode: false,
      },
    ],
    /** Pre-seeded quality issues (shown after detect). */
    issuesSeed: [
      {
        id: 'iss-1',
        type: 'jitter',
        frame: 48,
        severity: 'medium',
        message: '抬升阶段末端抖动超阈值（帧 48±3）',
        sampleId: 'SMP-001-A',
      },
      {
        id: 'iss-2',
        type: 'occlusion',
        frame: 72,
        severity: 'high',
        message: '蓝障短暂遮挡红盒超过 40% 面积',
        sampleId: 'SMP-001-B',
      },
      {
        id: 'iss-3',
        type: 'blur',
        frame: 91,
        severity: 'low',
        message: '放置瞬间运动模糊，关键帧清晰度不足',
        sampleId: 'SMP-001-C',
      },
      {
        id: 'iss-4',
        type: 'missing',
        frame: 110,
        severity: 'medium',
        message: '回撤段缺失关节力矩通道 0.4s',
        sampleId: 'SMP-001-D',
      },
      {
        id: 'iss-5',
        type: 'mismatch',
        frame: 0,
        severity: 'high',
        message: '任务指令要求「托盘左侧」，轨迹终点偏右',
        sampleId: 'SMP-001-E',
      },
    ],
  },
  {
    id: 'SC-VLA-2026-002',
    name: '厨房-开抽屉取杯',
    scene: 'kitchen_counter',
    plan: 'open_drawer',
    mode: 'human_demo',
    actionTemplateIds: ['tpl-reach', 'tpl-open', 'tpl-grasp', 'tpl-retreat'],
    personnelIds: ['u-sc-annotator'],
    instruction: '打开中层抽屉，取出白色马克杯，放到台面中央。',
    imageUrl: '/samples/video/bin_pick_poster.jpg',
    videoUrl: '/samples/video/bin_pick.mp4',
    fps: 10,
    totalFrames: 90,
    durationSec: 9,
    status: 'ready',
    createdAt: '2026-11-03 14:02:00',
    actions: [
      {
        id: 'act-a',
        startFrame: 3,
        endFrame: 20,
        action: 'REACH',
        actionLabel: '伸手接近',
        instruction: '接近抽屉把手',
        keyNode: true,
      },
      {
        id: 'act-b',
        startFrame: 21,
        endFrame: 45,
        action: 'OPEN',
        actionLabel: '开合机构',
        instruction: '拉开中层抽屉至限位',
        keyNode: true,
      },
      {
        id: 'act-c',
        startFrame: 46,
        endFrame: 70,
        action: 'GRASP',
        actionLabel: '闭合抓取',
        instruction: '抓取白色马克杯',
        keyNode: true,
      },
      {
        id: 'act-d',
        startFrame: 71,
        endFrame: 88,
        action: 'RETREAT',
        actionLabel: '回撤复位',
        instruction: '放到台面中央后回撤',
        keyNode: false,
      },
    ],
    issuesSeed: [
      {
        id: 'iss-6',
        type: 'blur',
        frame: 33,
        severity: 'medium',
        message: '拉抽屉过程相机对焦失败',
        sampleId: 'SMP-002-A',
      },
      {
        id: 'iss-7',
        type: 'missing',
        frame: 60,
        severity: 'high',
        message: '抓取段缺失腕部 RGB 帧 8 帧',
        sampleId: 'SMP-002-B',
      },
      {
        id: 'iss-8',
        type: 'mismatch',
        frame: 0,
        severity: 'medium',
        message: '方案为开抽屉，日志标注含擦拭动作模板',
        sampleId: 'SMP-002-C',
      },
    ],
  },
  {
    id: 'SC-VLA-2026-003',
    name: '实验台-擦拭表面（待标注）',
    scene: 'lab_bench',
    plan: 'wipe_surface',
    mode: 'scripted',
    actionTemplateIds: ['tpl-reach', 'tpl-wipe', 'tpl-retreat'],
    personnelIds: ['u-sc-annotator-2', 'u-sc-reviewer'],
    instruction: '持海绵沿台面从左到右擦拭两遍，避开烧杯区域。',
    imageUrl: '/samples/video/bin_pick_poster.jpg',
    videoUrl: '/samples/video/bin_pick.mp4',
    fps: 10,
    totalFrames: 100,
    durationSec: 10,
    status: 'ready',
    createdAt: '2026-11-04 09:30:00',
    actions: [],
    issuesSeed: [
      {
        id: 'iss-9',
        type: 'jitter',
        frame: 40,
        severity: 'low',
        message: '擦拭往返路径存在高频微抖',
        sampleId: 'SMP-003-A',
      },
      {
        id: 'iss-10',
        type: 'occlusion',
        frame: 55,
        severity: 'medium',
        message: '操作员手臂遮挡海绵接触点',
        sampleId: 'SMP-003-B',
      },
    ],
  },
]

function buildVlaTasks() {
  try {
    return seedVlaEpisodes(VLA_HAND)
  } catch (e) {
    console.error('[starcompute] vla seed failed, fallback thin', e)
    return VLA_HAND.map((t) => ({ ...t, stream: t.stream || { joints: [], eeOpen: [], stamp: [], hz: 10 } }))
  }
}

export const VLA_TASKS = buildVlaTasks()

export function nextVlaId(seq) {
  const n = String(seq).padStart(3, '0')
  return `SC-VLA-2026-${n}`
}
