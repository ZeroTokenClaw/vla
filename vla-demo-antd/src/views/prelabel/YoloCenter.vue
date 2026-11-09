<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { listVisionImages, getVisionImage, runYolo, saveCorrection } from '@/services/prelabel'
import ProgressMock from '@/components/ProgressMock.vue'

const router = useRouter()
const list = ref([])
const image = ref(null)
const yoloDraft = ref([])
const running = ref(false)
const loading = ref(false)
const modelVersion = ref('yolov8n-orn-demo')
const selectedId = ref(null)
const confThreshold = ref(0.45)

const selected = computed(() => yoloDraft.value.find((r) => r.id === selectedId.value) || null)
const classDist = computed(() => {
  const map = {}
  for (const b of yoloDraft.value) {
    const k = b.label || b.class || 'UNK'
    map[k] = (map[k] || 0) + 1
  }
  return Object.entries(map).map(([label, count]) => ({ label, count }))
})
const lowConf = computed(() => yoloDraft.value.filter((b) => (b.conf ?? 1) < confThreshold.value).length)

onMounted(async () => {
  const res = await listVisionImages({ page: 1, pageSize: 20 })
  list.value = res.items
  if (list.value[0]) await select(list.value[0].id)
})

async function select(id) {
  loading.value = true
  try {
    image.value = await getVisionImage(id)
    yoloDraft.value = JSON.parse(JSON.stringify(image.value.yolo || [])).map((r, i) => ({
      ...r,
      id: r.id || `det-${i}`,
      edited: false,
    }))
    selectedId.value = yoloDraft.value[0]?.id || null
  } finally {
    loading.value = false
  }
}

async function run() {
  running.value = true
  try {
    const res = await runYolo(image.value.id)
    yoloDraft.value = (res || []).map((r, i) => ({ ...r, id: r.id || `det-${i}`, edited: false }))
    selectedId.value = yoloDraft.value[0]?.id || null
    notification.success({ message: `YOLO ${modelVersion.value} 完成（伪造）`, placement: 'topRight' })
  } finally {
    running.value = false
  }
}

async function save() {
  await saveCorrection(image.value.id, { yolo: yoloDraft.value })
  notification.success({ message: '检测框修正已保存', placement: 'topRight' })
}

function removeBox(id) {
  yoloDraft.value = yoloDraft.value.filter((b) => b.id !== id)
  if (selectedId.value === id) selectedId.value = yoloDraft.value[0]?.id || null
}

function markEdited(index) {
  if (yoloDraft.value[index]) yoloDraft.value[index].edited = true
}
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="YOLO 中心：模型版本 · 类别分布 · 低置信过滤 · 人工改类名/置信度（伪造框数据）。"
    />
    <a-row :gutter="12">
      <a-col :span="7">
        <a-card title="图像批次" size="small">
          <a-list size="small" :data-source="list">
            <template #renderItem="{ item }">
              <a-list-item style="cursor: pointer" @click="select(item.id)">
                <a-list-item-meta :title="item.id" :description="item.name || item.fileName || 'image'" />
              </a-list-item>
            </template>
          </a-list>
          <a-button type="link" @click="router.push('/prelabel/ocr')">← 切换 OCR 中心</a-button>
          <a-button type="link" @click="router.push('/prelabel/vision')">打开 Vision 工作台 →</a-button>
        </a-card>
        <a-card title="类别分布" size="small" style="margin-top: 12px">
          <div v-for="c in classDist" :key="c.label" class="cls">
            <code>{{ c.label }}</code>
            <a-progress :percent="Math.round((c.count / Math.max(yoloDraft.length, 1)) * 100)" size="small" :show-info="false" />
            <span>{{ c.count }}</span>
          </div>
          <a-empty v-if="!classDist.length" description="暂无检测框" />
        </a-card>
      </a-col>
      <a-col :span="17">
        <a-spin :spinning="loading">
          <a-card v-if="image" :title="`YOLO · ${image.id}`" size="small">
            <template #extra>
              <a-space wrap>
                <a-select
                  v-model:value="modelVersion"
                  style="width: 180px"
                  :options="[
                    { value: 'yolov8n-orn-demo', label: 'YOLOv8n demo' },
                    { value: 'yolov8m-orn-demo', label: 'YOLOv8m demo' },
                    { value: 'yolov11n-orn-demo', label: 'YOLOv11n demo' },
                  ]"
                />
                <a-input-number v-model:value="confThreshold" :min="0.1" :max="0.99" :step="0.05" size="small" />
                <a-button type="primary" :loading="running" @click="run">批量推理</a-button>
                <a-button @click="save">保存</a-button>
              </a-space>
            </template>
            <ProgressMock v-if="running" label="YOLO 推理中" />
            <a-row :gutter="12" style="margin-bottom: 12px">
              <a-col :span="6"><a-statistic title="检测框" :value="yoloDraft.length" /></a-col>
              <a-col :span="6"><a-statistic title="类别数" :value="classDist.length" /></a-col>
              <a-col :span="6"><a-statistic title="低置信" :value="lowConf" /></a-col>
              <a-col :span="6"><a-statistic title="已修正" :value="yoloDraft.filter((b) => b.edited).length" /></a-col>
            </a-row>

            <a-alert
              v-if="selected"
              type="success"
              show-icon
              style="margin-bottom: 12px"
              :message="`选中框 ${selected.id} · ${selected.label} · conf=${selected.conf}`"
              :description="`bbox=${JSON.stringify(selected.bbox || selected.box || [])}`"
            />

            <a-table
              size="small"
              row-key="id"
              :pagination="false"
              :data-source="yoloDraft"
              :row-class-name="(record) => ((record.conf ?? 1) < confThreshold ? 'low-conf' : '')"
              :custom-row="(record) => ({ onClick: () => (selectedId = record.id), style: { cursor: 'pointer' } })"
              :columns="[
                { title: '类别', dataIndex: 'label', width: 140 },
                { title: '置信度', dataIndex: 'conf', width: 110 },
                { title: 'bbox', key: 'bbox' },
                { title: '修正', key: 'edited', width: 70 },
                { title: '操作', key: 'op', width: 80 },
              ]"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.dataIndex === 'label'">
                  <a-input v-model:value="yoloDraft[index].label" size="small" @change="markEdited(index)" />
                </template>
                <template v-else-if="column.dataIndex === 'conf'">
                  <a-input-number
                    v-model:value="yoloDraft[index].conf"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    size="small"
                    @change="markEdited(index)"
                  />
                </template>
                <template v-else-if="column.key === 'bbox'">
                  {{ JSON.stringify(record.bbox || record.box || []) }}
                </template>
                <template v-else-if="column.key === 'edited'">
                  <a-tag :color="record.edited ? 'processing' : 'default'">{{ record.edited ? '是' : '否' }}</a-tag>
                </template>
                <template v-else-if="column.key === 'op'">
                  <a-button type="link" danger size="small" @click.stop="removeBox(record.id)">删除</a-button>
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
.cls {
  display: grid;
  grid-template-columns: 80px 1fr 28px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}
:deep(.low-conf) td { background: #fff7e6 !important; }
</style>
