<script setup>
import { notification } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
const selectedId = ref('')
const videoFrame = ref(1)
const drawMode = ref(false)
const polyDraft = ref([])
const pcRotate = reactive({ x: -18, y: 24 })
const relationDraft = ref([])

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
const selectedItem = computed(() => draftLabels.value.find((x) => x.id === selectedId.value) || null)
const frameDetections = computed(() =>
  draftLabels.value.filter((d) => !d.frame || d.frame === videoFrame.value),
)

async function loadList() {
  taskList.value = (await listQcTasks({ page: 1, pageSize: 200 })).items
}

async function loadTask(id) {
  if (!id) {
    task.value = null
    return
  }
  loading.value = true
  try {
    task.value = await getQcTask(id)
    modalityPreview.value = task.value.modality
    draftLabels.value = JSON.parse(JSON.stringify(task.value.labelsSnapshot || []))
    relationDraft.value = JSON.parse(JSON.stringify(task.value.relationsSnapshot || []))
    const set = resource.value?.labelSet || []
    selectedLabel.value = set[0] || ''
    selectedId.value = draftLabels.value[0]?.id || ''
    videoFrame.value = 1
    polyDraft.value = []
  } catch (e) {
    notification.error({ message: e.message || '加载失败', placement: 'topRight' })
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
  modalityPreview.value = m
  drawMode.value = false
  polyDraft.value = []
  if (!task.value || task.value.modality !== m) {
    const demo = SAMPLE_RESOURCES[m]
    draftLabels.value = JSON.parse(
      JSON.stringify(
        demo.entities || demo.masks || demo.slices || demo.detections || demo.segments || [],
      ),
    )
    selectedLabel.value = (demo.labelSet && demo.labelSet[0]) || ''
    selectedId.value = draftLabels.value[0]?.id || ''
  }
}

function removeLabel(id) {
  draftLabels.value = draftLabels.value.filter((x) => x.id !== id)
  relationDraft.value = relationDraft.value.filter((r) => r.headId !== id && r.tailId !== id)
  if (selectedId.value === id) selectedId.value = draftLabels.value[0]?.id || ''
}

function addDemoLabel() {
  const m = modalityPreview.value
  const id = `new-${Date.now()}`
  if (m === 'text_ner') {
    draftLabels.value.push({ id, text: '新实体', type: selectedLabel.value || 'PERSON', start: 0, end: 2 })
  } else if (m === 'seg') {
    draftLabels.value.push({
      id,
      label: selectedLabel.value || 'object',
      color: '#f5222d',
      area: 0.05,
      conf: 0.8,
      polygon: [
        [0.2, 0.2],
        [0.45, 0.18],
        [0.5, 0.42],
        [0.22, 0.48],
      ],
    })
  } else if (m === 'audio_slice') {
    draftLabels.value.push({
      id,
      start: 0.5,
      end: 1.8,
      label: selectedLabel.value || '其他',
      text: '新切片',
      speaker: 'spk-1',
    })
  } else if (m === 'video_det') {
    draftLabels.value.push({
      id,
      frame: videoFrame.value,
      trackId: `T-${draftLabels.value.length + 1}`,
      label: selectedLabel.value || 'other',
      x: 0.12,
      y: 0.15,
      w: 0.22,
      h: 0.2,
      conf: 0.82,
    })
  } else {
    draftLabels.value.push({
      id,
      label: selectedLabel.value || 'noise',
      points: 120 + Math.floor(Math.random() * 400),
      color: '#8c8c8c',
    })
  }
  selectedId.value = id
}

function onTextMouseUp() {
  if (modalityPreview.value !== 'text_ner') return
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) return
  const text = resource.value?.text || ''
  const picked = sel.toString()
  if (!picked.trim()) return
  const start = text.indexOf(picked)
  if (start < 0) return
  const id = `ent-${Date.now()}`
  draftLabels.value.push({
    id,
    text: picked,
    type: selectedLabel.value || 'PERSON',
    start,
    end: start + picked.length,
  })
  selectedId.value = id
  sel.removeAllRanges()
  notification.success({ message: `已标记实体「${picked}」`, placement: 'topRight' })
}

function onSegClick(e) {
  if (modalityPreview.value !== 'seg' || !drawMode.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  polyDraft.value.push([Number(x.toFixed(3)), Number(y.toFixed(3))])
}

function commitPolygon() {
  if (polyDraft.value.length < 3) {
    notification.warning({ message: '至少 3 个点闭合多边形', placement: 'topRight' })
    return
  }
  const id = `poly-${Date.now()}`
  draftLabels.value.push({
    id,
    label: selectedLabel.value || 'object',
    color: '#1677ff',
    area: Number((polyDraft.value.length * 0.01).toFixed(3)),
    conf: 0.9,
    polygon: [...polyDraft.value],
  })
  selectedId.value = id
  polyDraft.value = []
  drawMode.value = false
  notification.success({ message: '多边形 Mask 已生成（伪造坐标）', placement: 'topRight' })
}

function onVideoClick(e) {
  if (modalityPreview.value !== 'video_det' || !drawMode.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  const id = `box-${Date.now()}`
  draftLabels.value.push({
    id,
    frame: videoFrame.value,
    trackId: `T-${draftLabels.value.length + 1}`,
    label: selectedLabel.value || 'other',
    x: Math.max(0, x - 0.08),
    y: Math.max(0, y - 0.08),
    w: 0.16,
    h: 0.16,
    conf: 0.85,
  })
  selectedId.value = id
  drawMode.value = false
  notification.success({ message: `已在帧 ${videoFrame.value} 添加检测框`, placement: 'topRight' })
}

function addRelation() {
  if (draftLabels.value.length < 2) {
    notification.warning({ message: '至少两个实体才能建关系', placement: 'topRight' })
    return
  }
  const [a, b] = draftLabels.value
  relationDraft.value.push({
    id: `rel-${Date.now()}`,
    headId: a.id,
    tailId: b.id,
    type: 'located_in',
  })
}

async function onSave() {
  if (!task.value) return
  saving.value = true
  try {
    await saveLabels(task.value.id, draftLabels.value)
    notification.success({ message: '标注已保存（含画布交互结果）', placement: 'topRight' })
    await loadTask(task.value.id)
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
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
    notification.success({ message: '已提交初审', placement: 'topRight' })
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    saving.value = false
  }
}

function entityColor(type) {
  const map = {
    PERSON: '#1677ff',
    DATE: '#52c41a',
    ORDER_ID: '#fa8c16',
    ADDRESS: '#722ed1',
    PHONE: '#eb2f96',
    ORG: '#13c2c2',
  }
  return map[type] || '#666'
}

const highlightedText = computed(() => {
  const res = resource.value
  if (!res?.text) return []
  const ents = [...draftLabels.value].sort((a, b) => a.start - b.start)
  const parts = []
  let cursor = 0
  const text = res.text
  for (const e of ents) {
    if (e.start == null) continue
    if (e.start > cursor) parts.push({ t: text.slice(cursor, e.start), entity: null })
    parts.push({ t: text.slice(e.start, e.end), entity: e })
    cursor = e.end
  }
  if (cursor < text.length) parts.push({ t: text.slice(cursor), entity: null })
  return parts
})

function polyPoints(poly) {
  if (!poly?.length) return ''
  return poly.map((p) => `${p[0] * 100},${p[1] * 100}`).join(' ')
}

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}

const ornTableCols1 = [{ title: '分割类别', key: 'label', dataIndex: 'label' }, { title: '点数', dataIndex: 'points', width: 80 }]
</script>

<template>
  <div class="wb">
    <a-alert
      type="info"
      show-icon
      class="tip"
      message="详细标注工作台（伪造数据）：文本拖选建实体 · 图像点选多边形 · 语音调起止 · 视频逐帧画框 · 点云旋转选类。不接真实算法引擎。"
    />

    <div class="wb-grid">
      <a-card class="pane">
        <template #title>Cell Samples / Modality</template>
        <div class="domain-chip">Orion · Robot Cell · WS-SG</div>
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
        <a-select :value="currentId" style="width: 100%" show-search @change="switchTask">
          <a-select-option v-for="t in taskList" :key="t.id" :value="t.id">
            {{ `${t.id} · ${getModalityMeta(t.modality)?.short}` }}
          </a-select-option>
        </a-select>
        <div v-if="task" class="task-meta">
          <div>{{ task.title }}</div>
          <a-tag :color="mapTagColor(getStatusMeta(task.status)?.color || 'info')">
            {{ getStatusMeta(task.status)?.label }}
          </a-tag>
        </div>
      </a-card>

      <a-card class="pane center">
        <template #title>
          <div class="center-head">
            <span>{{ resource?.title || '预览区' }}</span>
            <a-space>
              <a-tag>{{ getModalityMeta(modalityPreview)?.label }}</a-tag>
              <a-switch
                v-if="modalityPreview === 'seg' || modalityPreview === 'video_det'"
                v-model:checked="drawMode"
                checked-children="绘制开"
                un-checked-children="绘制关"
                size="small"
              />
            </a-space>
          </div>
        </template>

        <!-- text -->
        <div v-if="modalityPreview === 'text_ner'" class="canvas text-canvas">
          <p class="hint-inline">在正文中拖选文字即可新建实体</p>
          <p class="text-body" @mouseup="onTextMouseUp">
            <template v-for="(p, i) in highlightedText" :key="i">
              <mark
                v-if="p.entity"
                :style="{
                  background: entityColor(p.entity.type) + '33',
                  borderBottom: '2px solid ' + entityColor(p.entity.type),
                }"
              >
                {{ p.t }}<sup>{{ p.entity.type }}</sup>
              </mark>
              <span v-else>{{ p.t }}</span>
            </template>
          </p>
          <a-divider style="margin: 10px 0" />
          <div class="rel-box">
            <b>实体关系</b>
            <a-button size="small" type="link" @click="addRelation">+ 建立关系</a-button>
            <div v-for="r in relationDraft" :key="r.id" class="rel-row">
              {{ r.headId }} —[{{ r.type }}]→ {{ r.tailId }}
            </div>
            <a-empty v-if="!relationDraft.length" description="暂无关系" :image-style="{ height: '40px' }" />
          </div>
        </div>

        <!-- seg -->
        <div v-else-if="modalityPreview === 'seg'" class="canvas img-canvas">
          <p class="hint-inline">开启绘制后点击图像加点，完成后点「闭合多边形」</p>
          <div class="img-wrap" @click="onSegClick">
            <img :src="resource.imageUrl" alt="seg" />
            <svg class="overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                v-for="m in draftLabels"
                :key="m.id"
                :points="polyPoints(m.polygon)"
                :fill="(m.color || '#1677ff') + '55'"
                :stroke="m.color || '#1677ff'"
                stroke-width="0.4"
              />
              <polyline
                v-if="polyDraft.length"
                :points="polyPoints(polyDraft)"
                fill="none"
                stroke="#faad14"
                stroke-width="0.5"
              />
            </svg>
          </div>
          <a-space style="margin-top: 8px">
            <a-button size="small" :disabled="!drawMode" @click="commitPolygon">闭合多边形 / 生成 Mask</a-button>
            <a-button size="small" @click="polyDraft = []">清空草稿点</a-button>
            <span class="axis">草稿点数 {{ polyDraft.length }}</span>
          </a-space>
        </div>

        <!-- audio -->
        <div v-else-if="modalityPreview === 'audio_slice'" class="canvas audio-canvas">
          <img :src="resource.waveformUrl || resource.audioUrl" alt="waveform" class="wave" />
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
              :class="{ active: s.id === selectedId }"
              :style="{
                left: (s.start / resource.durationSec) * 100 + '%',
                width: ((s.end - s.start) / resource.durationSec) * 100 + '%',
              }"
              @click="selectedId = s.id"
            >
              {{ s.label }}
            </div>
          </div>
          <div class="axis">0s — {{ resource.durationSec }}s · 点击切片后右侧可改起止/说话人</div>
        </div>

        <!-- video -->
        <div v-else-if="modalityPreview === 'video_det'" class="canvas video-canvas">
          <p class="hint-inline">拖动帧滑条逐帧浏览；开启绘制后点击画面落框（含 trackId）</p>
          <div class="img-wrap" @click="onVideoClick">
            <video
              v-if="resource.videoUrl && String(resource.videoUrl).endsWith('.mp4')"
              class="media-video"
              :src="resource.videoUrl"
              :poster="resource.posterUrl"
              controls
              preload="metadata"
            />
            <img v-else :src="resource.posterUrl" alt="video" />
            <div
              v-for="d in frameDetections"
              :key="d.id"
              class="det-box"
              :class="{ active: d.id === selectedId }"
              :style="{
                left: d.x * 100 + '%',
                top: d.y * 100 + '%',
                width: d.w * 100 + '%',
                height: d.h * 100 + '%',
              }"
              @click.stop="selectedId = d.id"
            >
              {{ d.label }} · {{ d.trackId || 'T?' }} @f{{ d.frame }}
            </div>
          </div>
          <div class="frame-row">
            <span>帧 {{ videoFrame }} / {{ resource.frames || 120 }}</span>
            <a-slider v-model:value="videoFrame" :min="1" :max="resource.frames || 120" style="flex: 1; margin: 0 12px" />
            <a-button size="small" @click="videoFrame = Math.max(1, videoFrame - 1)">上一帧</a-button>
            <a-button size="small" @click="videoFrame = Math.min(resource.frames || 120, videoFrame + 1)">下一帧</a-button>
          </div>
        </div>

        <!-- point cloud -->
        <div v-else class="canvas pc-canvas">
          <p class="hint-inline">拖动下方滑条模拟三维旋转（伪造渲染，非真实点云引擎）</p>
          <div
            class="pc-stage"
            :style="{ transform: `perspective(800px) rotateX(${pcRotate.x}deg) rotateY(${pcRotate.y}deg)` }"
          >
            <img :src="resource.previewUrl" alt="pointcloud" class="pc-img" />
          </div>
          <a-row :gutter="12" style="margin-top: 8px">
            <a-col :span="12">俯仰 <a-slider v-model:value="pcRotate.x" :min="-60" :max="60" /></a-col>
            <a-col :span="12">水平 <a-slider v-model:value="pcRotate.y" :min="-180" :max="180" /></a-col>
          </a-row>
          <a-table
            :data-source="draftLabels"
            :columns="ornTableCols1"
            :pagination="false"
            row-key="id"
            size="small"
            :custom-row="(record) => ({ onClick: () => (selectedId = record.id) })"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'label'">
                <span class="swatch" :style="{ background: record.color }" />
                {{ record.label }}
              </template>
            </template>
          </a-table>
          <div class="axis">总点数 {{ resource.points?.toLocaleString?.() || resource.points }}</div>
        </div>
      </a-card>

      <a-card class="pane">
        <template #title>标签与属性</template>
        <a-form layout="vertical" size="small">
          <a-form-item label="当前标签类别">
            <a-select v-model:value="selectedLabel" style="width: 100%">
              <a-select-option v-for="l in resource?.labelSet || []" :key="l" :value="l">{{ l }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
        <a-space wrap>
          <a-button size="small" @click="addDemoLabel">添加实例</a-button>
        </a-space>
        <a-divider />
        <div class="label-list">
          <div
            v-for="item in draftLabels"
            :key="item.id"
            class="label-row"
            :class="{ active: item.id === selectedId }"
            @click="selectedId = item.id"
          >
            <div class="label-main">
              <strong>{{ item.type || item.label }}</strong>
              <span class="muted">{{ item.text || item.trackId || item.id }}</span>
            </div>
            <a-button type="link" danger size="small" @click.stop="removeLabel(item.id)">删</a-button>
          </div>
          <a-empty v-if="!draftLabels.length" description="暂无标签" />
        </div>

        <div v-if="selectedItem && modalityPreview === 'audio_slice'" class="editor">
          <div class="sec">切片编辑</div>
          <a-form layout="vertical" size="small">
            <a-form-item label="起始(s)"><a-input-number v-model:value="selectedItem.start" :min="0" :step="0.1" style="width: 100%" /></a-form-item>
            <a-form-item label="结束(s)"><a-input-number v-model:value="selectedItem.end" :min="0" :step="0.1" style="width: 100%" /></a-form-item>
            <a-form-item label="说话人"><a-input v-model:value="selectedItem.speaker" placeholder="spk-1" /></a-form-item>
            <a-form-item label="关联文本"><a-input v-model:value="selectedItem.text" /></a-form-item>
          </a-form>
        </div>

        <div v-if="selectedItem && modalityPreview === 'video_det'" class="editor">
          <div class="sec">检测框属性</div>
          <a-form layout="vertical" size="small">
            <a-form-item label="帧号"><a-input-number v-model:value="selectedItem.frame" :min="1" style="width: 100%" /></a-form-item>
            <a-form-item label="Track ID"><a-input v-model:value="selectedItem.trackId" /></a-form-item>
            <a-form-item label="置信度"><a-input-number v-model:value="selectedItem.conf" :min="0" :max="1" :step="0.01" style="width: 100%" /></a-form-item>
          </a-form>
        </div>

        <ProgressMock :running="saving" label="保存 / 提交处理中" />
        <div class="actions">
          <a-button :disabled="!task || saving" @click="onSave">保存标注</a-button>
          <a-button type="primary" :disabled="!task || !canSubmitReview || saving" @click="onSubmit">提交初审</a-button>
        </div>
        <p class="hint">当前身份：{{ auth.user?.name }}</p>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.tip { margin-bottom: 12px; }
.wb-grid {
  display: grid;
  grid-template-columns: 220px 1fr 280px;
  gap: 12px;
  min-height: 560px;
}
.pane { min-height: 560px; }
.domain-chip {
  display: inline-block;
  margin-bottom: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #111827;
  color: #a5b4fc;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.mod-item {
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  margin-bottom: 6px;
  background: #fafafa;
}
.mod-item:hover { border-color: #818cf8; }
.mod-item.active { background: #111827; border-color: #818cf8; color: #e5e7eb; }
.mod-item.active .mod-sub,
.mod-item.active .mod-hint { color: #a5b4fc; }
.mod-title { font-size: 13px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.mod-sub { font-size: 11px; color: #6b7280; }
.mod-hint { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.sec { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
.task-meta { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.center-head { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.hint-inline { margin: 0 0 8px; font-size: 12px; color: #64748b; }
.canvas { min-height: 380px; }
.text-body {
  line-height: 1.9;
  font-size: 15px;
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  user-select: text;
}
.text-body mark { padding: 0 2px; border-radius: 2px; }
.text-body sup { font-size: 10px; margin-left: 2px; opacity: 0.8; }
.rel-box { font-size: 12px; }
.rel-row { color: #475569; margin-top: 4px; }
.img-wrap {
  position: relative;
  width: 100%;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
}
.img-wrap img, .media-video { display: block; width: 100%; height: auto; }
.overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.mask-box, .det-box {
  position: absolute;
  border: 2px solid #1677ff;
  color: #fff;
  font-size: 11px;
  padding: 2px 4px;
  box-sizing: border-box;
  background: #1677ff33;
  cursor: pointer;
}
.det-box.active { border-color: #faad14; box-shadow: 0 0 0 1px #faad14; }
.audio-player { width: 100%; margin: 8px 0 4px; }
.wave { width: 100%; border-radius: 8px; background: #0b1220; }
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
  background: #1677ff88;
  border: 1px solid #1677ff;
  border-radius: 4px;
  font-size: 11px;
  padding: 0 4px;
  color: #003a8c;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
}
.slice.active { outline: 2px solid #faad14; }
.axis { margin-top: 8px; font-size: 12px; color: #6b7280; }
.frame-row { display: flex; align-items: center; margin-top: 10px; gap: 6px; font-size: 12px; }
.pc-stage {
  transform-origin: center;
  transition: transform 0.15s ease;
  border-radius: 8px;
  overflow: hidden;
  background: #0b1220;
}
.pc-img { width: 100%; display: block; }
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  margin-right: 6px;
  vertical-align: middle;
}
.label-list { max-height: 200px; overflow: auto; margin-bottom: 12px; }
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 4px;
  border-bottom: 1px dashed #eee;
  cursor: pointer;
}
.label-row.active { background: #e6f4ff; border-radius: 6px; }
.label-main { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.muted { color: #9ca3af; font-size: 12px; }
.editor { background: #f8fafc; padding: 8px; border-radius: 8px; margin-bottom: 10px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.hint { margin-top: 10px; font-size: 12px; color: #9ca3af; }
@media (max-width: 1100px) {
  .wb-grid { grid-template-columns: 1fr; }
}
</style>
