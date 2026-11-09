<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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
const currentFrame = ref(0)
const showTrackOnly = ref('')
const pcRotate = reactive({ x: -18, y: 24 })

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

async function loadList() {
  const res = await listQcTasks({ page: 1, pageSize: 500 })
  taskList.value = res.items
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
    ElMessage.error(e.message || '加载失败')
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
      polygon: [
        [0.3, 0.3],
        [0.45, 0.3],
        [0.45, 0.45],
        [0.3, 0.45],
      ],
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
      frame: currentFrame.value || 1,
      label: selectedLabel.value || 'other',
      x: 0.1,
      y: 0.1,
      w: 0.2,
      h: 0.2,
      conf: 0.8,
      trackId: `trk-${selectedLabel.value || 'new'}`,
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
    ElMessage.success('标注已保存')
    await loadTask(task.value.id)
  } catch (e) {
    ElMessage.error(e.message)
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
    ElMessage.success('已提交初审')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    ElMessage.error(e.message)
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

const videoFrameLabels = computed(() => {
  let rows = draftLabels.value.filter((d) => Number(d.frame) === Number(currentFrame.value))
  if (showTrackOnly.value) rows = rows.filter((d) => d.trackId === showTrackOnly.value)
  return rows
})

const trackOptions = computed(() => {
  const set = new Set(draftLabels.value.map((d) => d.trackId).filter(Boolean))
  return [...set]
})

const maxFrame = computed(() => Number(resource.value?.frames || 180))
</script>

<template>
  <div class="wb" v-loading="loading">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="标注工作台：左侧切换五模态样例，中间预览画布，右侧标签与提交。提交后工单进入初审。"
      class="tip"
    />

    <div class="wb-grid">
      <!-- Left: resources -->
      <el-card shadow="never" class="pane">
        <template #header>
          <span>仓储样例 / 模态</span>
        </template>
        <div class="domain-chip">DataLink · 仓储物流域</div>
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
        <el-divider />
        <div class="task-pick">
          <div class="sec">工单</div>
          <el-select
            :model-value="currentId"
            placeholder="选择工单"
            style="width: 100%"
            filterable
            @change="switchTask"
          >
            <el-option
              v-for="t in taskList"
              :key="t.id"
              :label="`${t.id} · ${getModalityMeta(t.modality)?.short}`"
              :value="t.id"
            />
          </el-select>
          <div v-if="task" class="task-meta">
            <div>{{ task.title }}</div>
            <el-tag size="small" :type="getStatusMeta(task.status)?.color || 'info'">
              {{ getStatusMeta(task.status)?.label }}
            </el-tag>
          </div>
        </div>
      </el-card>

      <!-- Center: canvas -->
      <el-card shadow="never" class="pane center">
        <template #header>
          <div class="center-head">
            <span>{{ resource?.title || '预览区' }}</span>
            <el-tag size="small">{{ getModalityMeta(modalityPreview)?.label }}</el-tag>
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
            <svg class="poly-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                v-for="m in draftLabels"
                :key="m.id"
                :points="
                  (m.polygon || [])
                    .map((p) => `${p[0] * 100},${p[1] * 100}`)
                    .join(' ')
                "
                :fill="(m.color || '#1677ff') + '55'"
                :stroke="m.color || '#1677ff'"
                stroke-width="0.6"
              />
            </svg>
            <div
              v-for="(m, idx) in draftLabels"
              :key="'cap-' + m.id"
              class="mask-box"
              :style="{
                left: (m.polygon?.[0]?.[0] || 0.08 + (idx % 3) * 0.28) * 100 + '%',
                top: (m.polygon?.[0]?.[1] || 0.12 + Math.floor(idx / 3) * 0.3) * 100 + '%',
                borderColor: m.color,
                background: 'transparent',
                width: 'auto',
                height: 'auto',
                padding: '2px 6px',
              }"
            >
              {{ m.label }}
            </div>
          </div>
          <div class="axis">多边形顶点可在右侧标签中查看（演示）</div>
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
              :style="{
                left: (s.start / resource.durationSec) * 100 + '%',
                width: ((s.end - s.start) / resource.durationSec) * 100 + '%',
              }"
              :title="`${s.label}: ${s.text}`"
            >
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
              preload="metadata"
            />
            <img v-else :src="resource.posterUrl" alt="video" />
            <div
              v-for="d in videoFrameLabels"
              :key="d.id"
              class="det-box"
              :style="{
                left: d.x * 100 + '%',
                top: d.y * 100 + '%',
                width: d.w * 100 + '%',
                height: d.h * 100 + '%',
              }"
            >
              {{ d.label }} · {{ d.trackId || 'no-track' }} @f{{ d.frame }}
            </div>
          </div>
          <div class="frame-bar">
            <span>帧 {{ currentFrame }} / {{ maxFrame }}</span>
            <el-slider v-model="currentFrame" :min="0" :max="maxFrame" :step="1" style="flex: 1" />
            <el-select v-model="showTrackOnly" clearable placeholder="按 track 过滤" style="width: 150px" size="small">
              <el-option v-for="t in trackOptions" :key="t" :label="t" :value="t" />
            </el-select>
          </div>
          <div class="axis">
            FPS {{ resource.fps }} · 当前帧框 {{ videoFrameLabels.length }} · 跨帧跟踪 trackId
          </div>
        </div>

        <!-- point cloud -->
        <div v-else class="canvas pc-canvas">
          <p class="axis" style="margin-bottom: 8px">拖动滑条模拟三维旋转（演示渲染，非真实点云引擎）</p>
          <div
            class="pc-stage"
            :style="{ transform: `perspective(800px) rotateX(${pcRotate.x}deg) rotateY(${pcRotate.y}deg)` }"
          >
            <img
              v-if="resource?.previewUrl"
              :src="resource.previewUrl"
              alt="pointcloud"
              class="pc-img"
            />
            <el-empty v-else description="点云预览图缺失" :image-size="80" />
          </div>
          <div class="frame-bar">
            <span>俯仰</span>
            <el-slider v-model="pcRotate.x" :min="-60" :max="60" style="flex: 1" />
            <span>水平</span>
            <el-slider v-model="pcRotate.y" :min="-180" :max="180" style="flex: 1" />
          </div>
          <el-table :data="draftLabels" size="small" stripe style="margin-top: 12px">
            <el-table-column prop="label" label="分割类别" />
            <el-table-column prop="points" label="点数" width="100" />
            <el-table-column label="色标" width="80">
              <template #default="{ row }">
                <span class="swatch" :style="{ background: row.color }" />
              </template>
            </el-table-column>
          </el-table>
          <div class="axis">总点数 {{ resource?.points?.toLocaleString?.() || resource?.points || '—' }}</div>
        </div>
      </el-card>

      <!-- Right: labels -->
      <el-card shadow="never" class="pane">
        <template #header>
          <span>标签与操作</span>
        </template>
        <el-form label-position="top" size="small">
          <el-form-item label="当前标签集">
            <el-select v-model="selectedLabel" style="width: 100%">
              <el-option
                v-for="l in resource?.labelSet || []"
                :key="l"
                :label="l"
                :value="l"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <el-button size="small" @click="addDemoLabel">添加标签实例</el-button>
        <el-divider />
        <div class="label-list">
          <div v-for="item in draftLabels" :key="item.id" class="label-row">
            <div class="label-main">
              <strong>{{ item.type || item.label }}</strong>
              <span class="muted">
                {{ item.text || item.trackId || item.id }}
                <template v-if="item.frame != null"> · f{{ item.frame }}</template>
                <template v-if="item.polygon?.length"> · {{ item.polygon.length }} 顶点</template>
              </span>
            </div>
            <el-button link type="danger" size="small" @click="removeLabel(item.id)">删</el-button>
          </div>
          <el-empty v-if="!draftLabels.length" description="暂无标签" :image-size="48" />
        </div>
        <ProgressMock :running="saving" label="保存 / 提交处理中" />
        <div class="actions">
          <el-button :disabled="!task || saving" @click="onSave">保存标注</el-button>
          <el-button
            type="primary"
            :disabled="!task || !canSubmitReview || saving || auth.role === 'reviewer' && false"
            @click="onSubmit"
          >
            提交初审
          </el-button>
        </div>
        <p class="hint">当前身份：{{ auth.user?.name }}（不可终审，终审在「多级审核」）</p>
      </el-card>
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
.domain-chip {
  display: inline-block;
  margin-bottom: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 11px;
  font-weight: 600;
}
.mod-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 6px;
  border-left: 3px solid #bae6fd;
}
.mod-item:hover {
  background: #f0f9ff;
}
.mod-item.active {
  background: #e0f2fe;
  border-color: #38bdf8;
  border-left-color: #0284c7;
}
.mod-title {
  font-size: 13px;
  font-weight: 600;
}
.mod-sub {
  font-size: 11px;
  color: #0369a1;
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
.poly-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.frame-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
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
