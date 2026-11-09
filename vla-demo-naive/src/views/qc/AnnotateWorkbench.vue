<script setup>
import { message } from '@/ui/discrete'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NInputNumber, NSelect, NTag } from 'naive-ui'
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
const activeId = ref(null)
const videoFrameFilter = ref(null)
const note = ref('')
const showHistory = ref(true)

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
const activeItem = computed(() => draftLabels.value.find((x) => x.id === activeId.value) || null)
const labelOptions = computed(() => (resource.value?.labelSet || []).map((l) => ({ label: l, value: l })))

const canSubmitReview = computed(() => {
  if (!task.value) return false
  return ['annotating', 'assigned', 'rejected'].includes(task.value.status)
})

const visibleDetections = computed(() => {
  if (modalityPreview.value !== 'video_det') return draftLabels.value
  if (videoFrameFilter.value == null) return draftLabels.value
  return draftLabels.value.filter((d) => d.frame === videoFrameFilter.value)
})

const entityStats = computed(() => {
  const map = {}
  for (const e of draftLabels.value) {
    const k = e.type || e.label || 'other'
    map[k] = (map[k] || 0) + 1
  }
  return Object.entries(map).map(([k, v]) => ({ type: k, count: v }))
})

const pcColumns = [
  {
    title: '色',
    key: 'color',
    width: 40,
    render: (r) => h('span', { class: 'swatch', style: { background: r.color || '#666' } }),
  },
  { title: '类别', key: 'label' },
  { title: '点数', key: 'points', width: 90 },
  {
    title: '占比',
    key: 'ratio',
    width: 80,
    render: (r) => {
      const total = resource.value?.points || 1
      return `${(((r.points || 0) / total) * 100).toFixed(1)}%`
    },
  },
]

function entityColor(type) {
  const map = {
    PERSON: '#70c0e8',
    DATE: '#63e2b7',
    ORDER_ID: '#f0a020',
    ADDRESS: '#b39ddb',
    PHONE: '#e88080',
    ORG: '#13c2c2',
  }
  return map[type] || '#888'
}

const highlightedText = computed(() => {
  const res = resource.value
  if (!res?.text) return []
  const ents = [...draftLabels.value]
    .filter((e) => e.start != null)
    .sort((a, b) => a.start - b.start)
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
    selectedLabel.value = resource.value?.labelSet?.[0] || ''
    activeId.value = draftLabels.value[0]?.id || null
    note.value = ''
  } catch (e) {
    message.error(e.message || '加载失败')
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
      JSON.stringify(demo.entities || demo.masks || demo.slices || demo.detections || demo.segments || []),
    )
    selectedLabel.value = (demo.labelSet && demo.labelSet[0]) || ''
    activeId.value = draftLabels.value[0]?.id || null
  }
}

function removeLabel(id) {
  draftLabels.value = draftLabels.value.filter((x) => x.id !== id)
  if (activeId.value === id) activeId.value = draftLabels.value[0]?.id || null
}

function selectLabel(id) {
  activeId.value = id
}

function addDemoLabel() {
  const m = modalityPreview.value
  const id = `new-${Date.now()}`
  let item
  if (m === 'text_ner') {
    item = {
      id,
      text: selectedLabel.value || '新实体',
      type: selectedLabel.value || 'PERSON',
      start: 0,
      end: 2,
    }
  } else if (m === 'seg') {
    item = {
      id,
      label: selectedLabel.value || 'object',
      color: '#f5222d',
      area: 0.05,
      conf: 0.8,
    }
  } else if (m === 'audio_slice') {
    item = {
      id,
      start: 0,
      end: 0.8,
      label: selectedLabel.value || '其他',
      text: '新切片转写',
    }
  } else if (m === 'video_det') {
    item = {
      id,
      frame: videoFrameFilter.value || 1,
      label: selectedLabel.value || 'other',
      trackId: `trk-${selectedLabel.value || 'obj'}-${String(Date.now()).slice(-4)}`,
      shape: 'bbox',
      x: 0.15,
      y: 0.15,
      w: 0.2,
      h: 0.2,
      conf: 0.8,
    }
  } else {
    item = {
      id,
      label: selectedLabel.value || 'noise',
      points: 500,
      color: '#8c8c8c',
    }
  }
  draftLabels.value.push(item)
  activeId.value = id
  message.success('已添加标签实例')
}

async function onSave() {
  if (!task.value) return
  saving.value = true
  try {
    await saveLabels(task.value.id, draftLabels.value)
    message.success(`标注已保存（${draftLabels.value.length} 条）`)
    await loadTask(task.value.id)
  } catch (e) {
    message.error(e.message)
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
      await transition(task.value.id, 'annotating', note.value || '进入标注')
    }
    await transition(task.value.id, 'reviewing', note.value || '提交初审')
    message.success('已提交初审')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    saving.value = false
  }
}

function patchActive(field, val) {
  if (!activeItem.value) return
  activeItem.value[field] = val
}
</script>

<template>
  <div class="wb">
    <n-alert type="info" :bordered="false" class="tip">
      左：五模态样例切换 · 中：画布预览与实例高亮 · 右：属性编辑 / 保存提交。当前为演示假数据，可真实增删改并写入内存工单。
    </n-alert>

    <n-spin :show="loading">
      <div class="wb-grid">
        <n-card class="pane" :bordered="false">
          <template #header>EIDE 样例模态</template>
          <div class="domain-chip">Lingmou · 具身 / VLA</div>
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
          <n-divider />
          <div class="sec">工单切换</div>
          <n-select
            :value="currentId"
            filterable
            style="width: 100%"
            :options="taskList.map((t) => ({ label: `${t.id} · ${getModalityMeta(t.modality)?.short || t.modality}`, value: t.id }))"
            @update:value="switchTask"
          />
          <div v-if="task" class="task-meta">
            <div class="title">{{ task.title }}</div>
            <n-space size="small">
              <n-tag size="small" :type="getStatusMeta(task.status)?.color || 'info'" :bordered="false">
                {{ getStatusMeta(task.status)?.label || task.status }}
              </n-tag>
              <n-tag size="small" :bordered="false">{{ task.urgency }}</n-tag>
              <n-tag size="small" :bordered="false">{{ task.batchId || '—' }}</n-tag>
            </n-space>
            <div class="muted">分配：{{ task.assigneeId || '未分配' }}</div>
          </div>

          <n-divider />
          <div class="sec">标签分布</div>
          <div v-for="s in entityStats" :key="s.type" class="stat-row">
            <span>{{ s.type }}</span>
            <n-tag size="tiny" :bordered="false">{{ s.count }}</n-tag>
          </div>
        </n-card>

        <n-card class="pane center" :bordered="false">
          <template #header>
            <div class="center-head">
              <span>{{ resource?.title || '预览区' }}</span>
              <n-space size="small">
                <n-tag size="small" type="success" :bordered="false">{{ getModalityMeta(modalityPreview)?.label }}</n-tag>
                <n-tag size="small" :bordered="false">{{ draftLabels.length }} 实例</n-tag>
              </n-space>
            </div>
          </template>

          <div v-if="modalityPreview === 'text_ner'" class="canvas">
            <p class="text-body">
              <template v-for="(p, i) in highlightedText" :key="i">
                <mark
                  v-if="p.entity"
                  class="ent"
                  :class="{ on: p.entity.id === activeId }"
                  :style="{ background: entityColor(p.entity.type) + '44', borderBottomColor: entityColor(p.entity.type) }"
                  @click="selectLabel(p.entity.id)"
                >
                  {{ p.t }}<sup>{{ p.entity.type }}</sup>
                </mark>
                <span v-else>{{ p.t }}</span>
              </template>
            </p>
            <div class="legend">
              <span v-for="t in resource?.labelSet || []" :key="t" class="leg">
                <i :style="{ background: entityColor(t) }" />{{ t }}
              </span>
            </div>
          </div>

          <div v-else-if="modalityPreview === 'seg'" class="canvas">
            <div class="img-wrap">
              <img :src="resource.imageUrl" alt="seg" />
              <div
                v-for="(m, idx) in draftLabels"
                :key="m.id"
                class="mask-box"
                :class="{ on: m.id === activeId }"
                :style="{
                  left: 8 + (idx % 3) * 28 + '%',
                  top: 12 + Math.floor(idx / 3) * 30 + '%',
                  width: '22%',
                  height: '22%',
                  borderColor: m.color,
                  background: m.color + '33',
                }"
                @click="selectLabel(m.id)"
              >
                {{ m.label }} {{ m.conf != null ? `(${m.conf})` : '' }}
              </div>
            </div>
          </div>

          <div v-else-if="modalityPreview === 'audio_slice'" class="canvas">
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
                :class="{ on: s.id === activeId }"
                :style="{
                  left: (s.start / resource.durationSec) * 100 + '%',
                  width: ((s.end - s.start) / resource.durationSec) * 100 + '%',
                }"
                @click="selectLabel(s.id)"
              >
                {{ s.label }}
              </div>
            </div>
            <div class="axis">0s — {{ resource.durationSec }}s · 点击切片可编辑起止与转写</div>
          </div>

          <div v-else-if="modalityPreview === 'video_det'" class="canvas">
            <div class="frame-bar">
              <span>帧过滤</span>
              <n-input-number v-model:value="videoFrameFilter" :min="0" :max="resource.frames" clearable placeholder="全部帧" size="small" />
              <n-button size="tiny" @click="videoFrameFilter = null">全部</n-button>
            </div>
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
              <svg
                v-for="d in visibleDetections.filter((x) => x.shape === 'polygon' && x.polygon?.length)"
                :key="d.id + '-poly'"
                class="poly-layer"
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                @click="selectLabel(d.id)"
              >
                <polygon
                  :points="d.polygon.map((p) => p.join(',')).join(' ')"
                  :class="{ on: d.id === activeId }"
                />
              </svg>
              <div
                v-for="d in visibleDetections.filter((x) => x.shape !== 'polygon')"
                :key="d.id"
                class="det-box"
                :class="{ on: d.id === activeId }"
                :style="{
                  left: d.x * 100 + '%',
                  top: d.y * 100 + '%',
                  width: d.w * 100 + '%',
                  height: d.h * 100 + '%',
                }"
                @click="selectLabel(d.id)"
              >
                {{ d.label }} · {{ d.trackId || '—' }} @f{{ d.frame }}
              </div>
            </div>
            <div class="axis">
              FPS {{ resource.fps }} · 总帧 {{ resource.frames }} · 可见框 {{ visibleDetections.length }} · 轨迹数
              {{ new Set(visibleDetections.map((d) => d.trackId).filter(Boolean)).size }}
            </div>
          </div>

          <div v-else class="canvas">
            <img :src="resource.previewUrl" alt="pointcloud" class="pc-img" />
            <n-data-table class="mt" size="small" :columns="pcColumns" :data="draftLabels" :row-key="(r) => r.id" :bordered="false" />
            <div class="axis">总点数 {{ resource.points?.toLocaleString?.() || resource.points }}</div>
          </div>
        </n-card>

        <n-card class="pane" :bordered="false">
          <template #header>标签与属性</template>
          <n-form label-placement="top" size="small">
            <n-form-item label="标签集">
              <n-select v-model:value="selectedLabel" :options="labelOptions" />
            </n-form-item>
          </n-form>
          <n-button size="small" type="primary" secondary block @click="addDemoLabel">＋ 添加标签实例</n-button>
          <n-divider />

          <div class="label-list">
            <div
              v-for="item in draftLabels"
              :key="item.id"
              class="label-row"
              :class="{ on: item.id === activeId }"
              @click="selectLabel(item.id)"
            >
              <div class="label-main">
                <strong>{{ item.type || item.label }}</strong>
                <span class="muted">{{ item.text || item.id }}</span>
              </div>
              <n-button text type="error" size="tiny" @click.stop="removeLabel(item.id)">删</n-button>
            </div>
            <n-empty v-if="!draftLabels.length" description="暂无标签" />
          </div>

          <template v-if="activeItem">
            <n-divider>属性编辑</n-divider>
            <n-form label-placement="left" label-width="56" size="small">
              <n-form-item v-if="activeItem.type != null" label="类型">
                <n-select
                  :value="activeItem.type"
                  :options="labelOptions"
                  @update:value="(v) => patchActive('type', v)"
                />
              </n-form-item>
              <n-form-item v-if="activeItem.label != null && activeItem.type == null" label="类别">
                <n-select
                  :value="activeItem.label"
                  :options="labelOptions"
                  @update:value="(v) => patchActive('label', v)"
                />
              </n-form-item>
              <n-form-item v-if="activeItem.text != null" label="文本">
                <n-input :value="activeItem.text" @update:value="(v) => patchActive('text', v)" />
              </n-form-item>
              <n-form-item v-if="activeItem.start != null && modalityPreview === 'text_ner'" label="起止">
                <n-space>
                  <n-input-number :value="activeItem.start" size="small" @update:value="(v) => patchActive('start', v)" />
                  <n-input-number :value="activeItem.end" size="small" @update:value="(v) => patchActive('end', v)" />
                </n-space>
              </n-form-item>
              <n-form-item v-if="modalityPreview === 'audio_slice'" label="秒">
                <n-space>
                  <n-input-number :value="activeItem.start" :step="0.1" size="small" @update:value="(v) => patchActive('start', v)" />
                  <n-input-number :value="activeItem.end" :step="0.1" size="small" @update:value="(v) => patchActive('end', v)" />
                </n-space>
              </n-form-item>
              <n-form-item v-if="activeItem.frame != null" label="帧号">
                <n-input-number :value="activeItem.frame" size="small" @update:value="(v) => patchActive('frame', v)" />
              </n-form-item>
              <n-form-item v-if="activeItem.trackId != null" label="轨迹ID">
                <n-input :value="activeItem.trackId" size="small" @update:value="(v) => patchActive('trackId', v)" />
              </n-form-item>
              <n-form-item v-if="activeItem.shape != null" label="形状">
                <n-select
                  :value="activeItem.shape"
                  :options="[
                    { label: 'bbox', value: 'bbox' },
                    { label: 'polygon', value: 'polygon' },
                  ]"
                  @update:value="(v) => patchActive('shape', v)"
                />
              </n-form-item>
              <n-form-item v-if="activeItem.conf != null" label="置信度">
                <n-input-number :value="activeItem.conf" :min="0" :max="1" :step="0.01" size="small" @update:value="(v) => patchActive('conf', v)" />
              </n-form-item>
              <n-form-item v-if="activeItem.area != null" label="面积">
                <n-input-number :value="activeItem.area" :min="0" :max="1" :step="0.01" size="small" @update:value="(v) => patchActive('area', v)" />
              </n-form-item>
            </n-form>
          </template>

          <n-divider />
          <n-input v-model:value="note" type="textarea" :rows="2" placeholder="提交备注（可选）" />
          <ProgressMock :running="saving" label="保存 / 提交处理中" />
          <div class="actions">
            <n-button :disabled="!task || saving" @click="onSave">保存标注</n-button>
            <n-button type="primary" :disabled="!task || !canSubmitReview || saving" @click="onSubmit">
              提交初审
            </n-button>
          </div>
          <p class="hint">身份：{{ auth.user?.name }} · {{ auth.role }}</p>

          <template v-if="task?.comments?.length && showHistory">
            <n-divider>批注</n-divider>
            <div v-for="c in task.comments" :key="c.id" class="cmt">
              <div class="cmt-h">{{ c.authorName }} · {{ c.at }}</div>
              <div>{{ c.body }}</div>
            </div>
          </template>
        </n-card>
      </div>
    </n-spin>
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
.pane { min-height: 520px; background: #14141c; }
.domain-chip {
  display: inline-block;
  margin-bottom: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #0c1f16;
  color: #63e2b7;
  font-size: 11px;
  border: 1px solid #18a05866;
}
.mod-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #2a2a36;
  margin-bottom: 6px;
  background: #101018;
}
.mod-item:hover { background: #1a1a22; }
.mod-item.active { background: #163528; border-color: #18a058; }
.mod-title { font-size: 13px; font-weight: 600; color: #e8e8ed; }
.mod-sub { font-size: 11px; color: #63e2b7; }
.mod-hint { font-size: 11px; color: #6b7280; margin-top: 2px; }
.sec { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
.task-meta { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.task-meta .title { color: #e8e8ed; font-weight: 600; }
.stat-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #a0a0aa; }
.center-head { display: flex; justify-content: space-between; align-items: center; }
.canvas { min-height: 360px; }
.text-body {
  line-height: 1.9;
  font-size: 15px;
  background: #0f0f14;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #2a2a36;
  color: #e8e8ed;
}
.ent { padding: 0 2px; border-radius: 2px; border-bottom: 2px solid; cursor: pointer; }
.ent.on { outline: 1px solid #63e2b7; }
.text-body sup { font-size: 10px; margin-left: 2px; opacity: 0.85; }
.legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.leg { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #8b8b9a; }
.leg i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.img-wrap { position: relative; width: 100%; background: #111; border-radius: 8px; overflow: hidden; }
.img-wrap img, .img-wrap .media-video { display: block; width: 100%; height: auto; }
.poly-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}
.poly-layer polygon {
  fill: rgba(240, 160, 32, 0.25);
  stroke: #f0a020;
  stroke-width: 0.008;
  cursor: pointer;
}
.poly-layer polygon.on {
  stroke: #63e2b7;
  fill: rgba(99, 226, 183, 0.28);
}
.mask-box, .det-box {
  position: absolute;
  border: 2px solid #1677ff;
  color: #fff;
  font-size: 11px;
  padding: 2px 4px;
  box-sizing: border-box;
  cursor: pointer;
}
.mask-box.on, .det-box.on, .slice.on { box-shadow: 0 0 0 2px #63e2b7; }
.audio-player { width: 100%; margin: 8px 0 4px; }
.media-video { display: block; width: 100%; max-height: 360px; background: #0f172a; }
.wave { width: 100%; border-radius: 8px; background: #0b1220; }
.timeline {
  position: relative;
  height: 36px;
  background: #1a1a22;
  border-radius: 6px;
  margin-top: 10px;
  overflow: hidden;
}
.slice {
  position: absolute;
  top: 4px;
  bottom: 4px;
  background: #18a05888;
  border: 1px solid #18a058;
  border-radius: 4px;
  font-size: 11px;
  padding: 0 4px;
  color: #dff5ea;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
}
.axis { margin-top: 8px; font-size: 12px; color: #6b7280; }
.frame-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #a0a0aa; font-size: 12px; }
.pc-img { width: 100%; border-radius: 8px; background: #0b1220; }
.swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; }
.label-list { max-height: 180px; overflow: auto; margin-bottom: 8px; }
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 4px;
  border-bottom: 1px dashed #2a2a36;
  cursor: pointer;
}
.label-row.on { background: #163528; border-radius: 4px; }
.label-main { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: #e8e8ed; }
.muted { color: #9ca3af; font-size: 12px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.hint { margin-top: 10px; font-size: 12px; color: #9ca3af; }
.cmt { margin-bottom: 8px; font-size: 12px; color: #c8c8d0; }
.cmt-h { color: #8b8b9a; margin-bottom: 2px; }
.mt { margin-top: 8px; }
@media (max-width: 1100px) {
  .wb-grid { grid-template-columns: 1fr; }
}
</style>
