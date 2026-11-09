<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  listVisionImages,
  getVisionImage,
  runOcr,
  runYolo,
  saveCorrection,
  listMeta,
} from '@/services/prelabel'
import ProgressMock from '@/components/ProgressMock.vue'

const route = useRoute()
const router = useRouter()

const list = ref([])
const filters = reactive({ keyword: '', status: '', batchId: '' })
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const image = ref(null)
const loading = ref(false)
const runningOcr = ref(false)
const runningYolo = ref(false)
const saving = ref(false)
const layer = ref('both') // ocr | yolo | both
const selectedBoxId = ref(null)
const meta = listMeta()
const ocrModelId = ref(meta.models.find((m) => m.type === 'ocr')?.id || '')
const yoloModelId = ref(meta.models.find((m) => m.type === 'yolo')?.id || '')
const confThres = ref(0.35)
const lastRunMeta = ref(null)

const ocrDraft = ref([])
const yoloDraft = ref([])

const currentId = computed(() => route.params.id)

async function loadList() {
  const res = await listVisionImages({
    ...filters,
    page: page.value,
    pageSize: pageSize.value,
  })
  list.value = res.items
  total.value = res.total
  page.value = res.page
}

async function onSearch() {
  page.value = 1
  await loadList()
}

async function loadImage(id) {
  if (!id) {
    image.value = null
    return
  }
  loading.value = true
  try {
    image.value = await getVisionImage(id)
    ocrDraft.value = JSON.parse(JSON.stringify(image.value.ocr || []))
    yoloDraft.value = JSON.parse(JSON.stringify(image.value.yolo || []))
    selectedBoxId.value = yoloDraft.value[0]?.id || null
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadList()
  if (currentId.value) await loadImage(currentId.value)
  else if (list.value[0]) router.replace(`/prelabel/vision/${list.value[0].id}`)
})

watch(currentId, (id) => {
  if (id) loadImage(id)
})

function switchImage(id) {
  router.push(`/prelabel/vision/${id}`)
}

async function onRunOcr() {
  if (!image.value) return
  runningOcr.value = true
  try {
    const res = await runOcr(image.value.id, {
      modelId: ocrModelId.value,
      params: { confThres: confThres.value },
    })
    ocrDraft.value = res.items || res
    lastRunMeta.value = {
      kind: 'OCR',
      modelId: res.modelId,
      modelVersion: res.modelVersion,
    }
    ElMessage.success(`OCR 完成 · ${res.modelId}@${res.modelVersion}`)
    await loadList()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    runningOcr.value = false
  }
}

async function onRunYolo() {
  if (!image.value) return
  runningYolo.value = true
  try {
    const res = await runYolo(image.value.id, {
      modelId: yoloModelId.value,
      params: { confThres: confThres.value, imgsz: 640 },
    })
    yoloDraft.value = res.items || res
    selectedBoxId.value = yoloDraft.value[0]?.id || null
    lastRunMeta.value = {
      kind: 'YOLO',
      modelId: res.modelId,
      modelVersion: res.modelVersion,
    }
    ElMessage.success(`YOLO 完成 · ${res.modelId}@${res.modelVersion}`)
    await loadList()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    runningYolo.value = false
  }
}

function removeOcr(id) {
  ocrDraft.value = ocrDraft.value.filter((x) => x.id !== id)
}

function removeYolo(id) {
  yoloDraft.value = yoloDraft.value.filter((x) => x.id !== id)
  if (selectedBoxId.value === id) selectedBoxId.value = yoloDraft.value[0]?.id || null
}

const selectedBox = computed(() => yoloDraft.value.find((b) => b.id === selectedBoxId.value))

async function onSave() {
  if (!image.value) return
  saving.value = true
  try {
    await saveCorrection(image.value.id, {
      ocr: ocrDraft.value,
      yolo: yoloDraft.value,
    })
    ElMessage.success('视觉人工修正已保存')
    await loadImage(image.value.id)
    await loadList()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

const boxColors = {
  cup: '#1677ff',
  plate: '#52c41a',
  hand: '#fa8c16',
  tray: '#722ed1',
  tool: '#f5222d',
  table: '#13c2c2',
  box_A: '#1677ff',
  box_B: '#52c41a',
  gripper: '#fa8c16',
  conveyor: '#722ed1',
  other: '#8c8c8c',
}

function colorOf(label) {
  return boxColors[label] || '#1677ff'
}

const showOcr = computed(() => layer.value === 'ocr' || layer.value === 'both')
const showYolo = computed(() => layer.value === 'yolo' || layer.value === 'both')
</script>

<template>
  <div v-loading="loading" class="vision-pre">
    <el-row :gutter="12">
      <el-col :span="5">
        <el-card shadow="never" class="side">
          <template #header>
            <div class="card-h">图像样例（{{ total }}）</div>
          </template>
          <div class="side-filters">
            <el-input v-model="filters.keyword" clearable size="small" placeholder="ID/标题" @keyup.enter="onSearch" />
            <el-select v-model="filters.status" clearable size="small" placeholder="状态" style="width: 100%; margin-top: 6px" @change="onSearch">
              <el-option label="ready" value="ready" />
              <el-option label="running" value="running" />
              <el-option label="corrected" value="corrected" />
              <el-option label="ocr_done" value="ocr_done" />
              <el-option label="yolo_done" value="yolo_done" />
            </el-select>
            <el-input v-model="filters.batchId" clearable size="small" placeholder="批次号" style="margin-top: 6px" @keyup.enter="onSearch" />
            <el-button size="small" type="primary" style="width: 100%; margin-top: 6px" @click="onSearch">筛选</el-button>
          </div>
          <el-menu :default-active="currentId" @select="switchImage">
            <el-menu-item v-for="item in list" :key="item.id" :index="item.id">
              <div class="doc-item">
                <div class="doc-id">{{ item.id }}</div>
                <div class="doc-title">{{ item.title }}</div>
                <div class="doc-meta">{{ item.progressPct ?? 0 }}% · {{ item.spotCheckPass === false ? '抽检未过' : '抽检OK' }}</div>
                <div class="tags">
                  <el-tag v-if="item.ocrCorrected" size="small" type="success">OCR已修</el-tag>
                  <el-tag v-if="item.yoloCorrected" size="small" type="success">YOLO已修</el-tag>
                </div>
              </div>
            </el-menu-item>
          </el-menu>
          <div class="pager">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next"
              :pager-count="5"
              small
              @current-change="loadList"
              @size-change="() => { page = 1; loadList() }"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="19">
        <el-card shadow="never">
          <div class="toolbar">
            <div>
              <div class="title">{{ image?.title || '选择图像' }}</div>
              <div class="meta" v-if="image">{{ image.id }} · {{ image.status }}</div>
            </div>
            <div class="actions">
              <el-radio-group v-model="layer" size="small">
                <el-radio-button value="both">OCR+YOLO</el-radio-button>
                <el-radio-button value="ocr">仅 OCR</el-radio-button>
                <el-radio-button value="yolo">仅 YOLO</el-radio-button>
              </el-radio-group>
              <el-select v-model="ocrModelId" size="small" style="width: 160px" placeholder="OCR 模型">
                <el-option
                  v-for="m in meta.models.filter((x) => x.type === 'ocr')"
                  :key="m.id"
                  :label="`${m.name}`"
                  :value="m.id"
                />
              </el-select>
              <el-select v-model="yoloModelId" size="small" style="width: 160px" placeholder="YOLO 模型">
                <el-option
                  v-for="m in meta.models.filter((x) => x.type === 'yolo')"
                  :key="m.id"
                  :label="`${m.name}`"
                  :value="m.id"
                />
              </el-select>
              <el-input-number v-model="confThres" size="small" :min="0.1" :max="0.95" :step="0.05" />
              <el-button type="primary" :loading="runningOcr" @click="onRunOcr">运行 OCR</el-button>
              <el-button type="primary" :loading="runningYolo" @click="onRunYolo">运行 YOLO</el-button>
              <el-tag v-if="lastRunMeta" size="small" type="info">
                {{ lastRunMeta.kind }} {{ lastRunMeta.modelId }}@{{ lastRunMeta.modelVersion }}
              </el-tag>
              <el-button type="success" :loading="saving" :disabled="!image" @click="onSave">保存修正</el-button>
            </div>
          </div>
          <ProgressMock :running="runningOcr || runningYolo" label="视觉模型推理中…" />

          <el-row :gutter="12">
            <el-col :span="14">
              <div class="canvas-wrap">
                <img v-if="image" :src="image.imageUrl" class="bg" alt="sample" />
                <div class="overlay">
                  <template v-if="showYolo">
                    <div
                      v-for="b in yoloDraft"
                      :key="b.id"
                      class="bbox"
                      :class="{ active: b.id === selectedBoxId }"
                      :style="{
                        left: b.x * 100 + '%',
                        top: b.y * 100 + '%',
                        width: b.w * 100 + '%',
                        height: b.h * 100 + '%',
                        borderColor: colorOf(b.label),
                      }"
                      @click="selectedBoxId = b.id"
                    >
                      <span class="bbox-label" :style="{ background: colorOf(b.label) }">
                        {{ b.label }} {{ (b.conf * 100).toFixed(0) }}%
                      </span>
                    </div>
                  </template>
                  <template v-if="showOcr">
                    <div
                      v-for="o in ocrDraft"
                      :key="o.id"
                      class="ocr-box"
                      :style="{
                        left: o.x * 100 + '%',
                        top: o.y * 100 + '%',
                        width: o.w * 100 + '%',
                        height: o.h * 100 + '%',
                      }"
                    >
                      {{ o.text }}
                    </div>
                  </template>
                </div>
              </div>
            </el-col>

            <el-col :span="10">
              <div class="pane-title">OCR 文字层（可改字 / 删除）</div>
              <div class="list-pane">
                <div v-for="o in ocrDraft" :key="o.id" class="row-edit">
                  <el-input v-model="o.text" size="small" style="flex: 1" />
                  <el-tag size="small">{{ (o.conf * 100).toFixed(0) }}%</el-tag>
                  <el-button link type="danger" @click="removeOcr(o.id)">删</el-button>
                </div>
                <el-empty v-if="!ocrDraft.length" description="暂无 OCR 结果" :image-size="48" />
              </div>

              <div class="pane-title" style="margin-top: 12px">YOLO 检测框（改 label / 删除）</div>
              <div class="list-pane">
                <div
                  v-for="b in yoloDraft"
                  :key="b.id"
                  class="row-edit yolo-row"
                  :class="{ active: b.id === selectedBoxId }"
                  @click="selectedBoxId = b.id"
                >
                  <el-select v-model="b.label" size="small" style="width: 120px">
                    <el-option v-for="lb in image?.labelSet || []" :key="lb" :label="lb" :value="lb" />
                  </el-select>
                  <span class="conf">{{ (b.conf * 100).toFixed(0) }}%</span>
                  <el-button link type="danger" @click.stop="removeYolo(b.id)">删</el-button>
                </div>
                <el-empty v-if="!yoloDraft.length" description="暂无 YOLO 框" :image-size="48" />
              </div>

              <el-alert
                v-if="selectedBox"
                style="margin-top: 10px"
                type="info"
                :closable="false"
                :title="`选中框 ${selectedBox.id} · ${selectedBox.label} · x=${selectedBox.x.toFixed(2)} y=${selectedBox.y.toFixed(2)}`"
              />
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.side {
  min-height: 560px;
}
.card-h {
  font-weight: 600;
}
.side-filters {
  padding: 0 8px 8px;
}
.pager {
  padding: 8px 4px 4px;
  display: flex;
  justify-content: center;
}
.doc-meta {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}
.doc-item {
  line-height: 1.3;
  white-space: normal;
}
.doc-id {
  font-size: 11px;
  color: #6b7280;
}
.doc-title {
  font-size: 13px;
}
.tags {
  display: flex;
  gap: 4px;
  margin-top: 2px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 12px;
  flex-wrap: wrap;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.canvas-wrap {
  position: relative;
  width: 100%;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  min-height: 360px;
}
.bg {
  display: block;
  width: 100%;
  height: auto;
  opacity: 0.95;
}
.overlay {
  position: absolute;
  inset: 0;
}
.bbox {
  position: absolute;
  border: 2px solid #1677ff;
  box-sizing: border-box;
  cursor: pointer;
  background: transparent;
}
.bbox.active {
  box-shadow: 0 0 0 2px #fff inset;
}
.bbox-label {
  position: absolute;
  top: -18px;
  left: 0;
  color: #fff;
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
}
.ocr-box {
  position: absolute;
  border: 1px dashed #faad14;
  background: #faad1433;
  color: #fff;
  font-size: 11px;
  padding: 2px 4px;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
}
.pane-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.list-pane {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  min-height: 140px;
  max-height: 220px;
  overflow: auto;
  background: #fafafa;
}
.row-edit {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.yolo-row {
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
}
.yolo-row.active {
  background: #e6f4ff;
}
.conf {
  font-size: 12px;
  color: #6b7280;
  min-width: 36px;
}
</style>
