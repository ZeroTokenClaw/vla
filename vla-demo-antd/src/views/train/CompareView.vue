<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { notification } from 'ant-design-vue'
import * as echarts from 'echarts'
import { listEvalModels, runModelCompare, listCompareReports } from '@/services/evalBiz'

const loading = ref(false)
const models = ref([])
const selected = ref([])
const report = ref(null)
const history = ref([])
const radarRef = ref(null)
const barRef = ref(null)
let radarChart = null
let barChart = null

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
    notification.warning({ message: '请至少选择 2 个模型', placement: 'topRight' })
    return
  }
  loading.value = true
  try {
    report.value = await runModelCompare(selected.value)
    await loadHistory()
    await nextTick()
    renderCharts()
    notification.success({ message: `对比报告 ${report.value.id} 已生成（演示假数据）`, placement: 'topRight' })
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
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
      legend: { data: series.map((s) => s.name), bottom: 0 },
      radar: { indicator: indicators.map((i) => ({ name: i.name, max: i.max })) },
      series: [
        {
          type: 'radar',
          data: series.map((s, idx) => ({
            ...s,
            areaStyle: { opacity: 0.12 },
            lineStyle: { width: 2 },
            itemStyle: { color: ['#1677ff', '#13c2c2', '#fa8c16', '#eb2f96'][idx % 4] },
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
      tooltip: { trigger: 'axis' },
      legend: { data: [report.value.primaryMetric || '主指标', '时延ms'] },
      grid: { left: 48, right: 48, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: report.value.bar?.categories || report.value.rows.map((r) => r.name),
      },
      yAxis: [
        { type: 'value', name: '指标', max: 1 },
        { type: 'value', name: 'ms' },
      ],
      series: [
        {
          name: report.value.primaryMetric || '主指标',
          type: 'bar',
          data: primary,
          itemStyle: { color: '#1677ff' },
          barWidth: 22,
        },
        {
          name: '时延ms',
          type: 'line',
          yAxisIndex: 1,
          data: latency,
          itemStyle: { color: '#fa8c16' },
        },
      ],
    })
  }
}

const caseColumns = () => {
  const base = [
    { title: 'Case', dataIndex: 'name', ellipsis: true },
    { title: 'ID', dataIndex: 'caseId', width: 120 },
  ]
  for (const id of selected.value) {
    const m = models.value.find((x) => x.id === id)
    base.push({
      title: m?.name || id,
      key: id,
      width: 120,
      customRender: ({ record }) => {
        const cell = record.scores?.[id]
        return cell ? `${cell.score}${cell.note ? ' · ' + cell.note : ''}` : '—'
      },
    })
  }
  return base
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
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="多模型评测对比：雷达 · 柱状/时延 · Δ 相对最优 · Case 矩阵 · 历史报告（假数据可操作，非在线评测）。"
    />

    <a-card size="small" style="margin-bottom: 12px">
      <a-space wrap>
        <a-select
          v-model:value="selected"
          mode="multiple"
          style="min-width: 420px"
          placeholder="选择 ≥2 个模型版本"
          :options="models.map((m) => ({ value: m.id, label: `${m.name} · ${m.version}` }))"
        />
        <a-button type="primary" :loading="loading" @click="runCompare">运行对比</a-button>
      </a-space>
    </a-card>

    <template v-if="report">
      <a-space wrap style="margin-bottom: 12px">
        <a-tag color="success">{{ report.id }}</a-tag>
        <a-tag>{{ report.createdAt }}</a-tag>
        <a-tag color="orange">source_mode={{ report.sourceMode }}</a-tag>
        <a-tag color="blue">最优 {{ report.winner?.name }} · {{ report.primaryMetric }}={{ report.winner?.value }}</a-tag>
      </a-space>

      <a-row :gutter="12" style="margin-bottom: 12px">
        <a-col :span="12"><a-card title="雷达对比" size="small"><div ref="radarRef" class="chart" /></a-card></a-col>
        <a-col :span="12"><a-card title="主指标柱状 + 时延" size="small"><div ref="barRef" class="chart" /></a-card></a-col>
      </a-row>

      <a-row :gutter="12" style="margin-bottom: 12px">
        <a-col :span="14">
          <a-card title="指标宽表" size="small">
            <a-table
              size="small"
              row-key="modelId"
              :pagination="false"
              :data-source="report.rows"
              :columns="[
                { title: '模型', dataIndex: 'name' },
                { title: '版本', dataIndex: 'version', ellipsis: true },
                { title: '算法', dataIndex: 'algo', width: 110 },
                { title: '成功率', dataIndex: 'success', width: 90 },
                { title: '动作Acc', dataIndex: 'actionAcc', width: 90 },
                { title: '一致性', dataIndex: 'consistency', width: 80 },
                { title: 'mAP50', dataIndex: 'map50', width: 80 },
                { title: '时延ms', dataIndex: 'latencyMs', width: 80 },
              ]"
            />
            <p class="note">{{ report.note }}</p>
          </a-card>
        </a-col>
        <a-col :span="10">
          <a-card title="相对最优 Δ" size="small">
            <a-table
              size="small"
              row-key="modelId"
              :pagination="false"
              :data-source="report.deltas || []"
              :columns="[
                { title: '模型', dataIndex: 'name' },
                { title: '主指标', dataIndex: 'metric', width: 90 },
                { title: '取值', dataIndex: 'value', width: 80 },
                { title: 'Δ', key: 'delta', width: 90 },
              ]"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'delta'">
                  <a-tag :color="record.deltaToBest === 0 ? 'success' : 'default'">
                    {{ record.deltaToBest === 0 ? '最优' : record.deltaToBest }}
                  </a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>

      <a-card v-if="report.cases?.length" title="Case 级得分矩阵" size="small" style="margin-bottom: 12px">
        <a-table size="small" row-key="caseId" :pagination="false" :data-source="report.cases" :columns="caseColumns()" />
      </a-card>
    </template>

    <a-card title="历史对比报告" size="small">
      <a-table
        size="small"
        row-key="id"
        :data-source="history"
        :pagination="false"
        :custom-row="(row) => ({ onClick: () => openHistory(row), style: { cursor: 'pointer' } })"
        :columns="[
          { title: '报告 ID', dataIndex: 'id', width: 180 },
          { title: '时间', dataIndex: 'createdAt', width: 170 },
          { title: '主指标', dataIndex: 'primaryMetric', width: 100 },
          { title: '最优模型', key: 'winner' },
          { title: '参与数', key: 'n', width: 80 },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'winner'">{{ record.winner?.name || '—' }}</template>
          <template v-else-if="column.key === 'n'">{{ record.rows?.length || 0 }}</template>
        </template>
      </a-table>
      <a-empty v-if="!history.length" description="运行对比后将保留最近 20 条演示报告" />
    </a-card>
  </div>
</template>

<style scoped>
.chart { height: 300px; }
.note { margin-top: 10px; color: #8c8c8c; font-size: 12px; }
</style>
