<script setup>
import { computed, h, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { NButton, NTag } from 'naive-ui'
import * as echarts from 'echarts'
import { listQualityScores } from '@/services/analytics'
import { message } from '@/ui/discrete'

const loading = ref(false)
const data = ref(null)
const grade = ref(null)
const targetType = ref(null)
const keyword = ref('')
const drawer = ref(false)
const current = ref(null)
const trendRef = ref(null)
const radarRef = ref(null)
const modRef = ref(null)
let trendChart = null
let radarChart = null
let modChart = null

const gradeOpts = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
  { label: 'E', value: 'E' },
]
const typeOpts = [
  { label: '标注任务', value: 'annotation_task' },
  { label: 'VLA 任务', value: 'vla_task' },
]

const columns = [
  { title: '类型', key: 'targetType', width: 130 },
  { title: '对象 ID', key: 'targetId', width: 170, ellipsis: { tooltip: true } },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  {
    title: '总分',
    key: 'totalScore',
    width: 80,
    sorter: (a, b) => a.totalScore - b.totalScore,
  },
  {
    title: '等级',
    key: 'grade',
    width: 70,
    render(row) {
      const type = row.grade === 'A' ? 'success' : row.grade === 'B' ? 'info' : row.grade === 'C' ? 'warning' : 'error'
      return h(NTag, { size: 'small', type, bordered: false }, { default: () => row.grade })
    },
  },
  { title: '更新时间', key: 'updatedAt', width: 170 },
  {
    title: '操作',
    key: 'act',
    width: 90,
    render(row) {
      return h(
        NButton,
        { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openDetail(row) },
        { default: () => '详情' },
      )
    },
  },
]

const avgScore = computed(() => {
  const items = data.value?.items || []
  if (!items.length) return 0
  return Number((items.reduce((s, i) => s + i.totalScore, 0) / items.length).toFixed(1))
})

const gradeDist = computed(() => {
  const map = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  for (const i of data.value?.items || []) map[i.grade] = (map[i.grade] || 0) + 1
  return Object.entries(map).map(([g, n]) => ({ grade: g, count: n }))
})

async function load() {
  loading.value = true
  try {
    data.value = await listQualityScores({
      grade: grade.value || undefined,
      targetType: targetType.value || undefined,
      keyword: keyword.value || undefined,
    })
    await nextTick()
    renderTrend()
    renderMod()
    message.success(`评分卡 ${data.value.items.length} 张已加载`)
  } catch (e) {
    message.error(e.message || '评分加载失败')
  } finally {
    loading.value = false
  }
}

function renderTrend() {
  if (!trendRef.value || !data.value?.trend) return
  if (!trendChart) trendChart = echarts.init(trendRef.value)
  trendChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.value.trend.map((t) => t.day),
      axisLabel: { color: '#8b8b97' },
    },
    yAxis: { type: 'value', min: 70, axisLabel: { color: '#8b8b97' } },
    series: [
      {
        type: 'line',
        smooth: true,
        data: data.value.trend.map((t) => t.score),
        areaStyle: { color: 'rgba(99,226,183,0.15)' },
        itemStyle: { color: '#63e2b7' },
      },
    ],
  })
}

function renderMod() {
  if (!modRef.value || !data.value?.byModality) return
  if (!modChart) modChart = echarts.init(modRef.value)
  modChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 90, right: 16, top: 16, bottom: 28 },
    xAxis: { type: 'value', max: 100, axisLabel: { color: '#8b8b97' } },
    yAxis: {
      type: 'category',
      data: data.value.byModality.map((m) => m.modality),
      axisLabel: { color: '#8b8b97', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: data.value.byModality.map((m) => m.score),
        itemStyle: { color: '#70c0e8' },
      },
    ],
  })
}

function openDetail(row) {
  current.value = row
  drawer.value = true
  nextTick(() => renderRadar())
}

function renderRadar() {
  if (!radarRef.value || !current.value) return
  if (!radarChart) radarChart = echarts.init(radarRef.value)
  const dims = data.value?.dimLabels || []
  radarChart.setOption({
    backgroundColor: 'transparent',
    radar: {
      indicator: dims.map((d) => ({ name: d.label, max: 100 })),
      axisName: { color: '#a0a0aa' },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: dims.map((d) => current.value.dims[d.key]),
            name: current.value.name,
            areaStyle: { color: 'rgba(24,160,88,0.25)' },
            lineStyle: { color: '#63e2b7' },
          },
        ],
      },
    ],
  })
}

onMounted(load)
onUnmounted(() => {
  trendChart?.dispose()
  radarChart?.dispose()
  modChart?.dispose()
})
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>数据质量评分</h2>
        <p>规则 {{ data?.ruleVersion || 'EIDE-QR-1.0' }} · 当前均分 {{ avgScore }} · 可点开维度雷达 / 发现项</p>
      </div>
      <n-space>
        <n-input v-model:value="keyword" clearable placeholder="搜索 ID/名称" style="width: 160px" @keyup.enter="load" />
        <n-select v-model:value="grade" clearable placeholder="等级" style="width: 100px" :options="gradeOpts" />
        <n-select v-model:value="targetType" clearable placeholder="对象类型" style="width: 140px" :options="typeOpts" />
        <n-button type="primary" :loading="loading" @click="load">重算 / 筛选</n-button>
      </n-space>
    </div>

    <div class="top">
      <n-card title="质量均分趋势" :bordered="false"><div ref="trendRef" class="trend" /></n-card>
      <n-card title="分模态均分" :bordered="false"><div ref="modRef" class="trend" /></n-card>
      <n-card title="等级分布" :bordered="false">
        <div v-for="g in gradeDist" :key="g.grade" class="g-row">
          <n-tag size="small" :bordered="false">{{ g.grade }}</n-tag>
          <n-progress type="line" :percentage="data?.items?.length ? Math.round((g.count / data.items.length) * 100) : 0" />
          <span>{{ g.count }}</span>
        </div>
      </n-card>
    </div>

    <n-card :bordered="false">
      <n-data-table :columns="columns" :data="data?.items || []" :loading="loading" size="small" :pagination="{ pageSize: 10 }" />
    </n-card>

    <n-drawer v-model:show="drawer" :width="460" placement="right">
      <n-drawer-content :title="current?.name || '评分详情'" closable>
        <n-descriptions v-if="current" label-placement="left" :column="1" size="small" bordered>
          <n-descriptions-item label="对象">{{ current.targetId }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ current.targetType }}</n-descriptions-item>
          <n-descriptions-item label="总分">{{ current.totalScore }}</n-descriptions-item>
          <n-descriptions-item label="等级">{{ current.grade }}</n-descriptions-item>
          <n-descriptions-item label="更新">{{ current.updatedAt }}</n-descriptions-item>
        </n-descriptions>
        <div ref="radarRef" class="radar" />
        <n-space vertical v-if="current">
          <div v-for="d in data?.dimLabels || []" :key="d.key" class="dim">
            <span>{{ d.label }}</span>
            <n-progress type="line" :percentage="current.dims[d.key]" />
          </div>
        </n-space>

        <h4>发现项</h4>
        <n-space vertical>
          <n-alert
            v-for="(f, i) in current?.findings || []"
            :key="i"
            :type="f.level === 'error' ? 'error' : f.level === 'warn' ? 'warning' : 'success'"
            :bordered="false"
          >
            {{ f.text }}
          </n-alert>
        </n-space>

        <h4>近 3 日得分</h4>
        <n-data-table
          size="small"
          :pagination="false"
          :data="current?.history || []"
          :columns="[
            { title: '日期', key: 'at' },
            { title: '分', key: 'score', width: 70 },
          ]"
        />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
h2 { margin: 0 0 6px; font-size: 20px; }
h4 { margin: 14px 0 8px; font-size: 13px; color: #c8c8d0; }
p { margin: 0; color: #9a9aab; }
.top { display: grid; grid-template-columns: 1.2fr 1.2fr 0.9fr; gap: 12px; margin-bottom: 12px; }
.trend { height: 220px; }
.radar { height: 260px; margin: 12px 0; }
.dim { margin-bottom: 8px; color: #c8c8d0; font-size: 13px; }
.g-row { display: grid; grid-template-columns: 36px 1fr 28px; gap: 8px; align-items: center; margin-bottom: 10px; color: #8b8b9a; font-size: 12px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 1000px) { .top { grid-template-columns: 1fr; } }
</style>
