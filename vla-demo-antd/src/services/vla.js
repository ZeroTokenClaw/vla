import dayjs from 'dayjs'
import { businessDelay } from './delay'
import { pushAudit } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { exportJSON, exportCSV, exportExcel } from '@/utils/exportFiles'
import {
  VLA_TASKS,
  ACTION_TEMPLATES,
  COLLECT_MODES,
  SCENE_OPTIONS,
  PLAN_OPTIONS,
  ISSUE_TYPES,
  nextVlaId,
} from '@/mock/vla'
import { users } from '@/mock/users'

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function actorName() {
  const auth = useAuthStore()
  return auth.user?.name || '系统'
}

const state = {
  tasks: VLA_TASKS.map((t) => ({
    ...clone(t),
    issues: [],
    issuesDetected: false,
    filteredOut: [],
  })),
  seq: VLA_TASKS.length + 1,
}

export function listMeta() {
  return {
    modes: COLLECT_MODES,
    scenes: SCENE_OPTIONS,
    plans: PLAN_OPTIONS,
    actionTemplates: ACTION_TEMPLATES,
    issueTypes: ISSUE_TYPES,
    personnel: users.map((u) => ({ id: u.id, name: u.name, role: u.role, dept: u.dept })),
  }
}

export async function listVlaTasks() {
  await businessDelay()
  return state.tasks.map((t) => ({
    id: t.id,
    name: t.name,
    scene: t.scene,
    plan: t.plan,
    mode: t.mode,
    status: t.status,
    createdAt: t.createdAt,
    actionCount: t.actions.length,
    issueCount: t.issues.length,
    issuesDetected: t.issuesDetected,
    personnelIds: [...t.personnelIds],
  }))
}

export async function getVlaTask(taskId) {
  await businessDelay()
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) throw new Error(`采集任务不存在：${taskId}`)
  return clone(t)
}

/**
 * 创建采集任务：任务名、场景、方案、模式、动作模板、人员。
 * @param {{ name: string, scene: string, plan: string, mode: string, actionTemplateIds: string[], personnelIds: string[], instruction?: string }} config
 */
export async function createCollectTask(config) {
  await businessDelay()
  if (!config?.name?.trim()) throw new Error('请填写任务名称')
  if (!config.scene) throw new Error('请选择场景信息')
  if (!config.plan) throw new Error('请选择采集方案')
  if (!config.mode) throw new Error('请选择采集模式')
  if (!config.actionTemplateIds?.length) throw new Error('请至少选择一个动作模板')
  if (!config.personnelIds?.length) throw new Error('请至少配置一名采集人员')

  const id = nextVlaId(state.seq++)
  const templates = ACTION_TEMPLATES.filter((a) => config.actionTemplateIds.includes(a.id))
  const task = {
    id,
    name: config.name.trim(),
    scene: config.scene,
    plan: config.plan,
    mode: config.mode,
    actionTemplateIds: [...config.actionTemplateIds],
    personnelIds: [...config.personnelIds],
    instruction:
      config.instruction?.trim() ||
      `采集任务「${config.name.trim()}」：按所选动作模板完成示范并标注起止帧。`,
    imageUrl: '/samples/video/bin_pick_poster.jpg',
    videoUrl: '/samples/video/bin_pick.mp4',
    fps: 10,
    totalFrames: 100,
    durationSec: 10,
    status: 'ready',
    createdAt: now(),
    actions: [],
    issuesSeed: [],
    issues: [],
    issuesDetected: false,
    filteredOut: [],
    templateSnapshot: templates.map((t) => ({ ...t })),
  }
  state.tasks.unshift(task)
  pushAudit({
    action: '创建具身采集任务',
    detail: `${id} · ${task.name} · 模式 ${config.mode} · 人员 ${config.personnelIds.length}`,
  })
  return clone(task)
}

/**
 * 保存动作起止帧标注。
 * @param {{ taskId: string, startFrame: number, endFrame: number, action: string, instruction: string, keyNode?: boolean, id?: string }} payload
 */
export async function saveActionSpan(payload) {
  await businessDelay()
  const t = state.tasks.find((x) => x.id === payload.taskId)
  if (!t) throw new Error(`采集任务不存在：${payload.taskId}`)

  const startFrame = Number(payload.startFrame)
  const endFrame = Number(payload.endFrame)
  if (!Number.isFinite(startFrame) || !Number.isFinite(endFrame)) {
    throw new Error('起止帧必须为数字')
  }
  if (startFrame < 0 || endFrame > t.totalFrames) {
    throw new Error(`帧范围需在 0–${t.totalFrames}`)
  }
  if (endFrame <= startFrame) throw new Error('结束帧必须大于起始帧')
  if (!payload.action) throw new Error('请填写动作编码')

  const tpl = ACTION_TEMPLATES.find((a) => a.code === payload.action)
  const actionLabel = tpl?.name || payload.action

  if (payload.id) {
    const row = t.actions.find((a) => a.id === payload.id)
    if (!row) throw new Error(`动作片段不存在：${payload.id}`)
    Object.assign(row, {
      startFrame,
      endFrame,
      action: payload.action,
      actionLabel,
      instruction: payload.instruction || '',
      keyNode: !!payload.keyNode,
    })
  } else {
    t.actions.push({
      id: `act-${Date.now()}-${t.actions.length + 1}`,
      startFrame,
      endFrame,
      action: payload.action,
      actionLabel,
      instruction: payload.instruction || '',
      keyNode: !!payload.keyNode,
    })
  }

  t.actions.sort((a, b) => a.startFrame - b.startFrame)
  t.status = 'annotating'
  pushAudit({
    action: '保存动作起止帧',
    detail: `${t.id} · ${actionLabel} · F${startFrame}-F${endFrame}`,
  })
  return clone(t)
}

export async function deleteActionSpan(taskId, actionId) {
  await businessDelay()
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) throw new Error(`采集任务不存在：${taskId}`)
  const before = t.actions.length
  t.actions = t.actions.filter((a) => a.id !== actionId)
  if (t.actions.length === before) throw new Error(`动作片段不存在：${actionId}`)
  pushAudit({ action: '删除动作片段', detail: `${taskId} · ${actionId}` })
  return clone(t)
}

/**
 * 检测抖动/遮挡/模糊/缺失/不匹配。
 * @returns {{ issues: object[], summary: Record<string, number> }}
 */
export async function detectIssues(taskId) {
  await businessDelay()
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) throw new Error(`采集任务不存在：${taskId}`)

  const seeded = t.issuesSeed?.length
    ? clone(t.issuesSeed)
    : [
        {
          id: `iss-auto-${Date.now()}-1`,
          type: 'jitter',
          frame: Math.floor(t.totalFrames * 0.4),
          severity: 'medium',
          message: '检测到末端抖动超阈值',
          sampleId: `${t.id}-S1`,
        },
        {
          id: `iss-auto-${Date.now()}-2`,
          type: 'occlusion',
          frame: Math.floor(t.totalFrames * 0.55),
          severity: 'high',
          message: '目标被遮挡超过阈值',
          sampleId: `${t.id}-S2`,
        },
        {
          id: `iss-auto-${Date.now()}-3`,
          type: 'blur',
          frame: Math.floor(t.totalFrames * 0.7),
          severity: 'low',
          message: '关键帧模糊',
          sampleId: `${t.id}-S3`,
        },
        {
          id: `iss-auto-${Date.now()}-4`,
          type: 'missing',
          frame: Math.floor(t.totalFrames * 0.85),
          severity: 'medium',
          message: '传感器通道短时缺失',
          sampleId: `${t.id}-S4`,
        },
        {
          id: `iss-auto-${Date.now()}-5`,
          type: 'mismatch',
          frame: 0,
          severity: 'high',
          message: '样本轨迹与任务指令不匹配',
          sampleId: `${t.id}-S5`,
        },
      ]

  t.issues = seeded.map((i) => ({
    ...i,
    unqualified: false,
    filtered: false,
  }))
  t.issuesDetected = true
  t.filteredOut = []

  const summary = {}
  for (const it of ISSUE_TYPES) summary[it.key] = 0
  for (const i of t.issues) summary[i.type] = (summary[i.type] || 0) + 1

  pushAudit({
    action: '运行样本质检检测',
    detail: `${taskId} · 检出 ${t.issues.length} 条 · 抖动/遮挡/模糊/缺失/不匹配`,
  })
  return { issues: clone(t.issues), summary }
}

/** 标记不合格样本 */
export async function markUnqualified(taskId, issueIds) {
  await businessDelay()
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) throw new Error(`采集任务不存在：${taskId}`)
  const set = new Set(issueIds || [])
  let count = 0
  for (const i of t.issues) {
    if (set.has(i.id)) {
      i.unqualified = true
      count += 1
    }
  }
  pushAudit({
    action: '标记不合格样本',
    detail: `${taskId} · ${count} 条`,
  })
  return clone(t.issues)
}

/** 过滤：隐藏已标记不合格的样本 */
export async function setFilterUnqualified(taskId, enabled) {
  await businessDelay()
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) throw new Error(`采集任务不存在：${taskId}`)
  for (const i of t.issues) {
    i.filtered = enabled ? !!i.unqualified : false
  }
  t.filteredOut = enabled ? t.issues.filter((i) => i.unqualified).map((i) => i.id) : []
  pushAudit({
    action: enabled ? '开启不合格过滤' : '关闭不合格过滤',
    detail: `${taskId} · 隐藏 ${t.filteredOut.length} 条`,
  })
  return {
    issues: clone(t.issues),
    visible: clone(t.issues.filter((i) => !i.filtered)),
    filteredOut: [...t.filteredOut],
  }
}

function buildExportPayload(task) {
  const sceneLabel = SCENE_OPTIONS.find((s) => s.value === task.scene)?.label || task.scene
  const planLabel = PLAN_OPTIONS.find((p) => p.value === task.plan)?.label || task.plan
  const modeLabel = COLLECT_MODES.find((m) => m.value === task.mode)?.label || task.mode
  const personnel = task.personnelIds.map((id) => {
    const u = users.find((x) => x.id === id)
    return u ? `${u.name}(${u.role})` : id
  })

  return {
    meta: {
      taskId: task.id,
      name: task.name,
      scene: sceneLabel,
      plan: planLabel,
      mode: modeLabel,
      instruction: task.instruction,
      fps: task.fps,
      totalFrames: task.totalFrames,
      personnel,
      exportedAt: now(),
      exportedBy: actorName(),
      product: 'Orion Annotate',
    },
    actions: task.actions.map((a) => ({
      id: a.id,
      startFrame: a.startFrame,
      endFrame: a.endFrame,
      action: a.action,
      actionLabel: a.actionLabel,
      instruction: a.instruction,
      keyNode: a.keyNode,
    })),
    issues: task.issues.map((i) => ({
      id: i.id,
      type: i.type,
      frame: i.frame,
      severity: i.severity,
      message: i.message,
      sampleId: i.sampleId,
      unqualified: !!i.unqualified,
    })),
  }
}

function buildExportRows(task) {
  if (task.actions.length === 0) {
    return [
      {
        taskId: task.id,
        taskName: task.name,
        startFrame: '',
        endFrame: '',
        action: '',
        actionLabel: '',
        instruction: task.instruction,
        keyNode: '',
      },
    ]
  }
  return task.actions.map((a) => ({
    taskId: task.id,
    taskName: task.name,
    startFrame: a.startFrame,
    endFrame: a.endFrame,
    action: a.action,
    actionLabel: a.actionLabel,
    instruction: a.instruction,
    keyNode: a.keyNode ? 'Y' : 'N',
  }))
}

/**
 * 导出 JSON / Excel / CSV，文件名 ORN-VLA-{taskId}-{timestamp}.{ext}
 * @param {string} taskId
 * @param {'json'|'excel'|'csv'} format
 */
export async function exportVla(taskId, format) {
  await businessDelay()
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) throw new Error(`采集任务不存在：${taskId}`)

  const ts = dayjs().format('YYYYMMDDHHmmss')
  // Prefer ORN-VLA-{taskId}-{ts}; if taskId already starts with ORN-VLA-, do not double-prefix
  const base = taskId.startsWith('ORN-VLA-') ? `${taskId}-${ts}` : `ORN-VLA-${taskId}-${ts}`
  const payload = buildExportPayload(t)
  const rows = buildExportRows(t)

  if (format === 'json') {
    const filename = `${base}.json`
    exportJSON(filename, payload)
    pushAudit({ action: '导出 VLA JSON', detail: filename })
    return { filename, format }
  }
  if (format === 'csv') {
    const filename = `${base}.csv`
    exportCSV(filename, rows)
    pushAudit({ action: '导出 VLA CSV', detail: filename })
    return { filename, format }
  }
  if (format === 'excel') {
    const filename = `${base}.xlsx`
    exportExcel(filename, rows)
    pushAudit({ action: '导出 VLA Excel', detail: filename })
    return { filename, format }
  }
  throw new Error(`不支持的导出格式：${format}`)
}

/** Pure helper for unit tests: build export filename. */
export function buildVlaExportFilename(taskId, format, timestamp = dayjs().format('YYYYMMDDHHmmss')) {
  const ext = format === 'excel' ? 'xlsx' : format
  const base = taskId.startsWith('ORN-VLA-') ? `${taskId}-${timestamp}` : `ORN-VLA-${taskId}-${timestamp}`
  return `${base}.${ext}`
}

export { ISSUE_TYPES, ACTION_TEMPLATES, COLLECT_MODES, SCENE_OPTIONS, PLAN_OPTIONS }
