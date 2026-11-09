<script setup>
import { message } from '@/ui/discrete'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NTag } from 'naive-ui'
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
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const image = ref(null)
const loading = ref(false)
const runningOcr = ref(false)
const runningYolo = ref(false)
const saving = ref(false)
const layer = ref('both') // ocr | yolo | both
const viewMode = ref('edit') // edit | diff | model
const selectedBoxId = ref(null)
const confThreshold = ref(0.5)
const logVisible = ref(false)

const ocrDraft = ref([])
const yoloDraft = ref([])

const currentId = computed(() => route.params.id)

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

async function loadList() {
  const res = await listVisionImages({ page: page.value, pageSize: pageSize.value })
  list.value = res.items
  total.value = res.total
  page.value = res.page
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
    message.error(e.message || '加载失败')
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

async function onRunOcr() {
  if (!image.value) return
  runningOcr.value = true
  try {
    ocrDraft.value = await runOcr(image.value.id)
    message.success(`OCR 完成 · ${ocrDraft.value.length} 条文字框`)
    await loadList()
    await loadImage(image.value.id)
  } catch (e) {
    message.error(e.message)
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
    message.success(`YOLO 完成 · ${yoloDraft.value.length} 个检测框`)
    await loadList()
    await loadImage(image.value.id)
  } catch (e) {
    message.error(e.message)
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

function resetToModel() {
  if (!image.value) return
  ocrDraft.value = JSON.parse(JSON.stringify(image.value.ocrModel || []))
  yoloDraft.value = JSON.parse(JSON.stringify(image.value.yoloModel || []))
  selectedBoxId.value = yoloDraft.value[0]?.id || null
  message.info('已恢复为模型原始结果（未保存）')
}

function applyHumanFixHints() {
  // Demo one-click “典型人工修正”：修正 OCR 错字 + YOLO 误检
  const ocr = ocrDraft.value.find((o) => o.text === 'PLATE-8' || o.text === 'BIN-O1')
  if (ocr) {
    if (ocr.text === 'PLATE-8') ocr.text = 'PLATE-B'
    if (ocr.text === 'BIN-O1') ocr.text = 'BIN-01'
  }
  const yolo = yoloDraft.value.find((b) => b.label === 'tool' && b.conf < 0.7)
  if (yolo) yolo.label = 'hand'
  message.success('已应用演示修正建议（OCR 错字 + YOLO 误检）')
}

const selectedBox = computed(() => yoloDraft.value.find((b) => b.id === selectedBoxId.value))

const filteredYolo = computed(() =>
  yoloDraft.value.filter((b) => (b.conf ?? 0) >= confThreshold.value),
)

const showOcr = computed(() => layer.value === 'ocr' || layer.value === 'both')
const showYolo = computed(() => layer.value === 'yolo' || layer.value === 'both')

const ocrDiffRows = computed(() => {
  if (!image.value) return []
  const model = image.value.ocrModel || []
  const human = ocrDraft.value
  const ids = new Set([...model.map((x) => x.id), ...human.map((x) => x.id)])
  return [...ids].map((id) => {
    const m = model.find((x) => x.id === id)
    const h = human.find((x) => x.id === id)
    let status = '一致'
    if (!m && h) status = '人工新增'
    else if (m && !h) status = '人工删除'
    else if (m && h && m.text !== h.text) status = '已修正'
    return {
      id,
      field: `OCR · ${id}`,
      model: m?.text ?? '—',
      human: h?.text ?? '—',
      conf: m?.conf ?? h?.conf ?? 0,
      status,
    }
  })
})

const yoloDiffRows = computed(() => {
  if (!image.value) return []
  const model = image.value.yoloModel || []
  const human = yoloDraft.value
  const ids = new Set([...model.map((x) => x.id), ...human.map((x) => x.id)])
  return [...ids].map((id) => {
    const m = model.find((x) => x.id === id)
    const h = human.find((x) => x.id === id)
    let status = '一致'
    if (!m && h) status = '人工新增'
    else if (m && !h) status = '人工删除'
    else if (m && h && m.label !== h.label) status = '已修正'
    return {
      id,
      field: `YOLO · ${id}`,
      model: m ? `${m.label}@${(m.conf * 100).toFixed(0)}%` : '—',
      human: h ? `${h.label}@${(h.conf * 100).toFixed(0)}%` : '—',
      conf: m?.conf ?? h?.conf ?? 0,
      status,
    }
  })
})

const allDiffRows = computed(() => [...ocrDiffRows.value, ...yoloDiffRows.value])

const diffSummary = computed(() => {
  const rows = allDiffRows.value
  return {
    same: rows.filter((r) => r.status === '一致').length,
    fixed: rows.filter((r) => r.status === '已修正').length,
    added: rows.filter((r) => r.status === '人工新增').length,
    removed: rows.filter((r) => r.status === '人工删除').length,
    total: rows.length,
  }
})

const diffColumns = [
  { title: '项', key: 'field', width: 120 },
  { title: '模型', key: 'model' },
  { title: '人工', key: 'human' },
  {
    title: '对照',
    key: 'status',
    width: 90,
    render: (r) =>
      h(
        NTag,
        {
          size: 'tiny',
          bordered: false,
          type:
            r.status === '一致'
              ? 'success'
              : r.status === '已修正'
                ? 'warning'
                : r.status === '人工删除'
                  ? 'error'
                  : 'info',
        },
        { default: () => r.status },
      ),
  },
]

async function onSave() {
  if (!image.value) return
  saving.value = true
  try {
    await saveCorrection(image.value.id, {
      ocr: ocrDraft.value,
      yolo: yoloDraft.value,
    })
    message.success(
      `视觉人工修正已保存 · Diff 变更 ${diffSummary.value.fixed + diffSummary.value.added + diffSummary.value.removed} 项`,
    )
    await loadImage(image.value.id)
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    saving.value = false
  }
}

function onPageSize() {
  page.value = 1
  loadList()
}

const labelOptions = computed(() =>
  (image.value?.labelSet || []).map((lb) => ({ label: lb, value: lb })),
)

const statusTag = computed(() => {
  const s = image.value?.status
  if (s === 'corrected') return { type: 'success', text: '已人工修正' }
  if (s === 'ocr_done') return { type: 'info', text: 'OCR 完成' }
  if (s === 'yolo_done') return { type: 'info', text: 'YOLO 完成' }
  return { type: 'default', text: s || 'ready' }
})
</script>

<template>
  <div class="vision-pre">
    <n-grid cols="24" :x-gap="12" :y-gap="12">
      <n-gi :span="5">
        <n-card class="side" :bordered="false">
          <template #header>
            <div class="card-h">图像样例 · {{ total }}</div>
          </template>
          <n-empty v-if="!list.length" description="暂无样例" size="small" />
          <div
            v-for="d in list"
            :key="d.id"
            class="side-item"
            :class="{ active: route.params.id === d.id }"
            @click="router.push('/prelabel/vision/' + d.id)"
          >
            <div class="side-id">{{ d.id }}</div>
            <div class="side-title">{{ d.title }}</div>
            <div class="side-tags">
              <n-tag size="tiny" :bordered="false" :type="d.ocrCorrected ? 'success' : 'default'">
                OCR{{ d.ocrCorrected ? '✓' : '' }}
              </n-tag>
              <n-tag size="tiny" :bordered="false" :type="d.yoloCorrected ? 'success' : 'default'">
                YOLO{{ d.yoloCorrected ? '✓' : '' }}
              </n-tag>
            </div>
          </div>
          <div class="pager">
            <n-pagination
              v-model:page="page"
              v-model:page-size="pageSize"
              :item-count="total"
              size="small"
              :page-slot="5"
              @update:page="loadList"
              @update:page-size="onPageSize"
            />
          </div>
        </n-card>
      </n-gi>

      <n-gi :span="19">
        <n-spin :show="loading">
          <n-card :bordered="false">
            <div class="toolbar">
              <div>
                <div class="title">
                  {{ image?.title || '选择图像' }}
                  <n-tag v-if="image" size="small" :type="statusTag.type" :bordered="false">
                    {{ statusTag.text }}
                  </n-tag>
                </div>
                <div v-if="image" class="meta">
                  {{ image.id }} · {{ image.width }}×{{ image.height }}
                  <template v-if="image.batchId"> · 批次 {{ image.batchId }}</template>
                  · Diff 一致 {{ diffSummary.same }}/{{ diffSummary.total }} · 修正
                  {{ diffSummary.fixed }} · 增 {{ diffSummary.added }} · 删 {{ diffSummary.removed }}
                </div>
              </div>
              <div class="actions">
                <n-radio-group v-model:value="viewMode" size="small">
                  <n-radio-button value="edit">编辑叠框</n-radio-button>
                  <n-radio-button value="diff">模型↔人工 Diff</n-radio-button>
                  <n-radio-button value="model">仅模型</n-radio-button>
                </n-radio-group>
                <n-radio-group v-model:value="layer" size="small">
                  <n-radio-button value="both">OCR+YOLO</n-radio-button>
                  <n-radio-button value="ocr">仅 OCR</n-radio-button>
                  <n-radio-button value="yolo">仅 YOLO</n-radio-button>
                </n-radio-group>
              </div>
            </div>

            <div class="toolbar2">
              <n-space>
                <n-button type="primary" :loading="runningOcr" :disabled="!image" @click="onRunOcr">
                  运行 OCR
                </n-button>
                <n-button type="primary" :loading="runningYolo" :disabled="!image" @click="onRunYolo">
                  运行 YOLO
                </n-button>
                <n-button secondary :disabled="!image" @click="applyHumanFixHints">一键演示修正</n-button>
                <n-button quaternary :disabled="!image" @click="resetToModel">恢复模型结果</n-button>
                <n-button type="success" :loading="saving" :disabled="!image" @click="onSave">
                  保存修正
                </n-button>
                <n-button quaternary :disabled="!image" @click="logVisible = true">变更日志</n-button>
                <n-button quaternary @click="router.push('/prelabel/accept')">去验收向导</n-button>
              </n-space>
              <div class="conf-row">
                <span class="lab">置信度阈值</span>
                <n-slider v-model:value="confThreshold" :min="0" :max="1" :step="0.05" style="width: 140px" />
                <span class="lab">{{ (confThreshold * 100).toFixed(0) }}%</span>
              </div>
            </div>

            <ProgressMock :running="runningOcr || runningYolo || saving" label="视觉模型 / 保存处理中…" />

            <n-grid cols="24" :x-gap="12" :y-gap="12">
              <n-gi :span="14">
                <div class="canvas-wrap">
                  <img v-if="image" :src="image.imageUrl" class="bg" alt="sample" />
                  <div class="overlay">
                    <!-- YOLO boxes -->
                    <template v-if="showYolo && viewMode !== 'model'">
                      <div
                        v-for="b in filteredYolo"
                        :key="'h-' + b.id"
                        class="bbox"
                        :class="{ active: b.id === selectedBoxId, ghost: viewMode === 'diff' }"
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
                          {{ viewMode === 'diff' ? '人工' : '' }} {{ b.label }}
                          {{ (b.conf * 100).toFixed(0) }}%
                        </span>
                      </div>
                    </template>
                    <!-- model YOLO dashed in diff/model mode -->
                    <template v-if="showYolo && (viewMode === 'diff' || viewMode === 'model')">
                      <div
                        v-for="b in (image?.yoloModel || []).filter((x) => x.conf >= confThreshold)"
                        :key="'m-' + b.id"
                        class="bbox model"
                        :style="{
                          left: b.x * 100 + '%',
                          top: b.y * 100 + '%',
                          width: b.w * 100 + '%',
                          height: b.h * 100 + '%',
                        }"
                      >
                        <span class="bbox-label model-lab">模型 {{ b.label }} {{ (b.conf * 100).toFixed(0) }}%</span>
                      </div>
                    </template>
                    <!-- OCR -->
                    <template v-if="showOcr && viewMode !== 'model'">
                      <div
                        v-for="o in ocrDraft"
                        :key="'ho-' + o.id"
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
                    <template v-if="showOcr && (viewMode === 'diff' || viewMode === 'model')">
                      <div
                        v-for="o in image?.ocrModel || []"
                        :key="'mo-' + o.id"
                        class="ocr-box model"
                        :style="{
                          left: o.x * 100 + '%',
                          top: (o.y + (viewMode === 'diff' ? 0.04 : 0)) * 100 + '%',
                          width: o.w * 100 + '%',
                          height: o.h * 100 + '%',
                        }"
                      >
                        模型:{{ o.text }}
                      </div>
                    </template>
                  </div>
                  <div class="legend">
                    <span class="lg human">实线 = 人工/当前</span>
                    <span class="lg model">虚线 = 模型基线</span>
                    <span class="lg ocr">黄框 = OCR</span>
                  </div>
                </div>
              </n-gi>

              <n-gi :span="10">
                <n-tabs type="segment" size="small" default-value="edit">
                  <n-tab-pane name="edit" tab="编辑面板">
                    <div class="pane-title">OCR 文字层（可改字 / 删除）</div>
                    <div class="list-pane">
                      <div v-for="o in ocrDraft" :key="o.id" class="row-edit">
                        <n-input v-model:value="o.text" size="small" style="flex: 1" />
                        <n-tag size="small" :bordered="false">{{ (o.conf * 100).toFixed(0) }}%</n-tag>
                        <n-button text type="error" @click="removeOcr(o.id)">删</n-button>
                      </div>
                      <n-empty v-if="!ocrDraft.length" description="暂无 OCR 结果" size="small" />
                    </div>

                    <div class="pane-title mt">YOLO 检测框（改 label / 删除）</div>
                    <div class="list-pane">
                      <div
                        v-for="b in yoloDraft"
                        :key="b.id"
                        class="row-edit yolo-row"
                        :class="{ active: b.id === selectedBoxId, dim: b.conf < confThreshold }"
                        @click="selectedBoxId = b.id"
                      >
                        <n-select
                          v-model:value="b.label"
                          size="small"
                          style="width: 110px"
                          :options="labelOptions"
                        />
                        <span class="conf">{{ (b.conf * 100).toFixed(0) }}%</span>
                        <n-button text type="error" @click.stop="removeYolo(b.id)">删</n-button>
                      </div>
                      <n-empty v-if="!yoloDraft.length" description="暂无 YOLO 框" size="small" />
                    </div>

                    <n-alert
                      v-if="selectedBox"
                      class="mt"
                      type="info"
                      :bordered="false"
                      :title="`选中 ${selectedBox.id} · ${selectedBox.label}`"
                    >
                      x={{ selectedBox.x.toFixed(2) }} y={{ selectedBox.y.toFixed(2) }} w={{
                        selectedBox.w.toFixed(2)
                      }}
                      h={{ selectedBox.h.toFixed(2) }} · conf={{ (selectedBox.conf * 100).toFixed(1) }}%
                    </n-alert>
                  </n-tab-pane>

                  <n-tab-pane name="diff" tab="Diff 对照表">
                    <n-space class="mb">
                      <n-statistic label="一致" :value="diffSummary.same" />
                      <n-statistic label="已修正" :value="diffSummary.fixed" />
                      <n-statistic label="新增" :value="diffSummary.added" />
                      <n-statistic label="删除" :value="diffSummary.removed" />
                    </n-space>
                    <n-data-table
                      size="small"
                      :columns="diffColumns"
                      :data="allDiffRows"
                      :bordered="false"
                      :row-key="(r) => r.id"
                      :max-height="360"
                    />
                  </n-tab-pane>
                </n-tabs>
              </n-gi>
            </n-grid>
          </n-card>
        </n-spin>
      </n-gi>
    </n-grid>

    <n-drawer v-model:show="logVisible" :width="420" placement="right">
      <n-drawer-content title="视觉修正变更日志" closable>
        <n-empty v-if="!image?.changeLog?.length" description="尚无保存记录" />
        <n-timeline v-else>
          <n-timeline-item
            v-for="(c, i) in image.changeLog"
            :key="i"
            :title="(c.fields || []).join(', ') || '保存修正'"
            :time="c.at"
          >
            {{ c.actor || '系统' }}
          </n-timeline-item>
        </n-timeline>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.side { min-height: 620px; background: #14141c; }
.card-h { font-weight: 600; }
.side-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  border: 1px solid transparent;
}
.side-item:hover { background: #1a1a22; }
.side-item.active { background: #163528; border-color: #18a058; }
.side-id { font-size: 11px; color: #6b7280; }
.side-title { font-size: 13px; color: #e8e8ed; }
.side-tags { display: flex; gap: 4px; margin-top: 4px; }
.pager { margin-top: 12px; display: flex; justify-content: flex-end; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.title { font-size: 16px; font-weight: 600; color: #e8e8ed; display: flex; align-items: center; gap: 8px; }
.meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
.actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.conf-row { display: flex; align-items: center; gap: 8px; }
.lab { font-size: 12px; color: #8b8b9a; }
.canvas-wrap {
  position: relative;
  width: 100%;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  min-height: 360px;
}
.bg { display: block; width: 100%; height: auto; opacity: 0.95; }
.overlay { position: absolute; inset: 0; }
.bbox {
  position: absolute;
  border: 2px solid #1677ff;
  box-sizing: border-box;
  cursor: pointer;
  background: transparent;
}
.bbox.active { box-shadow: 0 0 0 2px #fff inset; }
.bbox.ghost { opacity: 0.95; }
.bbox.model {
  border-style: dashed;
  border-color: #f5222d;
  pointer-events: none;
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
.model-lab { background: #f5222dcc; }
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
.ocr-box.model {
  border-color: #ff4d4f;
  background: #ff4d4f22;
  color: #ffccc7;
}
.legend {
  position: absolute;
  left: 8px;
  top: 8px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  background: #00000088;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #e5e7eb;
}
.lg.human::before,
.lg.model::before,
.lg.ocr::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.lg.human::before { background: #63e2b7; }
.lg.model::before { background: #f5222d; border-top: 1px dashed #f5222d; }
.lg.ocr::before { background: #faad14; }
.pane-title { font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #e8e8ed; }
.list-pane {
  border: 1px solid #2a2a36;
  border-radius: 6px;
  padding: 8px;
  min-height: 120px;
  max-height: 200px;
  overflow: auto;
  background: #101018;
}
.row-edit { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.yolo-row { padding: 4px; border-radius: 4px; cursor: pointer; }
.yolo-row.active { background: #163528; }
.yolo-row.dim { opacity: 0.45; }
.conf { font-size: 12px; color: #6b7280; min-width: 36px; }
.mt { margin-top: 12px; }
.mb { margin-bottom: 10px; }
:deep(.n-card) { background: #14141c; }
</style>
