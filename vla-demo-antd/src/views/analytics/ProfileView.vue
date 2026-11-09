<script setup>
import { nextTick, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import { notification } from 'ant-design-vue'
import { getDataProfile } from '@/services/analytics'

const loading = ref(false)
const data = ref(null)
const pieRef = ref(null)
const barRef = ref(null)
const densRef = ref(null)
const hourRef = ref(null)
const durRef = ref(null)
const sceneRef = ref(null)
const issueRef = ref(null)
const charts = shallowRef([])

async function load() {
  loading.value = true
  try {
    data.value = await getDataProfile()
    await nextTick()
    render()
    notification.success({ message: '画像已刷新（演示假数据）', placement: 'topRight' })
  } finally {
    loading.value = false
  }
}

function render() {
  charts.value.forEach((c) => c.dispose())
  const list = []
  if (!data.value) {
    charts.value = list
    return
  }
  const d = data.value

  if (pieRef.value) {
    const pie = echarts.init(pieRef.value)
    pie.setOption({
      tooltip: { trigger: 'item' },
      series: [{ type: 'pie', radius: ['40%', '68%'], data: d.modalityShare }],
    })
    list.push(pie)
  }
  if (barRef.value) {
    const bar = echarts.init(barRef.value)
    bar.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['入库', '标注', '异常'] },
      xAxis: { type: 'category', data: d.dailyIngest.map((x) => x.day) },
      yAxis: { type: 'value' },
      series: [
        { name: '入库', type: 'bar', data: d.dailyIngest.map((x) => x.count), itemStyle: { color: '#1677ff' } },
        { name: '标注', type: 'line', data: d.dailyIngest.map((x) => x.annotate || 0), itemStyle: { color: '#13c2c2' } },
        { name: '异常', type: 'line', data: d.dailyIngest.map((x) => x.anomaly || 0), itemStyle: { color: '#fa8c16' } },
      ],
    })
    list.push(bar)
  }
  if (densRef.value) {
    const dens = echarts.init(densRef.value)
    dens.setOption({
      tooltip: {},
      grid: { left: 100, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: d.labelDensity.map((x) => x.modality) },
      series: [{ type: 'bar', data: d.labelDensity.map((x) => x.avgLabels), itemStyle: { color: '#13c2c2' } }],
    })
    list.push(dens)
  }
  if (hourRef.value && d.hourly) {
    const c = echarts.init(hourRef.value)
    c.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['入库', '标注', '异常'] },
      grid: { left: 40, right: 16, top: 36, bottom: 28 },
      xAxis: { type: 'category', data: d.hourly.map((h) => h.hour), axisLabel: { interval: 3 } },
      yAxis: { type: 'value' },
      series: [
        { name: '入库', type: 'bar', data: d.hourly.map((h) => h.ingest), itemStyle: { color: '#1677ff' } },
        { name: '标注', type: 'line', data: d.hourly.map((h) => h.annotate), itemStyle: { color: '#52c41a' } },
        { name: '异常', type: 'line', data: d.hourly.map((h) => h.anomaly), itemStyle: { color: '#fa8c16' } },
      ],
    })
    list.push(c)
  }
  if (durRef.value && d.durationHist) {
    const c = echarts.init(durRef.value)
    c.setOption({
      tooltip: {},
      xAxis: { type: 'category', data: d.durationHist.map((x) => x.bucket) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: d.durationHist.map((x) => x.count), itemStyle: { color: '#722ed1' } }],
    })
    list.push(c)
  }
  if (sceneRef.value && d.sceneDistribution) {
    const c = echarts.init(sceneRef.value)
    c.setOption({
      tooltip: {},
      grid: { left: 100, right: 20, top: 16, bottom: 28 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: d.sceneDistribution.map((s) => s.scene) },
      series: [{ type: 'bar', data: d.sceneDistribution.map((s) => s.count), itemStyle: { color: '#2f54eb' } }],
    })
    list.push(c)
  }
  if (issueRef.value && d.topIssues) {
    const c = echarts.init(issueRef.value)
    c.setOption({
      tooltip: { trigger: 'item' },
      series: [{ type: 'pie', radius: '65%', data: d.topIssues.map((i) => ({ name: i.type, value: i.count })) }],
    })
    list.push(c)
  }
  charts.value = list
}

function onResize() {
  charts.value.forEach((c) => c.resize())
}

onMounted(load)
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  charts.value.forEach((c) => c.dispose())
})
window.addEventListener('resize', onResize)
</script>

<template>
  <a-spin :spinning="loading">
    <a-space style="margin-bottom: 12px" wrap>
      <a-alert
        type="info"
        show-icon
        style="flex: 1; min-width: 320px"
        message="多模态数据画像：入库量、模态占比、时段吞吐、时长分布、场景与异常构成（伪造运营数据）。"
      />
      <a-button type="primary" :loading="loading" @click="load">刷新画像</a-button>
    </a-space>

    <a-alert
      v-if="data"
      type="warning"
      show-icon
      style="margin-bottom: 12px"
      :message="`source_mode=${data.sourceMode || 'demo'} · 峰值 ${data.summary?.peakHour}:00 入库 ${data.summary?.peakIngest} · 缺失率 ${((data.missingRate || 0) * 100).toFixed(1)}%`"
    />

    <a-row v-if="data" :gutter="12" style="margin-bottom: 12px">
      <a-col :span="4"><a-card size="small"><div class="k">样本总量</div><div class="v">{{ data.summary?.totalSamples }}</div></a-card></a-col>
      <a-col :span="4"><a-card size="small"><div class="k">模态数</div><div class="v">{{ data.summary?.modalities }}</div></a-card></a-col>
      <a-col :span="4"><a-card size="small"><div class="k">平均时长</div><div class="v">{{ data.summary?.avgDurationSec }}s</div></a-card></a-col>
      <a-col :span="4"><a-card size="small"><div class="k">标签密度</div><div class="v">{{ data.summary?.labelDensity }}</div></a-card></a-col>
      <a-col :span="4"><a-card size="small"><div class="k">待处理异常</div><div class="v warn">{{ data.summary?.openAnomalies }}</div></a-card></a-col>
      <a-col :span="4"><a-card size="small"><div class="k">传感器种类</div><div class="v">{{ (data.sensorMix || []).length }}</div></a-card></a-col>
    </a-row>

    <a-row :gutter="12">
      <a-col :span="8"><a-card title="模态占比" size="small"><div ref="pieRef" class="chart" /></a-card></a-col>
      <a-col :span="8"><a-card title="近 7 日吞吐" size="small"><div ref="barRef" class="chart" /></a-card></a-col>
      <a-col :span="8"><a-card title="标签密度" size="small"><div ref="densRef" class="chart" /></a-card></a-col>
    </a-row>

    <a-row :gutter="12" style="margin-top: 12px">
      <a-col :span="12"><a-card title="24h 时段吞吐" size="small"><div ref="hourRef" class="chart" /></a-card></a-col>
      <a-col :span="12"><a-card title="样本时长分布" size="small"><div ref="durRef" class="chart" /></a-card></a-col>
    </a-row>

    <a-row :gutter="12" style="margin-top: 12px">
      <a-col :span="12"><a-card title="场景分布" size="small"><div ref="sceneRef" class="chart" /></a-card></a-col>
      <a-col :span="12"><a-card title="异常构成" size="small"><div ref="issueRef" class="chart" /></a-card></a-col>
    </a-row>

    <a-card title="热门标签 Top" style="margin-top: 12px" size="small" v-if="data">
      <a-tag v-for="t in data.topTags" :key="t.tag" color="purple" style="margin-bottom: 8px">{{ t.tag }} · {{ t.count }}</a-tag>
    </a-card>

    <a-row v-if="data" :gutter="12" style="margin-top: 12px">
      <a-col :span="8">
        <a-card title="入库明细" size="small">
          <a-table
            size="small"
            row-key="day"
            :pagination="false"
            :data-source="data.dailyIngest || []"
            :columns="[
              { title: '日期', dataIndex: 'day' },
              { title: '入库', dataIndex: 'count', width: 70 },
              { title: '标注', dataIndex: 'annotate', width: 70 },
              { title: '异常', dataIndex: 'anomaly', width: 70 },
            ]"
          />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="模态标签密度" size="small">
          <a-table
            size="small"
            row-key="modality"
            :pagination="false"
            :data-source="data.labelDensity || []"
            :columns="[
              { title: '模态', dataIndex: 'modality' },
              { title: '均标签', dataIndex: 'avgLabels', width: 80 },
              { title: '覆盖率', key: 'cov', width: 80 },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'cov'">{{ ((record.coverage || 0) * 100).toFixed(0) }}%</template>
            </template>
          </a-table>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="传感器混成" size="small">
          <a-table
            size="small"
            row-key="sensor"
            :pagination="false"
            :data-source="data.sensorMix || []"
            :columns="[
              { title: '传感器', dataIndex: 'sensor' },
              { title: '占比', key: 'share' },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'share'">
                <a-progress :percent="Math.round(record.share * 100)" size="small" :show-info="true" />
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </a-spin>
</template>

<style scoped>
.chart { height: 260px; }
.k { color: #8c8c8c; font-size: 12px; }
.v { font-size: 22px; font-weight: 600; margin-top: 4px; }
.v.warn { color: #fa8c16; }
</style>
