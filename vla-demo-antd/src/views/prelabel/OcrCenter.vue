<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { listVisionImages, getVisionImage, runOcr, saveCorrection } from '@/services/prelabel'
import ProgressMock from '@/components/ProgressMock.vue'

const router = useRouter()
const list = ref([])
const image = ref(null)
const ocrDraft = ref([])
const running = ref(false)
const loading = ref(false)
const modelVersion = ref('paddleocr-v4.0-demo')
const selectedId = ref(null)
const confThreshold = ref(0.5)

const selected = computed(() => ocrDraft.value.find((r) => r.id === selectedId.value) || null)
const lowConfCount = computed(() => ocrDraft.value.filter((r) => (r.conf ?? 1) < confThreshold.value).length)
const avgConf = computed(() => {
  if (!ocrDraft.value.length) return 0
  return Number((ocrDraft.value.reduce((s, r) => s + (r.conf || 0), 0) / ocrDraft.value.length).toFixed(3))
})

onMounted(async () => {
  const res = await listVisionImages({ page: 1, pageSize: 20 })
  list.value = res.items
  if (list.value[0]) await select(list.value[0].id)
})

async function select(id) {
  loading.value = true
  try {
    image.value = await getVisionImage(id)
    ocrDraft.value = JSON.parse(JSON.stringify(image.value.ocr || [])).map((r, i) => ({
      ...r,
      id: r.id || `ocr-${i}`,
      lang: r.lang || 'zh',
      edited: false,
    }))
    selectedId.value = ocrDraft.value[0]?.id || null
  } finally {
    loading.value = false
  }
}

async function run() {
  running.value = true
  try {
    const res = await runOcr(image.value.id)
    ocrDraft.value = (res || []).map((r, i) => ({ ...r, id: r.id || `ocr-${i}`, lang: r.lang || 'zh', edited: false }))
    selectedId.value = ocrDraft.value[0]?.id || null
    notification.success({ message: `OCR ${modelVersion.value} 完成（伪造推理结果）`, placement: 'topRight' })
  } finally {
    running.value = false
  }
}

async function save() {
  await saveCorrection(image.value.id, { ocr: ocrDraft.value })
  notification.success({ message: 'OCR 修正已保存', placement: 'topRight' })
}

function markEdited(index) {
  if (ocrDraft.value[index]) ocrDraft.value[index].edited = true
}
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="OCR 中心：模型版本 · 置信度阈值 · 低置信高亮 · 文本可改（伪造推理，不落真实 OCR 服务）。"
    />
    <a-row :gutter="12">
      <a-col :span="7">
        <a-card title="图像列表" size="small">
          <a-list size="small" :data-source="list">
            <template #renderItem="{ item }">
              <a-list-item
                style="cursor: pointer"
                :class="{ active: image?.id === item.id }"
                @click="select(item.id)"
              >
                <a-list-item-meta :title="item.id" :description="item.name || item.fileName || 'image'" />
              </a-list-item>
            </template>
          </a-list>
          <a-button type="link" @click="router.push('/prelabel/yolo')">切换 YOLO 中心 →</a-button>
          <a-button type="link" @click="router.push('/prelabel/accept')">去验收向导 →</a-button>
        </a-card>
      </a-col>
      <a-col :span="17">
        <a-spin :spinning="loading">
          <a-card v-if="image" :title="`OCR · ${image.id}`" size="small">
            <template #extra>
              <a-space wrap>
                <a-select
                  v-model:value="modelVersion"
                  style="width: 190px"
                  :options="[
                    { value: 'paddleocr-v4.0-demo', label: 'PaddleOCR v4.0' },
                    { value: 'paddleocr-v3.0-demo', label: 'PaddleOCR v3.0' },
                  ]"
                />
                <a-input-number v-model:value="confThreshold" :min="0.1" :max="0.99" :step="0.05" size="small" />
                <a-button type="primary" :loading="running" @click="run">运行 OCR</a-button>
                <a-button @click="save">保存修正</a-button>
              </a-space>
            </template>
            <ProgressMock v-if="running" label="OCR 推理中" />
            <a-row :gutter="12" style="margin-bottom: 12px">
              <a-col :span="6"><a-statistic title="识别行数" :value="ocrDraft.length" /></a-col>
              <a-col :span="6"><a-statistic title="平均置信度" :value="avgConf" :precision="3" /></a-col>
              <a-col :span="6"><a-statistic title="低置信行" :value="lowConfCount" /></a-col>
              <a-col :span="6"><a-statistic title="已人工改" :value="ocrDraft.filter((r) => r.edited).length" /></a-col>
            </a-row>
            <div class="preview">
              <img v-if="image.imageUrl || image.url" :src="image.imageUrl || image.url" alt="ocr" />
              <a-empty v-else description="无预览图" />
              <div v-if="selected" class="sel">
                选中：{{ selected.text }} · conf={{ selected.conf }}
              </div>
            </div>
            <a-table
              size="small"
              row-key="id"
              :pagination="false"
              :data-source="ocrDraft"
              :row-class-name="(record) => ((record.conf ?? 1) < confThreshold ? 'low-conf' : '')"
              :custom-row="(record) => ({ onClick: () => (selectedId = record.id), style: { cursor: 'pointer' } })"
              :columns="[
                { title: '文本', dataIndex: 'text' },
                { title: '置信度', dataIndex: 'conf', width: 100 },
                { title: '语言', dataIndex: 'lang', width: 70 },
                { title: '位置', key: 'box', width: 180 },
                { title: '修正', key: 'edited', width: 70 },
              ]"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.dataIndex === 'text'">
                  <a-input v-model:value="ocrDraft[index].text" size="small" @change="markEdited(index)" />
                </template>
                <template v-else-if="column.key === 'box'">
                  {{ JSON.stringify(record.bbox || record.box || record.poly || []) }}
                </template>
                <template v-else-if="column.key === 'edited'">
                  <a-tag :color="record.edited ? 'processing' : 'default'">{{ record.edited ? '是' : '否' }}</a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-spin>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.preview {
  margin-bottom: 12px;
  background: #f8fafc;
  border-radius: 8px;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
}
.preview img { max-height: 220px; max-width: 100%; }
.sel { margin-top: 8px; font-size: 12px; color: #64748b; }
.active { background: #e6f4ff; }
:deep(.low-conf) td { background: #fff7e6 !important; }
</style>
