<script setup>
import { onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getDashboard } from '@/services/factory'

const router = useRouter()
const loading = ref(false)
const data = ref(null)
const throughputRef = ref(null)
const pieRef = ref(null)
const failRef = ref(null)
const charts = shallowRef([])

const statusColor = {
  running: 'processing',
  waiting_human: 'warning',
  succeeded: 'success',
  failed: 'error',
  ready: 'default',
  draft: 'default',
  paused: 'warning',
}

async function load() {
  loading.value = true
  try {
    data.value = await getDashboard()
    requestAnimationFrame(renderCharts)
  } finally {
    loading.value = false
  }
}

function renderCharts() {
  charts.value.forEach((c) => c.dispose())
  charts.value = []
  if (!data.value) return
  const t = echarts.init(throughputRef.value)
  t.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['样本产量', '任务数'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: data.value.series.dailyThroughput.map((d) => d.day) },
    yAxis: [{ type: 'value' }, { type: 'value' }],
    series: [
      {
        name: '样本产量',
        type: 'bar',
        data: data.value.series.dailyThroughput.map((d) => d.samples),
        itemStyle: { color: '#1677ff' },
      },
      {
        name: '任务数',
        type: 'line',
        yAxisIndex: 1,
        data: data.value.series.dailyThroughput.map((d) => d.tasks),
        itemStyle: { color: '#13c2c2' },
      },
    ],
  })
  const p = echarts.init(pieRef.value)
  p.setOption({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        data: data.value.series.modalityShare,
        label: { formatter: '{b} {d}%' },
      },
    ],
  })
  const f = echarts.init(failRef.value)
  f.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: data.value.series.nodeFailTop.map((d) => d.node).reverse(),
    },
    series: [
      {
        type: 'bar',
        data: data.value.series.nodeFailTop.map((d) => d.fails).reverse(),
        itemStyle: { color: '#eb2f96' },
      },
    ],
  })
  charts.value = [t, p, f]
}

onMounted(load)
onBeforeUnmount(() => charts.value.forEach((c) => c.dispose()))

const cols = [
  { title: '任务', dataIndex: 'name', key: 'name' },
  { title: '状态', key: 'status', width: 120 },
  { title: '进度', key: 'progress', width: 140 },
  { title: '当前节点', dataIndex: 'currentNode', key: 'currentNode', width: 140 },
  { title: '操作', key: 'op', width: 100 },
]
</script>

<template>
  <a-spin :spinning="loading">
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="演示环境：驾驶舱数字来自本地伪造种子，不连接真实调度集群。"
    />
    <a-row :gutter="[12, 12]" v-if="data">
      <a-col :xs="12" :md="4" v-for="k in [
        { label: '任务总量', value: data.counts.total },
        { label: '执行中', value: data.counts.running },
        { label: '等待人工', value: data.counts.waiting },
        { label: '已完成', value: data.counts.succeeded },
        { label: '失败', value: data.counts.failed },
        { label: '均耗时(s)', value: data.avgElapsedSec },
      ]" :key="k.label">
        <a-card size="small" class="kpi">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-value">{{ k.value }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[12, 12]" style="margin-top: 12px">
      <a-col :xs="24" :lg="12"><a-card title="近 7 日产量"><div ref="throughputRef" class="chart" /></a-card></a-col>
      <a-col :xs="24" :lg="6"><a-card title="模态占比"><div ref="pieRef" class="chart" /></a-card></a-col>
      <a-col :xs="24" :lg="6"><a-card title="节点失败 Top"><div ref="failRef" class="chart" /></a-card></a-col>
    </a-row>

    <a-card title="最近生产任务" style="margin-top: 12px" :extra="null">
      <template #extra>
        <a-button type="link" @click="router.push('/factory/tasks')">全部任务</a-button>
      </template>
      <a-table
        v-if="data"
        size="small"
        :columns="cols"
        :data-source="data.recent"
        :pagination="false"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'progress'">
            <a-progress :percent="Math.round((record.progress || 0) * 100)" size="small" />
          </template>
          <template v-else-if="column.key === 'op'">
            <a-button type="link" size="small" @click="router.push(`/factory/monitor?task=${record.id}`)">监控</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </a-spin>
</template>

<style scoped>
.kpi {
  border-radius: 10px;
}
.kpi-label {
  color: #64748b;
  font-size: 12px;
}
.kpi-value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 4px;
}
.chart {
  height: 240px;
}
</style>
