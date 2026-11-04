<script setup>import { notification } from 'ant-design-vue'

import { computed, onMounted, ref, watch } from 'vue'
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

const currentId = computed(() => route.params.id)

const resource = computed(() => task.value?.resource || SAMPLE_RESOURCES[modalityPreview.value])

const canSubmitReview = computed(() => {
  if (!task.value) return false
  return ['annotating', 'assigned', 'rejected'].includes(task.value.status)
})

async function loadList() {
  taskList.value = await listQcTasks()
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
    const set = resource.value?.labelSet || []
    selectedLabel.value = set[0] || ''
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
  if (!task.value || task.value.modality !== m) {
    const demo = SAMPLE_RESOURCES[m]
    draftLabels.value = JSON.parse(
      JSON.stringify(
        demo.entities || demo.masks || demo.slices || demo.detections || demo.segments || [],
      ),
    )
    selectedLabel.value = (demo.labelSet && demo.labelSet[0]) || ''
  }
}

function removeLabel(id) {
  draftLabels.value = draftLabels.value.filter((x) => x.id !== id)
}

function addDemoLabel() {
  const m = modalityPreview.value
  const id = `new-${Date.now()}`
  if (m === 'text_ner') {
    draftLabels.value.push({
      id,
      text: '新实体',
      type: selectedLabel.value || 'PERSON',
      start: 0,
      end: 2,
    })
  } else if (m === 'seg') {
    draftLabels.value.push({
      id,
      label: selectedLabel.value || 'object',
      color: '#f5222d',
      area: 0.05,
      conf: 0.8,
    })
  } else if (m === 'audio_slice') {
    draftLabels.value.push({
      id,
      start: 0,
      end: 1,
      label: selectedLabel.value || '其他',
      text: '新切片',
    })
  } else if (m === 'video_det') {
    draftLabels.value.push({
      id,
      frame: 1,
      label: selectedLabel.value || 'other',
      x: 0.1,
      y: 0.1,
      w: 0.2,
      h: 0.2,
      conf: 0.8,
    })
  } else {
    draftLabels.value.push({
      id,
      label: selectedLabel.value || 'noise',
      points: 100,
      color: '#8c8c8c',
    })
  }
}

async function onSave() {
  if (!task.value) return
  saving.value = true
  try {
    await saveLabels(task.value.id, draftLabels.value)
    notification.success({ message: '标注已保存', placement: 'topRight' })
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

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}

const ornTableCols1 = [
  { title: '分割类别', key: 'label', dataIndex: 'label' }
]
</script>

<template>
  <div class="wb" :loading="loading">
    <a-alert
      type="info"
      :closable="false"
      show-icon
      message="标注工作台：左侧切换五模态样例，中间预览画布，右侧标签与提交。提交后工单进入初审。"
      class="tip" />

    <div class="wb-grid">
      <!-- Left: resources -->
      <a-card  class="pane">
        <template #title>
          <span>资源 / 模态</span>
        </template>
        <div class="mod-list">
          <div
            v-for="m in MODALITIES"
            :key="m.value"
            class="mod-item"
            :class="{ active: modalityPreview === m.value }"
            @click="previewModality(m.value)">
            <div class="mod-title">{{ m.label }}</div>
            <div class="mod-sub">{{ m.short }}</div>
          </div>
        </div>
        <a-divider />
        <div class="task-pick">
          <div class="sec">工单</div>
          <a-select
            :value="currentId"
            placeholder="选择工单"
            style="width: 100%"
            show-search
            @change="switchTask">
            <a-select-option
              v-for="t in taskList"
              :key="t.id"
              :value="t.id">{{ `${t.id} · ${getModalityMeta(t.modality)?.short}` }}</a-select-option>
          </a-select>
          <div v-if="task" class="task-meta">
            <div>{{ task.title }}</div>
            <a-tag size="small" :color="mapTagColor(getStatusMeta(task.status)?.color || 'info')">
              {{ getStatusMeta(task.status)?.label }}
            </a-tag>
          </div>
        </div>
      </a-card>

      <!-- Center: canvas -->
      <a-card  class="pane center">
        <template #title>
          <div class="center-head">
            <span>{{ resource?.title || '预览区' }}</span>
            <a-tag size="small">{{ getModalityMeta(modalityPreview)?.label }}</a-tag>
          </div>
        </template>

        <!-- text NER -->
        <div v-if="modalityPreview === 'text_ner'" class="canvas text-canvas">
          <p class="text-body">
            <template v-for="(p, i) in highlightedText" :key="i">
              <mark v-if="p.entity" :style="{ background: entityColor(p.entity.type) + '33', borderBottom: '2px solid ' + entityColor(p.entity.type) }">
                {{ p.t }}<sup>{{ p.entity.type }}</sup>
              </mark>
              <span v-else>{{ p.t }}</span>
            </template>
          </p>
        </div>

        <!-- image seg -->
        <div v-else-if="modalityPreview === 'seg'" class="canvas img-canvas">
          <div class="img-wrap">
            <img :src="resource.imageUrl" alt="seg" />
            <div
              v-for="(m, idx) in draftLabels"
              :key="m.id"
              class="mask-box"
              :style="{
                left: 8 + (idx % 3) * 28 + '%',
                top: 12 + Math.floor(idx / 3) * 30 + '%',
                width: 22 + '%',
                height: 22 + '%',
                borderColor: m.color,
                background: m.color + '33',
              }">
              {{ m.label }}
            </div>
          </div>
        </div>

        <!-- audio -->
        <div v-else-if="modalityPreview === 'audio_slice'" class="canvas audio-canvas">
          <img :src="resource.waveformUrl || resource.audioUrl" alt="waveform" class="wave" />
          <audio
            v-if="resource.audioUrl && String(resource.audioUrl).endsWith('.wav')"
            class="audio-player"
            :src="resource.audioUrl"
            controls
            preload="metadata" />
          <div class="timeline">
            <div
              v-for="s in draftLabels"
              :key="s.id"
              class="slice"
              :style="{
                left: (s.start / resource.durationSec) * 100 + '%',
                width: ((s.end - s.start) / resource.durationSec) * 100 + '%',
              }"
              :title="`${s.label}: ${s.text}`">
              {{ s.label }}
            </div>
          </div>
          <div class="axis">0s — {{ resource.durationSec }}s</div>
        </div>

        <!-- video -->
        <div v-else-if="modalityPreview === 'video_det'" class="canvas video-canvas">
          <div class="img-wrap">
            <video
              v-if="resource.videoUrl && String(resource.videoUrl).endsWith('.mp4')"
              class="media-video"
              :src="resource.videoUrl"
              :poster="resource.posterUrl"
              controls
              preload="metadata" />
            <img v-else :src="resource.posterUrl" alt="video" />
            <div
              v-for="d in draftLabels"
              :key="d.id"
              class="det-box"
              :style="{
                left: d.x * 100 + '%',
                top: d.y * 100 + '%',
                width: d.w * 100 + '%',
                height: d.h * 100 + '%',
              }">
              {{ d.label }}@f{{ d.frame }}
            </div>
          </div>
          <div class="axis">FPS {{ resource.fps }} · 总帧 {{ resource.frames }}</div>
        </div>

        <!-- point cloud -->
        <div v-else class="canvas pc-canvas">
          <img :src="resource.previewUrl" alt="pointcloud" class="pc-img" />
          <a-table :data-source="draftLabels" :columns="ornTableCols1" :pagination="false" row-key="id" size="small">
  <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'label'">
<span class="swatch" :style="{ background: record.color }" />
      </template>
  </template>
</a-table>
          <div class="axis">总点数 {{ resource.points?.toLocaleString?.() || resource.points }}</div>
        </div>
      </a-card>

      <!-- Right: labels -->
      <a-card  class="pane">
        <template #title>
          <span>标签与操作</span>
        </template>
        <a-form layout="vertical" size="small">
          <a-form-item label="当前标签集">
            <a-select v-model:value="selectedLabel" style="width: 100%">
              <a-select-option
                v-for="l in resource?.labelSet || []"
                :key="l"
                :value="l">{{ l }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
        <a-button size="small" @click="addDemoLabel">添加标签实例</a-button>
        <a-divider />
        <div class="label-list">
          <div v-for="item in draftLabels" :key="item.id" class="label-row">
            <div class="label-main">
              <strong>{{ item.type || item.label }}</strong>
              <span class="muted">{{ item.text || item.id }}</span>
            </div>
            <a-button  type="link" danger size="small" @click="removeLabel(item.id)">删</a-button>
          </div>
          <a-empty v-if="!draftLabels.length" description="暂无标签" />
        </div>
        <ProgressMock :running="saving" label="保存 / 提交处理中" />
        <div class="actions">
          <a-button :disabled="!task || saving" @click="onSave">保存标注</a-button>
          <a-button
            type="primary"
            :disabled="!task || !canSubmitReview || saving || auth.role === 'reviewer' && false"
            @click="onSubmit">
            提交初审
          </a-button>
        </div>
        <p class="hint">当前身份：{{ auth.user?.name }}（不可终审，终审在「多级审核」）</p>
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
  grid-template-columns: 220px 1fr 260px;
  gap: 12px;
  min-height: 560px;
}
.pane {
  min-height: 520px;
}
.mod-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 6px;
}
.mod-item:hover {
  background: #f5f7fa;
}
.mod-item.active {
  background: #e6f4ff;
  border-color: #91caff;
}
.mod-title {
  font-size: 13px;
  font-weight: 600;
}
.mod-sub {
  font-size: 11px;
  color: #6b7280;
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
}
.canvas {
  min-height: 360px;
}
.text-body {
  line-height: 1.9;
  font-size: 15px;
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #eee;
}
.text-body mark {
  padding: 0 2px;
  border-radius: 2px;
}
.text-body sup {
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.8;
}
.img-wrap {
  position: relative;
  width: 100%;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
}
.img-wrap img {
  display: block;
  width: 100%;
  height: auto;
}
.mask-box,
.det-box {
  position: absolute;
  border: 2px solid #1677ff;
  color: #fff;
  font-size: 11px;
  padding: 2px 4px;
  box-sizing: border-box;
  pointer-events: none;
}
.audio-player {
  width: 100%;
  margin: 8px 0 4px;
}
.media-video {
  display: block;
  width: 100%;
  max-height: 360px;
  background: #0f172a;
}
.wave {
  width: 100%;
  border-radius: 8px;
  background: #0b1220;
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
  background: #1677ff88;
  border: 1px solid #1677ff;
  border-radius: 4px;
  font-size: 11px;
  padding: 0 4px;
  color: #003a8c;
  overflow: hidden;
  white-space: nowrap;
}
.axis {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}
.pc-img {
  width: 100%;
  border-radius: 8px;
  background: #0b1220;
}
.swatch {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  vertical-align: middle;
}
.label-list {
  max-height: 260px;
  overflow: auto;
  margin-bottom: 12px;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #eee;
}
.label-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
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
@media (max-width: 1100px) {
  .wb-grid {
    grid-template-columns: 1fr;
  }
}
</style>
