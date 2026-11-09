<script setup>
import { Message } from '@/ui/discrete'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  listQcTasks,
  getQcTask,
  saveLabels,
  transition,
  getModalityMeta,
  getStatusMeta,
  SAMPLE_RESOURCES,
  MODALITIES,
} from '@/services/qc'
import { useAuthStore } from '@/stores/auth'
import ProgressMock from '@/components/ProgressMock.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const taskList = ref([])
const task = ref(null)
const modalityPreview = ref('text_ner')
const selectedLabel = ref('')
const draftLabels = ref([])
const draftRelations = ref([])
const selectedId = ref(null)
const tool = ref('select') // select | draw | erase
const zoom = ref(1)

// text selection
const textEl = ref(null)

// seg polygon drawing
const drawingPoly = ref([])
const segWrap = ref(null)

// audio
const audioMarkStart = ref(null)
const playHead = ref(0)

// video
const videoRef = ref(null)
const currentFrame = ref(0)
const drawingBox = reactive({ active: false, x0: 0, y0: 0, x1: 0, y1: 0 })
const videoWrap = ref(null)

// point cloud
const pcCanvas = ref(null)
const pcRot = reactive({ yaw: 0.6, pitch: 0.35 })
const pcDragging = ref(false)
const pcLast = reactive({ x: 0, y: 0 })
const selectedCluster = ref(null)

const currentId = computed(() => route.params.id)
/** 左侧模态切换时必须换样例资源；否则点云/图像 URL 会落到文本工单上变成空图 */
const resource = computed(() => {
  const demo = SAMPLE_RESOURCES[modalityPreview.value]
  if (!task.value) return demo
  if (task.value.modality === modalityPreview.value && task.value.resource) {
    return task.value.resource
  }
  return demo || task.value.resource
})

const canSubmitReview = computed(() => {
  if (!task.value) return false
  return ['annotating', 'assigned', 'rejected'].includes(task.value.status)
})

const entityColor = (type) =>
  ({
    PERSON: '#1677ff',
    DATE: '#52c41a',
    ORDER_ID: '#fa8c16',
    ADDRESS: '#722ed1',
    PHONE: '#eb2f96',
    ORG: '#13c2c2',
    ACTION: '#f5222d',
  })[type] || '#666'

const highlightedText = computed(() => {
  const res = resource.value
  if (!res?.text) return []
  const ents = [...draftLabels.value].filter((e) => e.start != null).sort((a, b) => a.start - b.start)
  const parts = []
  let cursor = 0
  const text = res.text
  for (const e of ents) {
    if (e.start > cursor) parts.push({ t: text.slice(cursor, e.start), entity: null })
    parts.push({ t: text.slice(e.start, e.end), entity: e })
    cursor = e.end
  }
  if (cursor < text.length) parts.push({ t: text.slice(cursor), entity: null })
  return parts
})

const frameDetections = computed(() =>
  draftLabels.value.filter((d) => d.frame === currentFrame.value || Math.abs((d.frame || 0) - currentFrame.value) <= 1),
)

const pcSegmentsTable = computed(() =>
  (resource.value?.segments || draftLabels.value || []).map((s) => ({
    id: s.id,
    label: s.label,
    points: s.points,
    color: s.color,
  })),
)

const relationRows = computed(() => {
  const byId = Object.fromEntries(draftLabels.value.map((e) => [e.id, e]))
  return draftRelations.value.map((r) => ({
    ...r,
    subjText: byId[r.subj]?.text || r.subj,
    objText: byId[r.obj]?.text || r.obj,
  }))
})

async function loadList() {
  taskList.value = (await listQcTasks({ page: 1, pageSize: 200 })).items
}

function syncDraftFromTaskOrDemo(modality, labelsSource) {
  modalityPreview.value = modality
  const demo = SAMPLE_RESOURCES[modality]
  if (modality === 'text_ner') {
    draftLabels.value = JSON.parse(JSON.stringify(labelsSource || demo.entities || []))
    draftRelations.value = JSON.parse(JSON.stringify(task.value?.resource?.relations || demo.relations || []))
  } else if (modality === 'seg') {
    draftLabels.value = JSON.parse(JSON.stringify(labelsSource || demo.masks || []))
  } else if (modality === 'audio_slice') {
    draftLabels.value = JSON.parse(JSON.stringify(labelsSource || demo.slices || []))
  } else if (modality === 'video_det') {
    draftLabels.value = JSON.parse(JSON.stringify(labelsSource || demo.detections || []))
    currentFrame.value = demo.keyFrames?.[0] || 0
  } else {
    draftLabels.value = JSON.parse(JSON.stringify(labelsSource || demo.segments || []))
  }
  selectedLabel.value = (demo.labelSet && demo.labelSet[0]) || ''
  selectedId.value = draftLabels.value[0]?.id || null
  drawingPoly.value = []
  nextTick(() => {
    if (modality === 'point_seg') drawPointCloud()
  })
}

async function loadTask(id) {
  if (!id) {
    task.value = null
    return
  }
  loading.value = true
  try {
    task.value = await getQcTask(id)
    syncDraftFromTaskOrDemo(task.value.modality, task.value.labelsSnapshot)
  } catch (e) {
    Message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadList()
  if (currentId.value) await loadTask(currentId.value)
  else if (taskList.value[0]) router.replace(`/qc/annotate/${taskList.value[0].id}`)
})

watch(currentId, (id) => {
  if (id) loadTask(id)
})

function switchTask(id) {
  router.push(`/qc/annotate/${id}`)
}

function previewModality(m) {
  if (task.value && task.value.modality === m) {
    syncDraftFromTaskOrDemo(m, task.value.labelsSnapshot)
  } else {
    task.value = null
    syncDraftFromTaskOrDemo(m, null)
  }
}

function removeLabel(id) {
  draftLabels.value = draftLabels.value.filter((x) => x.id !== id)
  draftRelations.value = draftRelations.value.filter((r) => r.subj !== id && r.obj !== id)
  if (selectedId.value === id) selectedId.value = null
}

function selectItem(id) {
  selectedId.value = id
  const item = draftLabels.value.find((x) => x.id === id)
  if (item?.frame != null) currentFrame.value = item.frame
  if (item?.label || item?.type) selectedLabel.value = item.label || item.type
}

/** —— 文本：拖选建实体 —— */
function onTextMouseUp() {
  if (modalityPreview.value !== 'text_ner' || !resource.value?.text) return
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !textEl.value?.contains(sel.anchorNode)) return
  const selected = sel.toString()
  if (!selected.trim()) return
  const full = resource.value.text
  const start = full.indexOf(selected)
  if (start < 0) {
    Message.warning('请在原文连续区域拖选')
    return
  }
  const end = start + selected.length
  const overlap = draftLabels.value.some((e) => !(end <= e.start || start >= e.end))
  if (overlap) {
    Message.warning('与已有实体区间重叠')
    sel.removeAllRanges()
    return
  }
  const id = `e-${Date.now()}`
  draftLabels.value.push({
    id,
    text: selected,
    type: selectedLabel.value || 'PERSON',
    start,
    end,
  })
  selectedId.value = id
  sel.removeAllRanges()
  Message.success(`已标注实体「${selected}」`)
}

function addRelation() {
  if (draftLabels.value.length < 2) {
    Message.warning('至少需要两个实体')
    return
  }
  const types = resource.value?.relationTypes || ['关联']
  const subj = draftLabels.value[0].id
  const obj = draftLabels.value[1].id
  draftRelations.value.push({
    id: `r-${Date.now()}`,
    type: types[0],
    subj,
    obj,
  })
}

function removeRelation(id) {
  draftRelations.value = draftRelations.value.filter((r) => r.id !== id)
}

/** —— 图像分割：多边形 —— */
function onSegClick(e) {
  if (tool.value !== 'draw' || modalityPreview.value !== 'seg') return
  const rect = segWrap.value.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  drawingPoly.value.push([+x.toFixed(4), +y.toFixed(4)])
}

function finishPolygon() {
  if (drawingPoly.value.length < 3) {
    Message.warning('至少 3 个顶点')
    return
  }
  const id = `m-${Date.now()}`
  const color = ({ cup: '#1677ff', plate: '#52c41a', hand: '#fa8c16', table: '#722ed1', tool: '#eb2f96' })[
    selectedLabel.value
  ] || '#f5222d'
  const area = Math.min(0.4, drawingPoly.value.length * 0.02)
  draftLabels.value.push({
    id,
    label: selectedLabel.value || 'object',
    color,
    area,
    conf: 1,
    polygon: [...drawingPoly.value],
  })
  selectedId.value = id
  drawingPoly.value = []
  tool.value = 'select'
  Message.success('多边形区域已生成（演示 Mask 矢量）')
}

function cancelPolygon() {
  drawingPoly.value = []
}

function polyToSvg(points) {
  if (!points?.length) return ''
  return points.map((p) => `${p[0] * 100},${p[1] * 100}`).join(' ')
}

/** —— 语音切片 —— */
function onWaveClick(e) {
  const dur = resource.value?.durationSec || 1
  const rect = e.currentTarget.getBoundingClientRect()
  const t = ((e.clientX - rect.left) / rect.width) * dur
  playHead.value = Math.max(0, Math.min(dur, +t.toFixed(2)))
  if (audioMarkStart.value == null) {
    audioMarkStart.value = playHead.value
    Message.info(`起点 ${audioMarkStart.value}s，再点一次设终点`)
  } else {
    const start = Math.min(audioMarkStart.value, playHead.value)
    const end = Math.max(audioMarkStart.value, playHead.value)
    if (end - start < 0.15) {
      Message.warning('切片过短')
      audioMarkStart.value = null
      return
    }
    const id = `s-${Date.now()}`
    draftLabels.value.push({
      id,
      start: +start.toFixed(2),
      end: +end.toFixed(2),
      label: selectedLabel.value || '其他',
      text: '（人工切片转写）',
      speaker: resource.value?.speakers?.[0] || 'SPK_A',
    })
    selectedId.value = id
    audioMarkStart.value = null
    Message.success(`切片 ${start.toFixed(2)}–${end.toFixed(2)}s`)
  }
}

function updateSliceField(id, field, val) {
  const s = draftLabels.value.find((x) => x.id === id)
  if (s) s[field] = val
}

/** —— 视频检测 —— */
function seekFrame(f) {
  const max = resource.value?.frames || 0
  currentFrame.value = Math.max(0, Math.min(max, Math.round(f)))
  const video = videoRef.value
  const fps = resource.value?.fps || 30
  if (video && video.duration) {
    video.currentTime = currentFrame.value / fps
  }
}

function onVideoTimeUpdate() {
  const video = videoRef.value
  if (!video || !resource.value?.fps) return
  currentFrame.value = Math.round(video.currentTime * resource.value.fps)
}

function onVideoMouseDown(e) {
  if (tool.value !== 'draw') return
  const rect = videoWrap.value.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  drawingBox.active = true
  drawingBox.x0 = x
  drawingBox.y0 = y
  drawingBox.x1 = x
  drawingBox.y1 = y
}

function onVideoMouseMove(e) {
  if (!drawingBox.active) return
  const rect = videoWrap.value.getBoundingClientRect()
  drawingBox.x1 = (e.clientX - rect.left) / rect.width
  drawingBox.y1 = (e.clientY - rect.top) / rect.height
}

function onVideoMouseUp() {
  if (!drawingBox.active) return
  drawingBox.active = false
  const x = Math.min(drawingBox.x0, drawingBox.x1)
  const y = Math.min(drawingBox.y0, drawingBox.y1)
  const w = Math.abs(drawingBox.x1 - drawingBox.x0)
  const h = Math.abs(drawingBox.y1 - drawingBox.y0)
  if (w < 0.02 || h < 0.02) return
  const id = `d-${Date.now()}`
  const trackId = `T-${(selectedLabel.value || 'obj').slice(0, 4)}-${String(currentFrame.value).padStart(3, '0')}`
  draftLabels.value.push({
    id,
    frame: currentFrame.value,
    trackId,
    label: selectedLabel.value || 'other',
    x: +x.toFixed(3),
    y: +y.toFixed(3),
    w: +w.toFixed(3),
    h: +h.toFixed(3),
    conf: 1,
  })
  selectedId.value = id
  tool.value = 'select'
  Message.success(`帧 ${currentFrame.value} 已添加检测框 ${trackId}`)
}

const draftBoxStyle = computed(() => {
  if (!drawingBox.active) return null
  const x = Math.min(drawingBox.x0, drawingBox.x1)
  const y = Math.min(drawingBox.y0, drawingBox.y1)
  const w = Math.abs(drawingBox.x1 - drawingBox.x0)
  const h = Math.abs(drawingBox.y1 - drawingBox.y0)
  return { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }
})

/** —— 点云三维投影（伪造点云可视化） —— */
function project(x, y, z) {
  const cy = Math.cos(pcRot.yaw)
  const sy = Math.sin(pcRot.yaw)
  const cp = Math.cos(pcRot.pitch)
  const sp = Math.sin(pcRot.pitch)
  const x1 = x * cy - z * sy
  const z1 = x * sy + z * cy
  const y1 = y * cp - z1 * sp
  const z2 = y * sp + z1 * cp
  const scale = 180 * zoom.value
  return { sx: 220 + x1 * scale, sy: 160 - y1 * scale, depth: z2 }
}

function buildFakePoints() {
  const clusters = resource.value?.clusters || []
  const pts = []
  let seed = 42
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (const c of clusters) {
    for (let i = 0; i < c.count; i++) {
      const px = c.center[0] + (rnd() - 0.5) * 2 * c.spread[0]
      const py = c.center[1] + (rnd() - 0.5) * 2 * c.spread[1]
      const pz = c.center[2] + (rnd() - 0.5) * 2 * c.spread[2]
      pts.push({ x: px, y: py, z: pz, color: c.color, label: c.label, cid: c.id })
    }
  }
  return pts
}

function drawPointCloud() {
  const canvas = pcCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  ctx.fillStyle = '#0b1220'
  ctx.fillRect(0, 0, w, h)
  const pts = buildFakePoints()
    .map((p) => ({ ...p, ...project(p.x, p.y, p.z) }))
    .sort((a, b) => a.depth - b.depth)
  for (const p of pts) {
    const dim = selectedCluster.value && p.cid !== selectedCluster.value ? 0.25 : 1
    ctx.globalAlpha = dim
    ctx.fillStyle = p.color
    ctx.fillRect(p.sx, p.sy, 2, 2)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#94a3b8'
  ctx.font = '12px sans-serif'
  ctx.fillText('拖拽旋转 · 滚轮缩放 · 点击右侧类别高亮', 12, h - 12)
}

function onPcDown(e) {
  pcDragging.value = true
  pcLast.x = e.clientX
  pcLast.y = e.clientY
}
function onPcMove(e) {
  if (!pcDragging.value) return
  pcRot.yaw += (e.clientX - pcLast.x) * 0.01
  pcRot.pitch += (e.clientY - pcLast.y) * 0.008
  pcLast.x = e.clientX
  pcLast.y = e.clientY
  drawPointCloud()
}
function onPcUp() {
  pcDragging.value = false
}
function onPcWheel(e) {
  e.preventDefault()
  zoom.value = Math.max(0.5, Math.min(2.5, zoom.value + (e.deltaY > 0 ? -0.1 : 0.1)))
  drawPointCloud()
}
function highlightCluster(id) {
  selectedCluster.value = id
  selectedId.value = id
  drawPointCloud()
}
function recolorCluster(id) {
  const seg = draftLabels.value.find((x) => x.id === id)
  if (!seg) return
  seg.label = selectedLabel.value || seg.label
  const colors = { table_plane: '#13c2c2', object_cup: '#1677ff', object_bottle: '#eb2f96', robot_arm: '#fa8c16', noise: '#8c8c8c' }
  seg.color = colors[seg.label] || seg.color
  // also update resource cluster for redraw
  const c = resource.value?.clusters?.find((x) => x.id === id)
  if (c) {
    c.label = seg.label
    c.color = seg.color
  }
  drawPointCloud()
  Message.success(`已将区域标注为 ${seg.label}`)
}

watch(modalityPreview, (m) => {
  if (m === 'point_seg') nextTick(drawPointCloud)
})

async function onSave() {
  if (!task.value) {
    Message.info('当前为模态预览，请选择工单后再保存')
    return
  }
  saving.value = true
  try {
    const payload = modalityPreview.value === 'text_ner' ? draftLabels.value : draftLabels.value
    // keep relations on resource for demo persistence in labelsSnapshot as entities only;
    // also stash relations into a synthetic field by appending meta on first entity if needed
    await saveLabels(task.value.id, payload)
    if (task.value.resource) task.value.resource.relations = draftRelations.value
    Message.success('标注已保存（含多边形 / 轨迹 / 关系等详细字段）')
    await loadTask(task.value.id)
  } catch (e) {
    Message.error(e.message)
  } finally {
    saving.value = false
  }
}

async function onSubmit() {
  if (!task.value) return
  saving.value = true
  try {
    await saveLabels(task.value.id, draftLabels.value)
    if (task.value.status === 'assigned' || task.value.status === 'rejected') {
      await transition(task.value.id, 'annotating', '进入标注')
    }
    await transition(task.value.id, 'reviewing', '提交初审')
    Message.success('已提交初审')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    Message.error(e.message)
  } finally {
    saving.value = false
  }
}

const pcColumns = [
  { title: '类别', dataIndex: 'label' },
  { title: '点数', dataIndex: 'points' },
  { title: '颜色', slotName: 'color', width: 120 },
  { title: '操作', slotName: 'ops', width: 110 },
]
</script>

<template>
  <div class="wb">
    <a-alert
      type="info"
      :closable="false"
      show-icon
      title="详细标注工作台：文本拖选建实体+关系；图像多边形；波形切片；视频逐帧画框+trackId；点云三维旋转着色。数据为真实感演示样本，可保存回工单。"
      class="tip"
    />

    <div class="wb-grid">
      <a-card class="pane" title="巡检样例 / 模态">
        <div class="domain-chip">StarCompute · 安防多租户</div>
        <div class="mod-list">
          <div
            v-for="m in MODALITIES"
            :key="m.value"
            class="mod-item"
            :class="{ active: modalityPreview === m.value }"
            @click="previewModality(m.value)"
          >
            <div class="mod-title">{{ m.label }}</div>
            <div class="mod-sub">{{ m.short }}</div>
            <div class="mod-hint">{{ m.hint }}</div>
          </div>
        </div>
        <a-divider />
        <div class="sec">工单</div>
        <a-select :model-value="currentId" placeholder="选择工单" style="width: 100%" allow-search @change="switchTask">
          <a-option
            v-for="t in taskList"
            :key="t.id"
            :label="`${t.id} · ${getModalityMeta(t.modality)?.short}`"
            :value="t.id"
          />
        </a-select>
        <div v-if="task" class="task-meta">
          <div>{{ task.title }}</div>
          <a-tag size="small" color="arcoblue">{{ getStatusMeta(task.status)?.label }}</a-tag>
        </div>
        <a-divider />
        <div class="sec">工具</div>
        <a-radio-group v-model="tool" type="button" size="small">
          <a-radio value="select">选择</a-radio>
          <a-radio value="draw">绘制</a-radio>
        </a-radio-group>
      </a-card>

      <a-card class="pane center">
        <template #title>
          <div class="center-head">
            <span>{{ resource?.title || '预览区' }}</span>
            <a-space>
              <a-tag size="small" color="green">{{ getModalityMeta(modalityPreview)?.label }}</a-tag>
              <a-tag size="small">实例 {{ draftLabels.length }}</a-tag>
            </a-space>
          </div>
        </template>

        <!-- TEXT -->
        <div v-if="modalityPreview === 'text_ner'" class="canvas">
          <p class="hint-inline">在原文上拖选文字即可创建「{{ selectedLabel }}」实体</p>
          <p ref="textEl" class="text-body" @mouseup="onTextMouseUp">
            <template v-for="(p, i) in highlightedText" :key="i">
              <mark
                v-if="p.entity"
                :class="{ selected: p.entity.id === selectedId }"
                :style="{
                  background: entityColor(p.entity.type) + '33',
                  borderBottom: '2px solid ' + entityColor(p.entity.type),
                }"
                @click.stop="selectItem(p.entity.id)"
              >
                {{ p.t }}<sup>{{ p.entity.type }}</sup>
              </mark>
              <span v-else>{{ p.t }}</span>
            </template>
          </p>
          <div class="subpanel">
            <div class="sec">实体关系</div>
            <a-button size="mini" type="outline" @click="addRelation">建立关系</a-button>
            <div v-for="r in relationRows" :key="r.id" class="rel-row">
              <span>{{ r.subjText }}</span>
              <a-tag size="small">{{ r.type }}</a-tag>
              <span>{{ r.objText }}</span>
              <a-button type="text" size="mini" status="danger" @click="removeRelation(r.id)">删</a-button>
            </div>
            <a-empty v-if="!relationRows.length" description="暂无关系" />
          </div>
        </div>

        <!-- SEG -->
        <div v-else-if="modalityPreview === 'seg'" class="canvas">
          <p class="hint-inline">选择「绘制」后在图上连续点击顶点，完成后点「闭合多边形」生成 Mask 矢量</p>
          <div
            ref="segWrap"
            class="img-wrap"
            :style="{ cursor: tool === 'draw' ? 'crosshair' : 'default' }"
            @click="onSegClick"
          >
            <img :src="resource.imageUrl" alt="seg" draggable="false" />
            <svg class="overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                v-for="m in draftLabels"
                :key="m.id"
                :points="polyToSvg(m.polygon)"
                :fill="m.color + '55'"
                :stroke="m.id === selectedId ? '#fff' : m.color"
                :stroke-width="m.id === selectedId ? 0.6 : 0.35"
                vector-effect="non-scaling-stroke"
                @click.stop="selectItem(m.id)"
              />
              <polyline
                v-if="drawingPoly.length"
                :points="polyToSvg(drawingPoly)"
                fill="none"
                stroke="#00B42A"
                stroke-width="0.5"
                stroke-dasharray="1 1"
              />
              <circle
                v-for="(pt, idx) in drawingPoly"
                :key="'v' + idx"
                :cx="pt[0] * 100"
                :cy="pt[1] * 100"
                r="0.8"
                fill="#00B42A"
              />
            </svg>
          </div>
          <a-space style="margin-top: 8px">
            <a-button size="mini" type="primary" :disabled="drawingPoly.length < 3" @click="finishPolygon">
              闭合多边形
            </a-button>
            <a-button size="mini" :disabled="!drawingPoly.length" @click="cancelPolygon">取消绘制</a-button>
            <span class="muted">顶点 {{ drawingPoly.length }}</span>
          </a-space>
        </div>

        <!-- AUDIO -->
        <div v-else-if="modalityPreview === 'audio_slice'" class="canvas">
          <p class="hint-inline">点击波形设起点/终点生成切片；可改说话人与转写</p>
          <div class="wave-bars" @click="onWaveClick">
            <div
              v-for="(amp, i) in resource.wavePeaks || []"
              :key="i"
              class="bar"
              :style="{ height: 8 + amp * 48 + 'px' }"
            />
            <div class="playhead" :style="{ left: (playHead / resource.durationSec) * 100 + '%' }" />
            <div
              v-if="audioMarkStart != null"
              class="mark"
              :style="{ left: (audioMarkStart / resource.durationSec) * 100 + '%' }"
            />
          </div>
          <audio
            v-if="resource.audioUrl && String(resource.audioUrl).endsWith('.wav')"
            class="audio-player"
            :src="resource.audioUrl"
            controls
            preload="metadata"
          />
          <div class="timeline">
            <div
              v-for="s in draftLabels"
              :key="s.id"
              class="slice"
              :class="{ selected: s.id === selectedId }"
              :style="{
                left: (s.start / resource.durationSec) * 100 + '%',
                width: ((s.end - s.start) / resource.durationSec) * 100 + '%',
              }"
              @click.stop="selectItem(s.id)"
            >
              {{ s.label }} · {{ s.speaker || '' }}
            </div>
          </div>
          <div class="axis">游标 {{ playHead.toFixed(2) }}s / 总长 {{ resource.durationSec }}s</div>
        </div>

        <!-- VIDEO -->
        <div v-else-if="modalityPreview === 'video_det'" class="canvas">
          <p class="hint-inline">拖动帧滑条定位；「绘制」模式下拖拽画框，自动写入 trackId 与当前帧</p>
          <div
            ref="videoWrap"
            class="img-wrap"
            :style="{ cursor: tool === 'draw' ? 'crosshair' : 'default' }"
            @mousedown="onVideoMouseDown"
            @mousemove="onVideoMouseMove"
            @mouseup="onVideoMouseUp"
            @mouseleave="onVideoMouseUp"
          >
            <video
              v-if="resource.videoUrl && String(resource.videoUrl).endsWith('.mp4')"
              ref="videoRef"
              class="media-video"
              :src="resource.videoUrl"
              :poster="resource.posterUrl"
              controls
              preload="metadata"
              @timeupdate="onVideoTimeUpdate"
            />
            <img v-else :src="resource.posterUrl" alt="video" />
            <div
              v-for="d in frameDetections"
              :key="d.id"
              class="det-box"
              :class="{ selected: d.id === selectedId }"
              :style="{
                left: d.x * 100 + '%',
                top: d.y * 100 + '%',
                width: d.w * 100 + '%',
                height: d.h * 100 + '%',
              }"
              @mousedown.stop
              @click.stop="selectItem(d.id)"
            >
              {{ d.label }} · {{ d.trackId }} @f{{ d.frame }}
            </div>
            <div v-if="draftBoxStyle" class="det-box drafting" :style="draftBoxStyle" />
          </div>
          <div class="frame-bar">
            <a-button size="mini" @click="seekFrame(currentFrame - 1)">‹ 帧</a-button>
            <a-slider
              :model-value="currentFrame"
              :min="0"
              :max="resource.frames || 0"
              :style="{ flex: 1, margin: '0 12px' }"
              @change="seekFrame"
            />
            <a-button size="mini" @click="seekFrame(currentFrame + 1)">帧 ›</a-button>
            <a-tag size="small">f{{ currentFrame }} / {{ resource.frames }} · {{ resource.fps }}fps</a-tag>
          </div>
          <a-space wrap>
            <a-tag
              v-for="kf in resource.keyFrames || []"
              :key="kf"
              checkable
              :checked="currentFrame === kf"
              @check="seekFrame(kf)"
            >
              关键帧 {{ kf }}
            </a-tag>
          </a-space>
        </div>

        <!-- POINT CLOUD -->
        <div v-else class="canvas">
          <p class="hint-inline">三维点云为演示级伪造簇点（非图片替代交互）：拖拽旋转、滚轮缩放、点选类别着色</p>
          <canvas
            ref="pcCanvas"
            width="440"
            height="320"
            class="pc-canvas"
            @mousedown="onPcDown"
            @mousemove="onPcMove"
            @mouseup="onPcUp"
            @mouseleave="onPcUp"
            @wheel.prevent="onPcWheel"
          />
          <a-table
            :columns="pcColumns"
            :data="pcSegmentsTable"
            :pagination="false"
            size="small"
            row-key="id"
            @row-click="(r) => highlightCluster(r.id)"
          >
            <template #color="{ record }">
              <span class="swatch" :style="{ background: record.color }" />
              {{ record.color }}
            </template>
            <template #ops="{ record }">
              <a-button type="text" size="mini" @click.stop="recolorCluster(record.id)">标为当前类</a-button>
            </template>
          </a-table>
          <div class="axis">总点数 {{ resource.points?.toLocaleString?.() || resource.points }} · zoom {{ zoom.toFixed(1) }}</div>
        </div>
      </a-card>

      <a-card class="pane" title="标签与属性">
        <a-form :auto-label-width="true" size="small">
          <a-form-item label="标签">
            <a-select v-model="selectedLabel" style="width: 100%">
              <a-option v-for="l in resource?.labelSet || []" :key="l" :value="l" :label="l" />
            </a-select>
          </a-form-item>
        </a-form>

        <div class="label-list">
          <div
            v-for="item in draftLabels"
            :key="item.id"
            class="label-row"
            :class="{ selected: item.id === selectedId }"
            @click="selectItem(item.id)"
          >
            <div class="label-main">
              <strong>{{ item.type || item.label }}</strong>
              <span class="muted">
                <template v-if="item.text">{{ item.text }}</template>
                <template v-else-if="item.trackId">{{ item.trackId }} · f{{ item.frame }}</template>
                <template v-else-if="item.start != null">{{ item.start }}s–{{ item.end }}s · {{ item.speaker }}</template>
                <template v-else-if="item.polygon">多边形 {{ item.polygon.length }} 点 · area {{ item.area }}</template>
                <template v-else>{{ item.points || item.id }}</template>
              </span>
              <div v-if="modalityPreview === 'audio_slice' && item.id === selectedId" class="inline-edit" @click.stop>
                <a-input v-model="item.text" size="mini" placeholder="转写文本" @change="() => {}" />
                <a-select
                  :model-value="item.speaker"
                  size="mini"
                  style="width: 100%; margin-top: 4px"
                  @change="(v) => updateSliceField(item.id, 'speaker', v)"
                >
                  <a-option v-for="s in resource.speakers || []" :key="s" :value="s" :label="s" />
                </a-select>
              </div>
              <div v-if="modalityPreview === 'text_ner' && item.id === selectedId" class="inline-edit" @click.stop>
                <a-select v-model="item.type" size="mini" style="width: 100%">
                  <a-option v-for="l in resource.labelSet" :key="l" :value="l" :label="l" />
                </a-select>
              </div>
            </div>
            <a-button type="text" size="mini" status="danger" @click.stop="removeLabel(item.id)">删</a-button>
          </div>
          <a-empty v-if="!draftLabels.length" description="暂无标签" />
        </div>

        <ProgressMock :running="saving" label="保存 / 提交处理中" />
        <div class="actions">
          <a-button :disabled="saving" @click="onSave">保存标注</a-button>
          <a-button type="primary" :disabled="!task || !canSubmitReview || saving" @click="onSubmit">
            提交初审
          </a-button>
        </div>
        <p class="hint">当前身份：{{ auth.user?.name }} · 详细字段写入 labelsSnapshot</p>
        <pre v-if="selectedId" class="json-peek">{{
          JSON.stringify(
            {
              selected: draftLabels.find((x) => x.id === selectedId),
              relations: modalityPreview === 'text_ner' ? draftRelations : undefined,
            },
            null,
            2,
          )
        }}</pre>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 12px;
}
.wb-grid {
  display: grid;
  grid-template-columns: 200px 1fr 280px;
  gap: 12px;
  min-height: 620px;
}
.pane {
  min-height: 580px;
}
.domain-chip {
  display: inline-block;
  margin-bottom: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f5e8ff;
  color: #722ed1;
  font-size: 11px;
  font-weight: 600;
}
.mod-item {
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px dashed #e5e6eb;
  margin-bottom: 6px;
  background: #fcfcff;
}
.mod-item:hover {
  background: #f9f0ff;
}
.mod-item.active {
  background: #f5e8ff;
  border: 1px solid #c084fc;
}
.mod-title {
  font-size: 13px;
  font-weight: 600;
  color: #4c1d95;
}
.mod-sub {
  font-size: 11px;
  color: #7c3aed;
}
.mod-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
.sec {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}
.task-meta {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.center-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.hint-inline {
  font-size: 12px;
  color: #86909c;
  margin: 0 0 8px;
}
.canvas {
  min-height: 400px;
}
.text-body {
  line-height: 1.9;
  font-size: 15px;
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  user-select: text;
  cursor: text;
}
.text-body mark {
  padding: 0 2px;
  border-radius: 2px;
  cursor: pointer;
}
.text-body mark.selected {
  outline: 2px solid #00b42a;
}
.text-body sup {
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.8;
}
.subpanel {
  margin-top: 12px;
  padding: 10px;
  background: #f7f8fa;
  border-radius: 8px;
}
.rel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-top: 6px;
}
.img-wrap {
  position: relative;
  width: 100%;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  user-select: none;
}
.img-wrap img,
.media-video {
  display: block;
  width: 100%;
  max-height: 360px;
  background: #0f172a;
}
.overlay-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.det-box {
  position: absolute;
  border: 2px solid #00b42a;
  color: #fff;
  font-size: 11px;
  padding: 2px 4px;
  box-sizing: border-box;
  background: #00b42a33;
  cursor: pointer;
}
.det-box.selected,
.det-box.drafting {
  border-color: #ff7d00;
  background: #ff7d0033;
}
.wave-bars {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 64px;
  padding: 4px;
  background: #0b1220;
  border-radius: 8px;
  cursor: crosshair;
}
.wave-bars .bar {
  flex: 1;
  background: linear-gradient(180deg, #0fc6c2, #00b42a);
  border-radius: 1px 1px 0 0;
  min-width: 2px;
}
.playhead,
.mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ff7d00;
}
.mark {
  background: #f53f3f;
}
.audio-player {
  width: 100%;
  margin: 8px 0 4px;
}
.timeline {
  position: relative;
  height: 36px;
  background: #f3f4f6;
  border-radius: 6px;
  margin-top: 10px;
  overflow: hidden;
}
.slice {
  position: absolute;
  top: 4px;
  bottom: 4px;
  background: #00b42a66;
  border: 1px solid #00b42a;
  border-radius: 4px;
  font-size: 11px;
  padding: 0 4px;
  color: #004d1a;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
}
.slice.selected {
  outline: 2px solid #ff7d00;
}
.frame-bar {
  display: flex;
  align-items: center;
  margin: 10px 0;
}
.axis {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}
.pc-canvas {
  width: 100%;
  max-width: 440px;
  border-radius: 8px;
  background: #0b1220;
  cursor: grab;
  display: block;
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  vertical-align: middle;
  margin-right: 4px;
}
.label-list {
  max-height: 280px;
  overflow: auto;
  margin-bottom: 12px;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 4px;
  border-bottom: 1px dashed #eee;
  cursor: pointer;
  border-radius: 4px;
}
.label-row.selected {
  background: #e8ffea;
}
.label-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  flex: 1;
  min-width: 0;
}
.inline-edit {
  margin-top: 4px;
}
.muted {
  color: #9ca3af;
  font-size: 12px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.hint {
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
}
.json-peek {
  margin-top: 8px;
  max-height: 160px;
  overflow: auto;
  font-size: 11px;
  background: #1d2129;
  color: #c9cdd4;
  padding: 8px;
  border-radius: 6px;
}
@media (max-width: 1100px) {
  .wb-grid {
    grid-template-columns: 1fr;
  }
}
</style>
