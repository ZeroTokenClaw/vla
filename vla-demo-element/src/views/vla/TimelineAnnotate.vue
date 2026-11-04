<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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
const lastExport = ref('')
const meta = listMeta()

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

async function loadList() {
  taskList.value = await listVlaTasks()
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
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
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
    ElMessage.error('结束帧必须大于起始帧')
    return
  }
  if (!draft.action) {
    ElMessage.error('请选择动作类型')
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
    ElMessage.success('动作起止帧已保存')
    draft.id = ''
    await loadList()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onDelete(row) {
  if (!task.value) return
  try {
    task.value = await deleteActionSpan(task.value.id, row.id)
    ElMessage.success('已删除动作片段')
    await loadList()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

async function doExport(format) {
  if (!task.value) return
  exporting.value = true
  try {
    const res = await exportVla(task.value.id, format)
    lastExport.value = res.filename
    ElMessage.success(`已下载 ${res.filename}`)
  } catch (e) {
    ElMessage.error(e.message || '导出失败')
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
  { immediate: false },
)

onMounted(async () => {
  await loadList()
  const id = route.params.id || taskList.value[0]?.id
  if (id) {
    if (!route.params.id) router.replace(`/vla/timeline/${id}`)
    await loadTask(id)
  }
})
</script>

<template>
  <div v-loading="loading" class="timeline">
    <div class="toolbar">
      <el-select
        :model-value="taskId"
        placeholder="选择采集任务"
        style="width: 280px"
        @change="onSelectTask"
      >
        <el-option
          v-for="t in taskList"
          :key="t.id"
          :label="`${t.id} · ${t.name}`"
          :value="t.id"
        />
      </el-select>
      <div class="spacer" />
      <el-button type="success" @click="exportVisible = true">导出 JSON / Excel / CSV</el-button>
      <el-button @click="$router.push('/vla/quality/' + taskId)">去样本质检</el-button>
    </div>

    <template v-if="task">
      <!-- 任务头：指令 + 场景图联动 -->
      <el-card shadow="never" class="head-card">
        <el-row :gutter="16">
          <el-col :span="6">
            <div class="scene-thumb">
              <img :src="linkedImage" alt="场景/关键帧预览" />
              <div class="thumb-cap">图像联动 · 帧 {{ currentFrame }}</div>
            </div>
          </el-col>
          <el-col :span="18">
            <div class="meta-grid">
              <div><span class="k">任务号</span>{{ task.id }}</div>
              <div><span class="k">名称</span>{{ task.name }}</div>
              <div><span class="k">FPS</span>{{ task.fps }}</div>
              <div><span class="k">总帧</span>{{ task.totalFrames }}</div>
              <div class="full">
                <span class="k">任务指令</span>
                <el-alert :title="task.instruction" type="info" :closable="false" show-icon />
              </div>
              <div v-if="currentActionHint" class="full">
                <span class="k">当前动作</span>
                <el-tag type="warning">{{ currentActionHint.actionLabel }}</el-tag>
                <span class="hint">{{ currentActionHint.instruction }}</span>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 中：视频占位 + 帧滑条时间轴 -->
      <el-card shadow="never" class="player-card">
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
              <div class="frame-note">
                演示环境使用脱敏帧序列占位（SVG）。滑条切换帧索引，点击动作行可跳转起止帧。
              </div>
            </div>
          </div>

          <div class="timeline-bar">
            <div class="slider-row">
              <span class="lab">帧索引</span>
              <el-slider
                v-model="currentFrame"
                :min="0"
                :max="task.totalFrames"
                :step="1"
                show-stops
                :marks="{ 0: '0', [task.totalFrames]: String(task.totalFrames) }"
              />
            </div>
            <div class="span-track">
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
      </el-card>

      <el-row :gutter="16">
        <el-col :span="9">
          <el-card shadow="never">
            <template #header>
              <span>{{ draft.id ? '编辑动作片段' : '新增动作起止帧' }}</span>
            </template>
            <el-form label-width="88px">
              <el-form-item label="起始帧">
                <el-input-number v-model="draft.startFrame" :min="0" :max="task.totalFrames" />
                <el-button class="ml" size="small" @click="setStartHere">用当前帧</el-button>
              </el-form-item>
              <el-form-item label="结束帧">
                <el-input-number v-model="draft.endFrame" :min="0" :max="task.totalFrames" />
                <el-button class="ml" size="small" @click="setEndHere">用当前帧</el-button>
              </el-form-item>
              <el-form-item label="动作">
                <el-select v-model="draft.action" style="width: 100%">
                  <el-option
                    v-for="t in meta.actionTemplates"
                    :key="t.id"
                    :label="`${t.name} (${t.code})`"
                    :value="t.code"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="关键节点">
                <el-switch v-model="draft.keyNode" active-text="是" inactive-text="否" />
              </el-form-item>
              <el-form-item label="指令说明">
                <el-input v-model="draft.instruction" type="textarea" :rows="2" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="saving" @click="onSaveSpan">保存片段</el-button>
                <el-button
                  v-if="draft.id"
                  @click="
                    draft.id = '';
                    draft.instruction = ''
                  "
                >
                  取消编辑
                </el-button>
              </el-form-item>
            </el-form>
            <ProgressMock :running="saving" label="写入动作序列" :duration="600" />
          </el-card>
        </el-col>

        <el-col :span="15">
          <el-card shadow="never">
            <template #header>
              <div class="card-head">
                <span>动作序列表（点击行跳转帧）</span>
                <el-tag size="small">{{ task.actions.length }} 段</el-tag>
              </div>
            </template>
            <el-table
              :data="task.actions"
              size="small"
              stripe
              highlight-current-row
              empty-text="暂无动作标注，请在左侧新增起止帧"
              @row-click="onRowClick"
            >
              <el-table-column prop="startFrame" label="起始帧" width="80" />
              <el-table-column prop="endFrame" label="结束帧" width="80" />
              <el-table-column prop="actionLabel" label="动作" width="110" />
              <el-table-column prop="action" label="编码" width="90" />
              <el-table-column label="关键" width="70">
                <template #default="{ row }">
                  <el-tag v-if="row.keyNode" size="small" type="danger">关键</el-tag>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column prop="instruction" label="指令说明" min-width="160" show-overflow-tooltip />
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ row }">
                  <el-button link type="danger" @click.stop="onDelete(row)">删</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-empty v-else description="请先在「采集配置」创建任务" />

    <el-dialog v-model="exportVisible" title="导出标注结果" width="480px">
      <p class="export-tip">
        将导出当前任务的动作序列（含起止帧、关键节点、指令）。文件名格式：
        <code>DL-VLA-&#123;taskId&#125;-&#123;timestamp&#125;.&#123;ext&#125;</code>
      </p>
      <ProgressMock :running="exporting" label="生成导出文件" :duration="500" />
      <div v-if="lastExport" class="last-file">最近下载：{{ lastExport }}</div>
      <template #footer>
        <el-button type="primary" :loading="exporting" @click="doExport('json')">下载 JSON</el-button>
        <el-button type="success" :loading="exporting" @click="doExport('excel')">下载 Excel</el-button>
        <el-button type="warning" :loading="exporting" @click="doExport('csv')">下载 CSV</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.spacer {
  flex: 1;
}
.head-card,
.player-card {
  margin-bottom: 12px;
  border-radius: 8px;
}
.scene-thumb img {
  width: 100%;
  border-radius: 6px;
  background: #111827;
  display: block;
}
.thumb-cap {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  font-size: 13px;
}
.meta-grid .full {
  grid-column: 1 / -1;
}
.k {
  display: inline-block;
  min-width: 64px;
  color: #6b7280;
  margin-right: 8px;
}
.hint {
  margin-left: 8px;
  color: #374151;
}
.player {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.frame-stage {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #0f172a;
}
.media-video {
  display: block;
  width: 100%;
  max-height: 320px;
  background: #0f172a;
  border-radius: 6px;
}
.frame-stage img {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  display: block;
  opacity: 0.92;
}
.frame-overlay {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  color: #e5e7eb;
}
.frame-badge {
  display: inline-block;
  background: #1677ff;
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 6px;
}
.frame-note {
  font-size: 12px;
  color: #cbd5e1;
}
.timeline-bar {
  padding: 4px 8px 12px;
}
.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.slider-row .lab {
  width: 48px;
  color: #6b7280;
  font-size: 12px;
}
.slider-row .el-slider {
  flex: 1;
}
.span-track {
  position: relative;
  height: 28px;
  margin-top: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}
.span-block {
  position: absolute;
  top: 4px;
  height: 20px;
  background: #91caff;
  color: #003eb3;
  font-size: 11px;
  line-height: 20px;
  text-align: center;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 4px;
}
.span-block.key {
  background: #ffbb96;
  color: #ad2102;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ml {
  margin-left: 8px;
}
.export-tip {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
}
.last-file {
  margin-top: 8px;
  font-size: 12px;
  color: #1677ff;
}
code {
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 4px;
}
</style>
