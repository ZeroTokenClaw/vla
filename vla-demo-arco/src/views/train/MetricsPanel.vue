<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@/ui/discrete'
import * as echarts from 'echarts'
import { useAuthStore } from '@/stores/auth'
import { copy } from '@/i18n/copy'
import {
  listExperiments,
  getExperiment,
  getMetrics,
  exportReport,
} from '@/services/train'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const experiments = ref([])
const exp = ref(null)
const metrics = ref({ loss: [], acc: [], map: [] })
const loading = ref(false)
const exporting = ref(false)
const chartRef = ref(null)
let chart = null

const currentId = computed(() => route.params.id)
const isAnnotator = computed(() => auth.role === 'annotator')
const canExport = computed(() => true)

const tableData = computed(() =>
  metrics.value.loss.map((loss, i) => ({
    epoch: i + 1,
    loss,
    acc: metrics.value.acc[i],
    map: metrics.value.map[i],
  })),
)

const scTableCols1 = [
  { title: 'epoch', dataIndex: 'epoch', width: 80 },
  { title: 'loss', dataIndex: 'loss' },
  { title: 'acc', dataIndex: 'acc' },
  { title: 'mAP', dataIndex: 'map' },
]

async function loadList() {
  experiments.value = (await listExperiments({ page: 1, pageSize: 200 })).items
}

async function loadAll(id) {
  if (!id) {
    exp.value = null
    metrics.value = { loss: [], acc: [], map: [] }
    renderChart()
    return
  }
  loading.value = true
  try {
    exp.value = await getExperiment(id)
    metrics.value = await getMetrics(id)
    await nextTick()
    renderChart()
  } catch (e) {
    Message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const epochs = metrics.value.loss.map((_, i) => i + 1)
  chart.setOption({
    title: {
      text: exp.value ? `${exp.value.id} 训练指标` : '训练指标',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['loss', 'acc', 'mAP'], top: 28 },
    grid: { left: 48, right: 24, top: 64, bottom: 40 },
    xAxis: {
      type: 'category',
      name: 'epoch',
      data: epochs.length ? epochs : [0],
    },
    yAxis: { type: 'value', scale: true },
    series: [
      { name: 'loss', type: 'line', smooth: true, data: metrics.value.loss, itemStyle: { color: '#f97316' } },
      { name: 'acc', type: 'line', smooth: true, data: metrics.value.acc, itemStyle: { color: '#0FC6C2' } },
      { name: 'mAP', type: 'line', smooth: true, data: metrics.value.map, itemStyle: { color: '#00B42A' } },
    ],
  })
}

function onResize() {
  chart?.resize()
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await loadList()
  if (currentId.value) await loadAll(currentId.value)
  else if (experiments.value[0]) router.replace(`/train/metrics/${experiments.value[0].id}`)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

watch(currentId, (id) => {
  if (id) loadAll(id)
})

function switchExp(id) {
  router.push(`/train/metrics/${id}`)
}

async function onExport(format) {
  if (!exp.value) return
  if (!metrics.value.loss.length && exp.value.status !== 'finished') {
    Message.warning('尚无指标点，建议先运行训练或选择已完成实验')
  }
  exporting.value = true
  try {
    const res = await exportReport(exp.value.id, format)
    Message.success(`已导出 ${res.filename}`)
  } catch (e) {
    Message.error(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function refresh() {
  if (currentId.value) await loadAll(currentId.value)
}
</script>

<template>
  <div class="metrics">
    <a-spin :loading="loading" style="width: 100%">
      <a-alert
        v-if="isAnnotator"
        type="info"
        :closable="false"
        show-icon
        class="perm"
        :title="`当前身份 ${copy.roles[auth.role]}：只读查看 loss / acc / mAP，可导出报表`"
      />

      <a-row :gutter="16">
        <a-col :span="6">
          <a-card class="card" title="选择实验">
            <div
              v-for="e in experiments"
              :key="e.id"
              class="exp-item"
              :class="{ active: e.id === currentId }"
              @click="switchExp(e.id)"
            >
              <div class="id">{{ e.id }}</div>
              <div class="name">{{ e.name }}</div>
              <a-tag size="small" color="arcoblue">{{ e.status }} · {{ e.metricLen || 0 }}pts</a-tag>
            </div>
            <a-empty v-if="!experiments.length" :description="copy.empty.experiments" />
          </a-card>
        </a-col>

        <a-col :span="18">
          <a-card v-if="exp" class="card">
            <template #title>
              <div class="card-head">
                <span>指标面板 · {{ exp.id }}</span>
                <div class="ops">
                  <a-button size="small" @click="refresh">刷新</a-button>
                  <a-button size="small" type="primary" :loading="exporting" :disabled="!canExport" @click="onExport('csv')">导出 CSV</a-button>
                  <a-button size="small" status="success" :loading="exporting" :disabled="!canExport" @click="onExport('excel')">导出 Excel</a-button>
                </div>
              </div>
            </template>

            <a-descriptions :column="4" size="small" bordered class="desc">
              <a-descriptions-item label="状态">{{ exp.status }}</a-descriptions-item>
              <a-descriptions-item label="Epoch">{{ exp.currentEpoch }} / {{ exp.epochs }}</a-descriptions-item>
              <a-descriptions-item label="最新 loss">{{ metrics.loss.at(-1) ?? '—' }}</a-descriptions-item>
              <a-descriptions-item label="最新 acc / mAP">{{ metrics.acc.at(-1) ?? '—' }} / {{ metrics.map.at(-1) ?? '—' }}</a-descriptions-item>
            </a-descriptions>

            <div ref="chartRef" class="chart" />

            <a-table
              v-if="metrics.loss.length"
              class="table"
              size="small"
              :columns="scTableCols1"
              :data="tableData"
              :pagination="false"
              row-key="epoch"
            />
            <a-empty v-else description="暂无指标，请先在「训练运行」启动实验" />
          </a-card>
          <a-empty v-else :description="copy.empty.experiments" />
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<style scoped>
.perm { margin-bottom: 12px; }
.card { border-radius: 8px; }
.card-head { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.ops { display:flex; gap:8px; }
.exp-item { padding:10px; border-radius:8px; cursor:pointer; border:1px solid transparent; margin-bottom:8px; }
.exp-item:hover, .exp-item.active { border-color:#00b42a; background:#e8ffea; }
.exp-item .id { font-size:12px; color:#00b42a; }
.exp-item .name { font-size:13px; margin:2px 0 4px; }
.desc { margin-bottom:12px; }
.chart { width:100%; height:360px; background:#fafafa; border-radius:6px; }
.table { margin-top:12px; }
</style>
