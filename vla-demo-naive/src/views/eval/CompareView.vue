<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import { listEvalModels, runModelCompare, listCompareReports } from '@/services/evalBiz'
import { message } from '@/ui/discrete'

const loading = ref(false)
const models = ref([])
const selected = ref([])
const report = ref(null)
const history = ref([])
const radarRef = ref(null)
const barRef = ref(null)
let radarChart = null
let barChart = null

const tableColumns = [
  { title: '模型', key: 'name' },
  { title: '版本', key: 'version', ellipsis: { tooltip: true } },
  { title: '算法', key: 'algo', width: 100 },
  {
    title: '成功率',
    key: 'success',
    width: 90,
    render: (r) => (r.success != null ? r.success : '—'),
  },
  {
    title: '动作Acc',
    key: 'actionAcc',
    width: 90,
    render: (r) => (r.actionAcc != null ? r.actionAcc : '—'),
  },
  {
    title: '一致性',
    key: 'consistency',
    width: 80,
    render: (r) => (r.consistency != null ? r.consistency : '—'),
  },
  {
    title: 'mAP50',
    key: 'map50',
    width: 80,
    render: (r) => (r.map50 != null ? r.map50 : '—'),
  },
  { title: '时延ms', key: 'latencyMs', width: 80 },
]

const deltaColumns = [
  { title: '模型', key: 'name' },
  { title: '主指标', key: 'metric', width: 100 },
  { title: '取值', key: 'value', width: 90 },
  {
    title: '相对最优 Δ',
    key: 'deltaToBest',
    width: 110,
    render: (r) => (r.deltaToBest === 0 ? '最优' : String(r.deltaToBest)),
  },
]

async function loadModels() {
  const res = await listEvalModels()
  models.value = res.items
  if (selected.value.length < 2 && res.items.length >= 2) {
    selected.value = res.items.slice(0, 2).map((m) => m.id)
  }
}

async function loadHistory() {
  history.value = (await listCompareReports()).items || []
}

async function runCompare() {
  if (selected.value.length < 2) {
    message.warning('请至少选择 2 个模型')
    return
  }
  loading.value = true
  try {
    report.value = await runModelCompare(selected.value)
    await loadHistory()
    await nextTick()
    renderCharts()
    message.success(`对比报告 ${report.value.id} 已生成（演示假数据）`)
  } catch (e) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

function openHistory(row) {
  report.value = row
  nextTick().then(renderCharts)
}

function renderCharts() {
  if (!report.value) return
  if (radarRef.value && report.value.radar) {
    if (!radarChart) radarChart = echarts.init(radarRef.value)
    const { indicators, series } = report.value.radar
    radarChart.setOption({
      backgroundColor: 'transparent',
      legend: { data: series.map((s) => s.name), textStyle: { color: '#a0a0aa' }, bottom: 0 },
      radar: {
        indicator: indicators.map((i) => ({ name: i.name, max: i.max })),
        axisName: { color: '#a0a0aa' },
      },
      series: [
        {
          type: 'radar',
          data: series.map((s, idx) => ({
            ...s,
            areaStyle: { opacity: 0.15 },
            lineStyle: { width: 2 },
            itemStyle: { color: ['#63e2b7', '#18a058', '#f0a020', '#70c0e8'][idx % 4] },
          })),
        },
      ],
    })
  }
  if (barRef.value) {
    if (!barChart) barChart = echarts.init(barRef.value)
    const latency = (report.value.rows || []).map((r) => r.latencyMs || 0)
    const primary = report.value.bar?.values || []
    barChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: [report.value.primaryMetric || '主指标', '时延ms'], textStyle: { color: '#a0a0aa' } },
      grid: { left: 48, right: 48, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: report.value.bar?.categories || report.value.rows.map((r) => r.name),
        axisLabel: { color: '#8b8b97' },
      },
      yAxis: [
        { type: 'value', name: '指标', max: 1, axisLabel: { color: '#8b8b97' }, splitLine: { lineStyle: { color: '#2a2a35' } } },
        { type: 'value', name: 'ms', axisLabel: { color: '#8b8b97' }, splitLine: { show: false } },
      ],
      series: [
        {
          name: report.value.primaryMetric || '主指标',
          type: 'bar',
          data: primary,
          itemStyle: { color: '#63e2b7' },
          barWidth: 22,
        },
        {
          name: '时延ms',
          type: 'line',
          yAxisIndex: 1,
          data: latency,
          itemStyle: { color: '#f0a020' },
        },
      ],
    })
  }
}

onMounted(async () => {
  await loadModels()
  await loadHistory()
})
onUnmounted(() => {
  radarChart?.dispose()
  barChart?.dispose()
})
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>多模型评测对比</h2>
        <p>雷达 · 柱状/时延 · Δ 相对最优 · Case 矩阵 · 历史报告（假数据可操作）</p>
      </div>
    </div>

    <n-alert type="info" :bordered="false" class="mb">
      演示说明：指标与 case 分来自模型注册表假数据，不代表在线评测进程已执行。
    </n-alert>

    <n-card :bordered="false" class="mb">
      <n-space align="center">
        <n-select
          v-model:value="selected"
          multiple
          filterable
          placeholder="选择 ≥2 个模型版本"
          style="min-width: 480px"
          :options="models.map((m) => ({ label: `${m.name} · ${m.version}`, value: m.id }))"
        />
        <n-button type="primary" :loading="loading" @click="runCompare">运行对比</n-button>
      </n-space>
    </n-card>

    <template v-if="report">
      <n-space class="mb">
        <n-tag type="success" :bordered="false">{{ report.id }}</n-tag>
        <n-tag :bordered="false">{{ report.createdAt }}</n-tag>
        <n-tag type="warning" :bordered="false">source_mode={{ report.sourceMode }}</n-tag>
        <n-tag type="info" :bordered="false">
          最优 {{ report.winner?.name }} · {{ report.primaryMetric }}={{ report.winner?.value }}
        </n-tag>
      </n-space>

      <div class="grid mb">
        <n-card title="雷达对比" :bordered="false">
          <div ref="radarRef" class="chart" />
        </n-card>
        <n-card title="主指标柱状 + 时延" :bordered="false">
          <div ref="barRef" class="chart" />
        </n-card>
      </div>

      <div class="grid mb">
        <n-card title="指标宽表" :bordered="false">
          <n-data-table size="small" :data="report.rows" :columns="tableColumns" />
          <p class="note">{{ report.note }}</p>
        </n-card>
        <n-card title="相对最优 Δ" :bordered="false">
          <n-data-table size="small" :data="report.deltas || []" :columns="deltaColumns" />
        </n-card>
      </div>

      <n-card v-if="report.cases?.length" title="Case 级得分矩阵" :bordered="false" class="mb">
        <n-data-table
          size="small"
          :data="report.cases"
          :columns="[
            { title: 'Case', key: 'name', ellipsis: { tooltip: true } },
            { title: 'ID', key: 'caseId', width: 110 },
            ...selected.map((id) => {
              const m = models.find((x) => x.id === id)
              return {
                title: m?.name || id,
                key: id,
                width: 110,
                render: (r) => {
                  const cell = r.scores?.[id]
                  return cell ? `${cell.score}${cell.note ? ' · ' + cell.note : ''}` : '—'
                },
              }
            }),
          ]"
        />
      </n-card>
    </template>

    <n-card title="历史对比报告" :bordered="false">
      <n-data-table
        size="small"
        :data="history"
        :row-props="(row) => ({ style: 'cursor:pointer', onClick: () => openHistory(row) })"
        :columns="[
          { title: '报告 ID', key: 'id', width: 180 },
          { title: '时间', key: 'createdAt', width: 170 },
          { title: '主指标', key: 'primaryMetric', width: 100 },
          {
            title: '最优模型',
            key: 'winner',
            render: (r) => r.winner?.name || '—',
          },
          {
            title: '参与数',
            key: 'n',
            width: 80,
            render: (r) => r.rows?.length || 0,
          },
        ]"
      />
      <n-empty v-if="!history.length" description="运行对比后将保留最近 20 条演示报告" />
    </n-card>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.head { margin-bottom: 12px; }
h2 { margin: 0 0 6px; font-size: 20px; }
p { margin: 0; color: #9a9aab; }
.mb { margin-bottom: 12px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.chart { height: 300px; }
.note { margin-top: 10px; color: #6e6e7a; font-size: 12px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
</style>
