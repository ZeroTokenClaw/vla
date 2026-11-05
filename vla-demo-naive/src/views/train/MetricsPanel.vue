<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from '@/ui/discrete'
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

const lmTableCols1 = [
  { title: 'epoch', key: 'epoch', width: 80 },
  { title: 'loss', key: 'loss' },
  { title: 'acc', key: 'acc' },
  { title: 'mAP', key: 'map' },
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
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const epochs = metrics.value.loss.map((_, i) => i + 1)
  chart.setOption({
    backgroundColor: 'transparent',
    title: {
      text: exp.value ? `${exp.value.id} 训练指标` : '训练指标',
      left: 'center',
      textStyle: { fontSize: 14, color: '#e8e8ed' },
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['loss', 'acc', 'mAP'], top: 28, textStyle: { color: '#a0a0aa' } },
    grid: { left: 48, right: 24, top: 64, bottom: 40 },
    xAxis: {
      type: 'category',
      name: 'epoch',
      data: epochs.length ? epochs : [0],
      axisLabel: { color: '#8b8b97' },
    },
    yAxis: { type: 'value', scale: true, axisLabel: { color: '#8b8b97' } },
    series: [
      { name: 'loss', type: 'line', smooth: true, data: metrics.value.loss, itemStyle: { color: '#f97316' } },
      { name: 'acc', type: 'line', smooth: true, data: metrics.value.acc, itemStyle: { color: '#63e2b7' } },
      { name: 'mAP', type: 'line', smooth: true, data: metrics.value.map, itemStyle: { color: '#18a058' } },
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
    message.warning('尚无指标点，建议先运行训练或选择已完成实验')
  }
  exporting.value = true
  try {
    const res = await exportReport(exp.value.id, format)
    message.success(`已导出 ${res.filename}`)
  } catch (e) {
    message.error(e.message || '导出失败')
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
    <n-alert v-if="isAnnotator" type="info" :closable="false" class="perm">
      当前身份 {{ copy.roles[auth.role] }}：只读查看 loss / acc / mAP，可导出报表
    </n-alert>

    <n-grid cols="24" x-gap="16" y-gap="16">
      <n-gi span="6">
        <n-card class="card" :bordered="false" title="选择实验">
          <div
            v-for="e in experiments"
            :key="e.id"
            class="exp-item"
            :class="{ active: e.id === currentId }"
            @click="switchExp(e.id)"
          >
            <div class="id">{{ e.id }}</div>
            <div class="name">{{ e.name }}</div>
            <n-tag size="small" :bordered="false">{{ e.status }} · {{ e.metricLen || 0 }}pts</n-tag>
          </div>
          <n-empty v-if="!experiments.length" description="暂无实验" />
        </n-card>
      </n-gi>

      <n-gi span="18">
        <n-card v-if="exp" class="card" :bordered="false">
          <template #header>
            <div class="card-head">
              <span>指标面板 · {{ exp.id }}</span>
              <div class="ops">
                <n-button size="small" @click="refresh">刷新</n-button>
                <n-button size="small" type="primary" secondary :loading="exporting" :disabled="!canExport" @click="onExport('csv')">导出 CSV</n-button>
                <n-button size="small" type="success" secondary :loading="exporting" :disabled="!canExport" @click="onExport('excel')">导出 Excel</n-button>
              </div>
            </div>
          </template>

          <n-descriptions :column="4" size="small" bordered class="desc" label-placement="left">
            <n-descriptions-item label="状态">{{ exp.status }}</n-descriptions-item>
            <n-descriptions-item label="Epoch">{{ exp.currentEpoch }} / {{ exp.epochs }}</n-descriptions-item>
            <n-descriptions-item label="最新 loss">{{ metrics.loss.at(-1) ?? '—' }}</n-descriptions-item>
            <n-descriptions-item label="最新 acc / mAP">{{ metrics.acc.at(-1) ?? '—' }} / {{ metrics.map.at(-1) ?? '—' }}</n-descriptions-item>
          </n-descriptions>

          <div ref="chartRef" class="chart" />

          <n-data-table
            v-if="metrics.loss.length"
            class="table"
            size="small"
            :columns="lmTableCols1"
            :data="tableData"
            :bordered="false"
            :single-line="false"
          />
          <n-empty v-else description="暂无指标，请先在「训练运行」启动实验" />
        </n-card>
        <n-empty v-else description="请选择实验" />
      </n-gi>
    </n-grid>
  </div>
</template>

<style scoped>
.perm { margin-bottom: 12px; }
.card { border-radius: 10px; background: #14141a; }
.card-head { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.ops { display:flex; gap:8px; }
.exp-item { padding:10px; border-radius:8px; cursor:pointer; border:1px solid transparent; margin-bottom:8px; }
.exp-item:hover, .exp-item.active { border-color:#18a058; background:#0c1f16; }
.exp-item .id { font-size:12px; color:#63e2b7; }
.exp-item .name { font-size:13px; margin:2px 0 4px; }
.desc { margin-bottom:12px; }
.chart { width:100%; height:360px; background:#0f0f14; border-radius:6px; }
.table { margin-top:12px; }
</style>
