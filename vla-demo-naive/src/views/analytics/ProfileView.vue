<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import { getDataProfile } from '@/services/analytics'
import { message } from '@/ui/discrete'

const loading = ref(false)
const profile = ref(null)
const modRef = ref(null)
const hourRef = ref(null)
const durRef = ref(null)
const sceneRef = ref(null)
const issueRef = ref(null)
let charts = []

async function load() {
  loading.value = true
  try {
    profile.value = await getDataProfile()
    await nextTick()
    renderCharts()
    message.success('画像已刷新（演示假数据）')
  } catch (e) {
    message.error(e.message || '画像加载失败')
  } finally {
    loading.value = false
  }
}

function disposeCharts() {
  charts.forEach((c) => c.dispose())
  charts = []
}

function renderCharts() {
  disposeCharts()
  const p = profile.value
  if (!p) return
  const common = { backgroundColor: 'transparent', textStyle: { color: '#c8c8d0' } }

  if (modRef.value) {
    const c = echarts.init(modRef.value)
    c.setOption({
      ...common,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '68%'],
          data: (p.modalityDistribution || []).map((m) => ({ name: m.name, value: m.count })),
          label: { color: '#a0a0aa' },
        },
      ],
    })
    charts.push(c)
  }
  if (hourRef.value) {
    const c = echarts.init(hourRef.value)
    c.setOption({
      ...common,
      tooltip: { trigger: 'axis' },
      legend: { data: ['入库', '标注', '异常'], textStyle: { color: '#8b8b9a' } },
      grid: { left: 40, right: 16, top: 40, bottom: 28 },
      xAxis: { type: 'category', data: p.hourly.map((h) => h.hour), axisLabel: { color: '#8b8b97' } },
      yAxis: { type: 'value', axisLabel: { color: '#8b8b97' } },
      series: [
        { name: '入库', type: 'bar', data: p.hourly.map((h) => h.ingest), itemStyle: { color: '#18a058' } },
        { name: '标注', type: 'line', data: p.hourly.map((h) => h.annotate), itemStyle: { color: '#63e2b7' } },
        { name: '异常', type: 'line', data: p.hourly.map((h) => h.anomaly), itemStyle: { color: '#f0a020' } },
      ],
    })
    charts.push(c)
  }
  if (durRef.value) {
    const c = echarts.init(durRef.value)
    c.setOption({
      ...common,
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 24, bottom: 28 },
      xAxis: {
        type: 'category',
        data: p.durationHist.map((d) => d.bucket),
        axisLabel: { color: '#8b8b97' },
      },
      yAxis: { type: 'value', axisLabel: { color: '#8b8b97' } },
      series: [{ type: 'bar', data: p.durationHist.map((d) => d.count), itemStyle: { color: '#63e2b7' } }],
    })
    charts.push(c)
  }
  if (sceneRef.value) {
    const c = echarts.init(sceneRef.value)
    c.setOption({
      ...common,
      tooltip: { trigger: 'axis' },
      grid: { left: 80, right: 16, top: 16, bottom: 28 },
      xAxis: { type: 'value', axisLabel: { color: '#8b8b97' } },
      yAxis: {
        type: 'category',
        data: (p.sceneDistribution || []).map((s) => s.scene),
        axisLabel: { color: '#8b8b97' },
      },
      series: [
        {
          type: 'bar',
          data: (p.sceneDistribution || []).map((s) => s.count),
          itemStyle: { color: '#70c0e8' },
        },
      ],
    })
    charts.push(c)
  }
  if (issueRef.value) {
    const c = echarts.init(issueRef.value)
    c.setOption({
      ...common,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: '65%',
          data: (p.topIssues || []).map((i) => ({ name: i.type, value: i.count })),
          label: { color: '#a0a0aa' },
        },
      ],
    })
    charts.push(c)
  }
}

function onResize() {
  charts.forEach((c) => c.resize())
}

onMounted(load)
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  disposeCharts()
})
window.addEventListener('resize', onResize)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>多模态数据画像</h2>
        <p>模态 · 场景 · 时段吞吐 · 时长 · 标签覆盖 · 异常构成（厚假数据）</p>
      </div>
      <n-button type="primary" :loading="loading" @click="load">刷新画像</n-button>
    </div>

    <n-alert type="warning" :bordered="false" class="mb">
      {{ profile?.sourceMode === 'demo' ? '当前为演示假数据汇总，非生产数仓实时画像。' : '' }}
      峰值时段 {{ profile?.summary?.peakHour }}:00 · 入库 {{ profile?.summary?.peakIngest }}
    </n-alert>

    <n-spin :show="loading">
      <div class="kpi">
        <n-card size="small" :bordered="false">
          <div class="k">样本总量</div>
          <div class="v">{{ profile?.summary?.totalSamples ?? '—' }}</div>
        </n-card>
        <n-card size="small" :bordered="false">
          <div class="k">模态数</div>
          <div class="v">{{ profile?.summary?.modalities ?? '—' }}</div>
        </n-card>
        <n-card size="small" :bordered="false">
          <div class="k">平均时长</div>
          <div class="v">{{ profile?.summary?.avgDurationSec ?? '—' }}s</div>
        </n-card>
        <n-card size="small" :bordered="false">
          <div class="k">缺失率</div>
          <div class="v">{{ ((profile?.missingRate || 0) * 100).toFixed(1) }}%</div>
        </n-card>
        <n-card size="small" :bordered="false">
          <div class="k">标签密度</div>
          <div class="v">{{ profile?.summary?.labelDensity ?? '—' }}</div>
        </n-card>
        <n-card size="small" :bordered="false">
          <div class="k">待处理异常</div>
          <div class="v warn">{{ profile?.summary?.anomalyOpen ?? '—' }}</div>
        </n-card>
      </div>

      <div class="charts">
        <n-card title="模态分布" :bordered="false"><div ref="modRef" class="chart" /></n-card>
        <n-card title="24h 入库 / 标注 / 异常" :bordered="false"><div ref="hourRef" class="chart" /></n-card>
        <n-card title="时长分布" :bordered="false"><div ref="durRef" class="chart" /></n-card>
      </div>

      <div class="charts2">
        <n-card title="VLA 场景分布" :bordered="false"><div ref="sceneRef" class="chart" /></n-card>
        <n-card title="异常类型构成" :bordered="false"><div ref="issueRef" class="chart" /></n-card>
        <n-card title="全局质量雷达（演示）" :bordered="false">
          <div v-for="d in profile?.qualityRadar || []" :key="d.name" class="radar-row">
            <span>{{ d.name }}</span>
            <n-progress type="line" :percentage="Math.round(d.score * 100)" :show-indicator="true" />
          </div>
        </n-card>
      </div>

      <div class="grid2">
        <n-card title="标签覆盖率" :bordered="false">
          <div v-for="t in profile?.tagCoverage || []" :key="t.tag" class="tag-row">
            <span class="tag">{{ t.tag }}</span>
            <n-progress type="line" :percentage="t.rate" :show-indicator="true" processing />
            <span class="cnt">{{ t.covered }}/{{ t.total }}</span>
          </div>
        </n-card>
        <n-card title="分模态质量概览" :bordered="false">
          <n-data-table
            size="small"
            :bordered="false"
            :pagination="false"
            :data="profile?.qualityByModality || []"
            :columns="[
              { title: '模态', key: 'modality' },
              { title: '均分', key: 'score', width: 70 },
              { title: '样本', key: 'samples', width: 70 },
              {
                title: '失败率',
                key: 'failRate',
                width: 80,
                render: (r) => `${(r.failRate * 100).toFixed(0)}%`,
              },
            ]"
          />
        </n-card>
      </div>

      <n-card title="任务标签覆盖明细" :bordered="false" class="mt">
        <n-data-table
          size="small"
          :bordered="false"
          :data="profile?.labelCoverage || []"
          :columns="[
            { title: '任务', key: 'id', width: 150, ellipsis: { tooltip: true } },
            { title: '名称', key: 'name', ellipsis: { tooltip: true } },
            { title: '模态', key: 'modality', width: 110 },
            { title: '标签数', key: 'labelCount', width: 80 },
            { title: '状态', key: 'status', width: 100 },
          ]"
          :max-height="280"
        />
      </n-card>
      <p class="hint">生成时间 {{ profile?.generatedAt }}</p>
    </n-spin>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
h2 { margin: 0 0 6px; font-size: 20px; }
p { margin: 0; color: #9a9aab; }
.mb { margin-bottom: 12px; }
.mt { margin-top: 12px; }
.kpi { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 12px; }
.k { color: #8b8b9a; font-size: 12px; }
.v { margin-top: 4px; font-size: 22px; color: #63e2b7; font-weight: 600; }
.v.warn { color: #f0a020; }
.charts { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 12px; margin-bottom: 12px; }
.charts2 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.chart { height: 240px; }
.grid2 { display: grid; grid-template-columns: 1fr 1.1fr; gap: 12px; }
.tag-row { display: grid; grid-template-columns: 90px 1fr 70px; gap: 8px; align-items: center; margin-bottom: 8px; }
.radar-row { display: grid; grid-template-columns: 72px 1fr; gap: 8px; align-items: center; margin-bottom: 8px; color: #c8c8d0; font-size: 12px; }
.tag { color: #c8c8d0; font-family: ui-monospace, monospace; font-size: 12px; }
.cnt { color: #8b8b9a; font-size: 12px; text-align: right; }
.hint { margin-top: 10px; color: #6e6e7a; font-size: 12px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 1000px) {
  .kpi, .charts, .charts2, .grid2 { grid-template-columns: 1fr; }
}
</style>
