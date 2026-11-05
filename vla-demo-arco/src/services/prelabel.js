import dayjs from 'dayjs'
import { businessDelay } from './delay'
import { paginate } from '@/mock/seed/paginate'
import { pushAudit } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import {
  TEXT_DOCS,
  VISION_IMAGES,
  ACCEPT_STEPS,
  createAcceptJobs,
  ENTITY_TYPES,
  RELATION_TYPES,
  CLASS_LABELS,
} from '@/mock/prelabel'

const state = {
  texts: TEXT_DOCS.map((d) => ({
    ...d,
    model: JSON.parse(JSON.stringify(d.model)),
    corrected: null,
    changeLog: [],
  })),
  visions: VISION_IMAGES.map((v) => ({
    ...v,
    ocr: JSON.parse(JSON.stringify(v.ocrModel)),
    yolo: JSON.parse(JSON.stringify(v.yoloModel)),
    ocrCorrected: false,
    yoloCorrected: false,
    changeLog: [],
  })),
  accepts: createAcceptJobs(),
}

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function actorName() {
  const auth = useAuthStore()
  return auth.user?.name || '系统'
}

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

export function listMeta() {
  return {
    entityTypes: ENTITY_TYPES,
    relationTypes: RELATION_TYPES,
    classLabels: CLASS_LABELS,
    acceptSteps: ACCEPT_STEPS,
  }
}

export async function listTextDocs(query = {}) {
  await businessDelay()
  let rows = [...state.texts]
  if (query.status) rows = rows.filter((d) => d.status === query.status)
  if (query.batchId) rows = rows.filter((d) => d.batchId === query.batchId)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((d) => d.id.includes(kw) || d.title.includes(kw))
  }
  const result = paginate(rows, query)
  return {
    ...result,
    items: result.items.map((d) => ({
      id: d.id,
      title: d.title,
      batchId: d.batchId,
      status: d.status,
      progressPct: d.progressPct,
      spotCheckPass: d.spotCheckPass,
      hasCorrection: !!d.corrected,
    })),
  }
}

export async function getTextDoc(docId) {
  await businessDelay()
  const d = state.texts.find((x) => x.id === docId)
  if (!d) throw new Error(`文本样例不存在：${docId}`)
  return {
    id: d.id,
    title: d.title,
    batchId: d.batchId,
    status: d.status,
    rawText: d.rawText,
    model: clone(d.model),
    corrected: d.corrected ? clone(d.corrected) : null,
    changeLog: [...d.changeLog],
    goldHint: d.goldHint,
  }
}

/** 跑文本预标管线：分类 / NER / 关系 / 结构化 */
export async function runTextPipeline(docId) {
  await businessDelay()
  const d = state.texts.find((x) => x.id === docId)
  if (!d) throw new Error(`文本样例不存在：${docId}`)
  d.status = 'prelabeled'
  pushAudit({
    action: '运行文本预标管线',
    detail: `${docId} · 分类/NER/关系/结构化`,
  })
  return {
    classify: clone(d.model.classify),
    entities: clone(d.model.entities),
    relations: clone(d.model.relations),
    structured: clone(d.model.structured),
  }
}

export async function listVisionImages(query = {}) {
  await businessDelay()
  let rows = [...state.visions]
  if (query.status) rows = rows.filter((v) => v.status === query.status)
  if (query.batchId) rows = rows.filter((v) => v.batchId === query.batchId)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((v) => v.id.includes(kw) || v.title.includes(kw))
  }
  const result = paginate(rows, query)
  return {
    ...result,
    items: result.items.map((v) => ({
      id: v.id,
      title: v.title,
      batchId: v.batchId,
      imageUrl: v.imageUrl,
      status: v.status,
      progressPct: v.progressPct,
      spotCheckPass: v.spotCheckPass,
      ocrCorrected: v.ocrCorrected,
      yoloCorrected: v.yoloCorrected,
    })),
  }
}

export async function getVisionImage(imageId) {
  await businessDelay()
  const v = state.visions.find((x) => x.id === imageId)
  if (!v) throw new Error(`图像样例不存在：${imageId}`)
  return {
    id: v.id,
    title: v.title,
    imageUrl: v.imageUrl,
    width: v.width,
    height: v.height,
    status: v.status,
    ocr: clone(v.ocr),
    yolo: clone(v.yolo),
    labelSet: [...v.labelSet],
    ocrCorrected: v.ocrCorrected,
    yoloCorrected: v.yoloCorrected,
    changeLog: [...v.changeLog],
  }
}

export async function runOcr(imageId) {
  await businessDelay()
  const v = state.visions.find((x) => x.id === imageId)
  if (!v) throw new Error(`图像样例不存在：${imageId}`)
  // reset to model seed for demo re-run feel, then mark status
  v.ocr = clone(v.ocrModel)
  v.status = 'ocr_done'
  pushAudit({ action: '运行 OCR 预标', detail: `${imageId} · ${v.ocr.length} 条` })
  return clone(v.ocr)
}

export async function runYolo(imageId) {
  await businessDelay()
  const v = state.visions.find((x) => x.id === imageId)
  if (!v) throw new Error(`图像样例不存在：${imageId}`)
  v.yolo = clone(v.yoloModel)
  v.status = 'yolo_done'
  pushAudit({ action: '运行 YOLO 预标', detail: `${imageId} · ${v.yolo.length} 框` })
  return clone(v.yolo)
}

/**
 * 保存人工修正。
 * id: SC-TXT-* | SC-IMG-*
 * patch:
 *  - text: { classify?, entities?, relations?, structured? }
 *  - vision: { ocr?, yolo? }
 */
export async function saveCorrection(id, patch = {}) {
  await businessDelay()
  const auth = useAuthStore()

  const text = state.texts.find((x) => x.id === id)
  if (text) {
    const before = text.corrected ? clone(text.corrected) : clone(text.model)
    const next = {
      classify: patch.classify ? clone(patch.classify) : clone(before.classify),
      entities: patch.entities ? clone(patch.entities) : clone(before.entities),
      relations: patch.relations ? clone(patch.relations) : clone(before.relations),
      structured: patch.structured ? clone(patch.structured) : clone(before.structured),
    }
    const changed = diffTextFields(before, next)
    text.corrected = next
    text.status = 'corrected'
    text.changeLog.unshift({
      at: now(),
      actor: actorName(),
      fields: changed,
    })
    pushAudit({
      action: '保存文本人工修正',
      detail: `${id} · 变更 ${changed.join(',') || '无'}`,
    })
    return { id, kind: 'text', corrected: clone(next), changedFields: changed }
  }

  const vision = state.visions.find((x) => x.id === id)
  if (vision) {
    const changed = []
    if (patch.ocr) {
      vision.ocr = clone(patch.ocr)
      vision.ocrCorrected = true
      changed.push('ocr')
    }
    if (patch.yolo) {
      vision.yolo = clone(patch.yolo)
      vision.yoloCorrected = true
      changed.push('yolo')
    }
    vision.status = 'corrected'
    vision.changeLog.unshift({ at: now(), actor: actorName(), fields: changed })
    pushAudit({
      action: '保存视觉人工修正',
      detail: `${id} · 变更 ${changed.join(',') || '无'}`,
    })
    return {
      id,
      kind: 'vision',
      ocr: clone(vision.ocr),
      yolo: clone(vision.yolo),
      changedFields: changed,
    }
  }

  throw new Error(`预标对象不存在：${id}`)
}

function diffTextFields(before, after) {
  const fields = []
  if (JSON.stringify(before.classify) !== JSON.stringify(after.classify)) fields.push('classify')
  if (JSON.stringify(before.entities) !== JSON.stringify(after.entities)) fields.push('entities')
  if (JSON.stringify(before.relations) !== JSON.stringify(after.relations)) fields.push('relations')
  if (JSON.stringify(before.structured) !== JSON.stringify(after.structured)) fields.push('structured')
  return fields
}

export async function listAcceptJobs(query = {}) {
  await businessDelay()
  let rows = state.accepts.map((j) => ({ ...j, stepDone: [...j.stepDone] }))
  if (query.status) rows = rows.filter((j) => j.status === query.status)
  if (query.keyword) {
    const kw = String(query.keyword).trim()
    rows = rows.filter((j) => j.id.includes(kw) || j.title.includes(kw))
  }
  return paginate(rows, query)
}

export async function getAcceptJob(id) {
  await businessDelay()
  const j = state.accepts.find((x) => x.id === id)
  if (!j) throw new Error(`验收任务不存在：${id}`)
  return { ...j, stepDone: [...j.stepDone] }
}

/**
 * 推进验收向导一步。
 * steps: confirm → annotate → qa → accept
 * 最终 accept 仅 reviewer/admin 可执行。
 */
export async function advanceAcceptStep(id, { qaNote } = {}) {
  await businessDelay()
  const auth = useAuthStore()
  const j = state.accepts.find((x) => x.id === id)
  if (!j) throw new Error(`验收任务不存在：${id}`)
  if (j.status === 'accepted') throw new Error('任务已验收完成')

  const order = ACCEPT_STEPS.map((s) => s.key)
  const idx = order.indexOf(j.step)
  if (idx < 0) throw new Error(`未知步骤：${j.step}`)

  if (j.step === 'qa' && qaNote != null) j.qaNote = qaNote

  // completing current step
  if (!j.stepDone.includes(j.step)) j.stepDone.push(j.step)

  const isLast = idx === order.length - 1
  if (isLast) {
    if (!['reviewer', 'admin'].includes(auth.role)) {
      throw new Error('仅审核员或管理员可最终验收')
    }
    j.status = 'accepted'
    j.acceptedAt = now()
    j.acceptedBy = actorName()
    pushAudit({ action: '预标结果验收通过', detail: `${id} · ${j.title}` })
    return { ...j, stepDone: [...j.stepDone] }
  }

  j.step = order[idx + 1]
  pushAudit({
    action: `验收推进：${ACCEPT_STEPS[idx].label}`,
    detail: `${id} → ${ACCEPT_STEPS[idx + 1].label}`,
  })
  return { ...j, stepDone: [...j.stepDone] }
}

export { TEXT_DOCS, VISION_IMAGES, ACCEPT_STEPS, ENTITY_TYPES, RELATION_TYPES, CLASS_LABELS }
