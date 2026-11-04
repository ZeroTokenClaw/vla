<script setup>
import { Message } from '@/ui/discrete'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  listVisionImages,
  getVisionImage,
  runOcr,
  runYolo,
  saveCorrection,
} from '@/services/prelabel'
import ProgressMock from '@/components/ProgressMock.vue'

const route = useRoute()
const router = useRouter()

const list = ref([])
const image = ref(null)
const loading = ref(false)
const runningOcr = ref(false)
const runningYolo = ref(false)
const saving = ref(false)
const layer = ref('both') // ocr | yolo | both
const selectedBoxId = ref(null)

const ocrDraft = ref([])
const yoloDraft = ref([])

const currentId = computed(() => route.params.id)

async function loadList() {
  list.value = await listVisionImages()
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
    Message.error(e.message || '加载失败')
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
    ocrDraft.value = await runOcr(image.value.id)
    Message.success('OCR 预标注完成')
    await loadList()
  } catch (e) {
    Message.error(e.message)
  } finally {
    runningOcr.value = false
  }
}

async function onRunYolo() {
  if (!image.value) return
  runningYolo.value = true
  try {
    yoloDraft.value = await runYolo(image.value.id)
    selectedBoxId.value = yoloDraft.value[0]?.id || null
    Message.success('YOLO 预标注完成')
    await loadList()
  } catch (e) {
    Message.error(e.message)
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
    Message.success('视觉人工修正已保存')
    await loadImage(image.value.id)
    await loadList()
  } catch (e) {
    Message.error(e.message)
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
  <div class="vision-pre">
    <a-row :gutter="12">
      <a-col :span="5">
        <a-card class="side">
          <template #title>
            <div class="card-h">图像样例</div>
          </template>
          <a-menu @menu-item-click="switchImage">
            <a-menu-item v-for="item in list" :key="item.id">
              <div class="doc-item">
                <div class="doc-id">{{ item.id }}</div>
                <div class="doc-title">{{ item.title }}</div>
                <div class="tags">
                  <a-tag v-if="item.ocrCorrected" size="small" color="green">OCR已修</a-tag>
                  <a-tag v-if="item.yoloCorrected" size="small" color="green">YOLO已修</a-tag>
                </div>
              </div>
            </a-menu-item>
          </a-menu>
        </a-card>
      </a-col>

      <a-col :span="19">
        <a-card>
          <div class="toolbar">
            <div>
              <div class="title">{{ image?.title || '选择图像' }}</div>
              <div class="meta" v-if="image">{{ image.id }} · {{ image.status }}</div>
            </div>
            <div class="actions">
              <a-radio-group v-model="layer" size="small">
                <a-radio value="both">OCR+YOLO</a-radio>
                <a-radio value="ocr">仅 OCR</a-radio>
                <a-radio value="yolo">仅 YOLO</a-radio>
              </a-radio-group>
              <a-button type="primary" :loading="runningOcr" @click="onRunOcr">运行 OCR</a-button>
              <a-button type="primary" :loading="runningYolo" @click="onRunYolo">运行 YOLO</a-button>
              <a-button status="success" :loading="saving" :disabled="!image" @click="onSave">保存修正</a-button>
            </div>
          </div>
          <ProgressMock :running="runningOcr || runningYolo" label="视觉模型推理中…" />

          <a-row :gutter="12">
            <a-col :span="14">
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
            </a-col>

            <a-col :span="10">
              <div class="pane-title">OCR 文字层（可改字 / 删除）</div>
              <div class="list-pane">
                <div v-for="o in ocrDraft" :key="o.id" class="row-edit">
                  <a-input v-model="o.text" size="small" style="flex: 1" />
                  <a-tag size="small">{{ (o.conf * 100).toFixed(0) }}%</a-tag>
                  <a-button  type="text" @click="removeOcr(o.id)">删</a-button>
                </div>
                <a-empty v-if="!ocrDraft.length" description="暂无 OCR 结果" />
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
                  <a-select v-model="b.label" size="small" style="width: 120px">
                    <a-option v-for="lb in image?.labelSet || []" :key="lb" :label="lb" :value="lb" />
                  </a-select>
                  <span class="conf">{{ (b.conf * 100).toFixed(0) }}%</span>
                  <a-button  type="text" @click.stop="removeYolo(b.id)">删</a-button>
                </div>
                <a-empty v-if="!yoloDraft.length" description="暂无 YOLO 框" />
              </div>

              <a-alert
                v-if="selectedBox"
                style="margin-top: 10px"
                type="info"
                :closable="false"
                :title="`选中框 ${selectedBox.id} · ${selectedBox.label} · x=${selectedBox.x.toFixed(2)} y=${selectedBox.y.toFixed(2)}`"
              />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.side {
  min-height: 560px;
}
.card-h {
  font-weight: 600;
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
