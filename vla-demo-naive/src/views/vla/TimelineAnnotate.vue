<script setup>
import { message } from '@/ui/discrete'
import { computed, h, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NTag } from 'naive-ui'
import * as echarts from 'echarts'
import ProgressMock from '@/components/ProgressMock.vue'
import {
  listVlaTasks,
  getVlaTask,
  saveActionSpan,
  deleteActionSpan,
  exportVla,
  listMeta,
} from '@/services/vla'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const taskList = ref([])
const task = ref(null)
const currentFrame = ref(0)
const exportVisible = ref(false)
const previewVisible = ref(false)
const lastExport = ref('')
const meta = listMeta()
const signalChartRef = ref(null)
let signalChart = null

const draft = reactive({
  id: '',
  startFrame: 0,
  endFrame: 10,
  action: 'REACH',
  instruction: '',
  keyNode: true,
})

const taskId = computed(() => route.params.id || taskList.value[0]?.id || '')

const frameMarks = computed(() => {
  if (!task.value) return []
  return task.value.actions.map((a) => ({
    id: a.id,
    start: a.startFrame,
    end: a.endFrame,
    label: a.actionLabel,
    keyNode: a.keyNode,
  }))
})

const linkedImage = computed(() => task.value?.imageUrl || '/samples/video/bin_pick_poster.jpg')
const linkedVideo = computed(() => task.value?.videoUrl || '/samples/video/bin_pick.mp4')

const currentActionHint = computed(() => {
  if (!task.value) return null
  return (
    task.value.actions.find(
      (a) => currentFrame.value >= a.startFrame && currentFrame.value <= a.endFrame,
    ) || null
  )
})

const exportPreview = computed(() => {
  if (!task.value) return {}
  return {
    schema: 'EIDE-VLA-1.0',
    task_id: task.value.id,
    name: task.value.name,
    scene: task.value.scene,
    plan: task.value.plan,
    mode: task.value.mode,
    instruction: task.value.instruction,
    fps: task.value.fps,
    total_frames: task.value.totalFrames,
    actions: (task.value.actions || []).map((a, i) => ({
      order_no: i + 1,
      action_type: a.action,
      action_label: a.actionLabel,
      start_frame: a.startFrame,
      end_frame: a.endFrame,
      key_node: !!a.keyNode,
      instruction: a.instruction,
    })),
    modality_links: [
      {
        timestamp: currentFrame.value / (task.value.fps || 10),
        frame_idx: currentFrame.value,
        image_ref: task.value.imageUrl,
        video_ref: task.value.videoUrl,
        instruction_ref: 'instruction',
      },
    ],
  }
})

const columns = [
  {
    title: '起止帧',
    key: 'frames',
    width: 110,
    render: (r) => `F${r.startFrame}–${r.endFrame}`,
  },
  { title: '动作', key: 'actionLabel', width: 100 },
  { title: '编码', key: 'action', width: 80 },
  {
    title: '关键',
    key: 'keyNode',
    width: 70,
    render: (r) =>
      h(NTag, { size: 'tiny', type: r.keyNode ? 'warning' : 'default', bordered: false }, { default: () => (r.keyNode ? '关键' : '普通') }),
  },
  { title: '指令说明', key: 'instruction', ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'act',
    width: 120,
    render(row) {
      return h('div', { style: 'display:flex;gap:4px' }, [
        h(NButton, { size: 'tiny', quaternary: true, type: 'primary', onClick: () => onRowClick(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'tiny', quaternary: true, type: 'error', onClick: () => onDelete(row) }, { default: () => '删' }),
      ])
    },
  },
]

async function loadList() {
  taskList.value = (await listVlaTasks({ page: 1, pageSize: 200 })).items
}

function renderSignal() {
  const sig = task.value?.signal
  if (!signalChartRef.value || !sig?.claw?.length) {
    signalChart?.clear()
    return
  }
  if (!signalChart) signalChart = echarts.init(signalChartRef.value)
  signalChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 36, right: 12, top: 28, bottom: 24 },
    tooltip: { trigger: 'axis' },
    legend: { data: ['夹爪', '关节0'], textStyle: { color: '#8b8b97' }, top: 0 },
    xAxis: {
      type: 'category',
      data: (sig.t || sig.claw.map((_, i) => i)).map(String),
      axisLabel: { color: '#6e6e7a', fontSize: 10 },
    },
    yAxis: { type: 'value', axisLabel: { color: '#6e6e7a' }, splitLine: { lineStyle: { color: '#2a2a35' } } },
    series: [
      { name: '夹爪', type: 'line', data: sig.claw, showSymbol: false, itemStyle: { color: '#63e2b7' } },
      {
        name: '关节0',
        type: 'line',
        data: (sig.dof || []).map((row) => (Array.isArray(row) ? row[0] : row)),
        showSymbol: false,
        itemStyle: { color: '#70c0e8' },
      },
    ],
  })
}

async function loadTask(id) {
  if (!id) return
  loading.value = true
  try {
    task.value = await getVlaTask(id)
    currentFrame.value = 0
    draft.id = ''
    draft.startFrame = 0
    draft.endFrame = Math.min(10, task.value.totalFrames)
    draft.action = meta.actionTemplates[0]?.code || 'REACH'
    draft.instruction = ''
    draft.keyNode = true
    await nextTick()
    renderSignal()
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function onSelectTask(id) {
  router.push(`/vla/timeline/${id}`)
}

function seekTo(frame) {
  currentFrame.value = Math.max(0, Math.min(task.value?.totalFrames || 0, frame))
}

function onRowClick(row) {
  seekTo(row.startFrame)
  draft.id = row.id
  draft.startFrame = row.startFrame
  draft.endFrame = row.endFrame
  draft.action = row.action
  draft.instruction = row.instruction
  draft.keyNode = !!row.keyNode
}

function setStartHere() {
  draft.startFrame = currentFrame.value
  if (draft.endFrame <= draft.startFrame) draft.endFrame = draft.startFrame + 1
}

function setEndHere() {
  draft.endFrame = currentFrame.value
  if (draft.endFrame <= draft.startFrame) draft.startFrame = Math.max(0, draft.endFrame - 1)
}

async function onSaveSpan() {
  if (!task.value) return
  if (draft.endFrame <= draft.startFrame) {
    message.error('结束帧必须大于起始帧')
    return
  }
  if (!draft.action) {
    message.error('请选择动作类型')
    return
  }
  saving.value = true
  try {
    task.value = await saveActionSpan({
      taskId: task.value.id,
      id: draft.id || undefined,
      startFrame: draft.startFrame,
      endFrame: draft.endFrame,
      action: draft.action,
      instruction: draft.instruction,
      keyNode: draft.keyNode,
    })
    message.success('动作起止帧已保存')
    draft.id = ''
    await loadList()
  } catch (e) {
    message.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onDelete(row) {
  if (!task.value) return
  try {
    task.value = await deleteActionSpan(task.value.id, row.id)
    message.success('已删除动作片段')
    await loadList()
  } catch (e) {
    message.error(e.message || '删除失败')
  }
}

async function doExport(format) {
  if (!task.value) return
  exporting.value = true
  try {
    const res = await exportVla(task.value.id, format)
    lastExport.value = res.filename
    message.success(`已下载 ${res.filename}`)
  } catch (e) {
    message.error(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

watch(
  () => route.params.id,
  async (id) => {
    await loadList()
    const target = id || taskList.value[0]?.id
    if (target && target !== task.value?.id) await loadTask(target)
    if (!id && target) router.replace(`/vla/timeline/${target}`)
  },
)

onMounted(async () => {
  await loadList()
  const id = route.params.id || taskList.value[0]?.id
  if (id) {
    if (!route.params.id) router.replace(`/vla/timeline/${id}`)
    await loadTask(id)
  }
})

onUnmounted(() => signalChart?.dispose())
</script>

<template>
  <div class="timeline">
    <div class="toolbar">
      <n-select
        :value="taskId"
        placeholder="选择采集任务"
        style="width: 300px"
        :options="taskList.map((t) => ({ label: `${t.id} · ${t.name}`, value: t.id }))"
        @update:value="onSelectTask"
      />
      <div class="spacer" />
      <n-button secondary @click="previewVisible = true">导出预览 JSON</n-button>
      <n-button type="success" @click="exportVisible = true">导出 JSON / Excel / CSV</n-button>
      <n-button @click="router.push('/vla/quality/' + taskId)">样本质检</n-button>
      <n-button @click="router.push('/vla/consistency/' + taskId)">一致性</n-button>
    </div>

    <n-spin :show="loading">
      <template v-if="task">
        <n-card class="head-card" :bordered="false">
          <n-grid cols="24" :x-gap="16" :y-gap="16">
            <n-gi :span="6">
              <div class="scene-thumb">
                <img :src="linkedImage" alt="场景/关键帧预览" />
                <div class="thumb-cap">图像联动 · 帧 {{ currentFrame }}</div>
              </div>
            </n-gi>
            <n-gi :span="18">
              <div class="meta-grid">
                <div><span class="k">任务号</span>{{ task.id }}</div>
                <div><span class="k">名称</span>{{ task.name }}</div>
                <div><span class="k">FPS</span>{{ task.fps }}</div>
                <div><span class="k">总帧</span>{{ task.totalFrames }}</div>
                <div><span class="k">场景</span>{{ task.scene }}</div>
                <div><span class="k">方案</span>{{ task.plan }}</div>
                <div class="full">
                  <span class="k">任务指令</span>
                  <n-alert :title="task.instruction" type="info" :bordered="false" />
                </div>
                <div v-if="currentActionHint" class="full current-act">
                  <span class="k">当前动作</span>
                  <n-tag type="warning" :bordered="false">{{ currentActionHint.actionLabel }}</n-tag>
                  <span class="hint">{{ currentActionHint.instruction }}</span>
                  <n-tag size="small" :bordered="false">F{{ currentActionHint.startFrame }}–{{ currentActionHint.endFrame }}</n-tag>
                </div>
              </div>
            </n-gi>
          </n-grid>
        </n-card>

        <n-card class="player-card" :bordered="false">
          <div class="player">
            <div class="frame-stage">
              <video
                v-if="linkedVideo.endsWith('.mp4')"
                class="media-video"
                :src="linkedVideo"
                :poster="linkedImage"
                controls
                preload="metadata"
              />
              <img v-else :src="linkedImage" alt="采集视频帧占位" />
              <div class="frame-overlay">
                <div class="frame-badge">FRAME {{ currentFrame }} / {{ task.totalFrames }}</div>
                <div class="frame-note">拖动滑条联动图像帧索引；点击动作条可跳转；关键节点高亮为橙色。</div>
              </div>
            </div>

            <div class="timeline-bar">
              <div class="slider-row">
                <span class="lab">帧索引</span>
                <n-slider
                  v-model:value="currentFrame"
                  :min="0"
                  :max="task.totalFrames"
                  :step="1"
                />
                <n-input-number v-model:value="currentFrame" :min="0" :max="task.totalFrames" size="small" style="width: 100px" />
              </div>
              <div class="span-track">
                <div
                  class="playhead"
                  :style="{ left: (currentFrame / Math.max(task.totalFrames, 1)) * 100 + '%' }"
                />
                <div
                  v-for="m in frameMarks"
                  :key="m.id"
                  class="span-block"
                  :class="{ key: m.keyNode }"
                  :style="{
                    left: (m.start / task.totalFrames) * 100 + '%',
                    width: Math.max(1.2, ((m.end - m.start) / task.totalFrames) * 100) + '%',
                  }"
                  :title="`${m.label} F${m.start}-F${m.end}`"
                  @click="seekTo(m.start)"
                >
                  {{ m.label }}
                </div>
              </div>
            </div>
          </div>
        </n-card>

        <n-grid cols="24" :x-gap="16" :y-gap="16">
          <n-gi :span="9">
            <n-card :bordered="false">
              <template #header>
                <span>{{ draft.id ? '编辑动作片段' : '新增动作起止帧' }}</span>
              </template>
              <n-form label-placement="top">
                <n-form-item label="起始帧">
                  <n-space>
                    <n-input-number v-model:value="draft.startFrame" :min="0" :max="task.totalFrames" />
                    <n-button size="small" @click="setStartHere">用当前帧</n-button>
                  </n-space>
                </n-form-item>
                <n-form-item label="结束帧">
                  <n-space>
                    <n-input-number v-model:value="draft.endFrame" :min="0" :max="task.totalFrames" />
                    <n-button size="small" @click="setEndHere">用当前帧</n-button>
                  </n-space>
                </n-form-item>
                <n-form-item label="动作">
                  <n-select
                    v-model:value="draft.action"
                    :options="meta.actionTemplates.map((t) => ({ label: `${t.name} (${t.code})`, value: t.code }))"
                  />
                </n-form-item>
                <n-form-item label="关键节点">
                  <n-switch v-model:value="draft.keyNode" />
                </n-form-item>
                <n-form-item label="指令说明">
                  <n-input v-model:value="draft.instruction" type="textarea" :rows="2" />
                </n-form-item>
                <n-space>
                  <n-button type="primary" :loading="saving" @click="onSaveSpan">保存片段</n-button>
                  <n-button
                    v-if="draft.id"
                    @click="
                      () => {
                        draft.id = ''
                        draft.instruction = ''
                      }
                    "
                  >
                    取消编辑
                  </n-button>
                </n-space>
              </n-form>
              <ProgressMock :running="saving" label="写入动作序列" :duration="600" />
            </n-card>
          </n-gi>

          <n-gi :span="15">
            <n-card :bordered="false">
              <template #header>
                <div class="card-head">
                  <span>动作序列表（点击编辑可跳转帧）</span>
                  <n-tag size="small" :bordered="false">{{ task.actions.length }} 段</n-tag>
                </div>
              </template>
              <n-data-table
                :columns="columns"
                :data="task.actions"
                :row-key="(r) => r.id"
                size="small"
                :bordered="false"
              />
            </n-card>
          </n-gi>
        </n-grid>

        <n-card
          v-if="task.signal?.claw?.length"
          title="关节 / 夹爪信号（演示假曲线）"
          :bordered="false"
          class="signal-card"
        >
          <div ref="signalChartRef" class="signal-chart" />
          <p class="signal-tip">
            质量要求：{{ task.qualityRequirement || '画面稳定、关键帧清晰' }} · 设备
            {{ (task.deviceIds || []).join(', ') || '未绑定' }} · 数据类型
            {{ (task.dataTypes || ['video', 'action']).join(', ') }}
          </p>
        </n-card>
      </template>
      <n-empty v-else description="请先在「采集配置」创建任务" />
    </n-spin>

    <n-modal v-model:show="exportVisible" preset="card" title="导出标注结果" style="width: 520px">
      <p class="export-tip">
        将导出当前任务动作序列（起止帧、关键节点、指令）。文件名：
        <code>LM-VLA-&#123;taskId&#125;-&#123;timestamp&#125;.&#123;ext&#125;</code>
      </p>
      <ProgressMock :running="exporting" label="生成导出文件" :duration="500" />
      <div v-if="lastExport" class="last-file">最近下载：{{ lastExport }}</div>
      <template #footer>
        <n-space>
          <n-button type="primary" :loading="exporting" @click="doExport('json')">下载 JSON</n-button>
          <n-button type="success" :loading="exporting" @click="doExport('excel')">下载 Excel</n-button>
          <n-button type="warning" :loading="exporting" @click="doExport('csv')">下载 CSV</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-drawer v-model:show="previewVisible" :width="520" placement="right">
      <n-drawer-content title="导出结构预览（EIDE-VLA-1.0）" closable>
        <n-alert type="info" :bordered="false" class="mb">
          以下为即将导出的 JSON 结构预览（演示）。确认字段后可点导出下载真实文件。
        </n-alert>
        <pre class="json">{{ JSON.stringify(exportPreview, null, 2) }}</pre>
        <n-button type="primary" block @click="doExport('json')">下载此 JSON</n-button>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.spacer { flex: 1; }
.signal-card { margin-top: 12px; background: #14141c; }
.signal-chart { height: 220px; }
.signal-tip { margin: 8px 0 0; font-size: 12px; color: #6e6e7a; }
.head-card, .player-card { margin-bottom: 12px; background: #14141c; }
.scene-thumb img { width: 100%; border-radius: 6px; background: #111827; display: block; }
.thumb-cap { margin-top: 6px; font-size: 12px; color: #8b8b9a; }
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  font-size: 13px;
  color: #e8e8ed;
}
.meta-grid .full { grid-column: 1 / -1; }
.k { display: inline-block; min-width: 64px; color: #8b8b9a; margin-right: 8px; }
.hint { margin-left: 8px; color: #c8c8d0; }
.current-act { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.player { display: flex; flex-direction: column; gap: 12px; }
.frame-stage { position: relative; border-radius: 8px; overflow: hidden; background: #0f172a; }
.media-video { display: block; width: 100%; max-height: 320px; background: #0f172a; }
.frame-stage img { width: 100%; max-height: 320px; object-fit: contain; display: block; opacity: 0.92; }
.frame-overlay { position: absolute; left: 12px; right: 12px; bottom: 12px; color: #e5e7eb; }
.frame-badge {
  display: inline-block;
  background: #18a058;
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 6px;
}
.frame-note { font-size: 12px; color: #cbd5e1; }
.timeline-bar { padding: 4px 8px 12px; }
.slider-row { display: flex; align-items: center; gap: 12px; }
.slider-row .lab { width: 48px; color: #8b8b9a; font-size: 12px; }
.span-track {
  position: relative;
  height: 28px;
  margin-top: 8px;
  background: #1a1a22;
  border-radius: 4px;
  overflow: hidden;
}
.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #fff;
  z-index: 2;
}
.span-block {
  position: absolute;
  top: 4px;
  height: 20px;
  background: #18a05899;
  color: #dff5ea;
  font-size: 11px;
  line-height: 20px;
  text-align: center;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 4px;
}
.span-block.key { background: #f0a020cc; color: #2b1600; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.export-tip { font-size: 13px; color: #a0a0aa; line-height: 1.6; }
.last-file { margin-top: 8px; font-size: 12px; color: #63e2b7; }
.json {
  background: #0b0b0f;
  border: 1px solid #2a2a36;
  border-radius: 8px;
  padding: 12px;
  max-height: 60vh;
  overflow: auto;
  font-size: 12px;
  color: #c8c8d0;
  margin-bottom: 12px;
}
.mb { margin-bottom: 10px; }
:deep(.n-card) { background: #14141c; }
code { background: #1a1a22; padding: 1px 6px; border-radius: 4px; }
</style>
