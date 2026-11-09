<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import { listQualityScores, getQualityScore } from '@/services/analytics'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const filters = reactive({ grade: undefined, targetType: undefined, keyword: '' })
const detail = ref(null)
const drawer = ref(false)
const radarRef = ref(null)
const trendRef = ref(null)
const gradeRef = ref(null)
const charts = shallowRef([])

const avg = computed(() => {
  if (!rows.value.length) return 0
  return Number((rows.value.reduce((s, r) => s + r.totalScore, 0) / rows.value.length).toFixed(1))
})

const gradeDist = computed(() => {
  const map = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  for (const r of rows.value) map[r.grade] = (map[r.grade] || 0) + 1
  return map
})

const openIssues = computed(() => rows.value.reduce((s, r) => s + (r.issues || 0), 0))

async function load() {
  loading.value = true
  try {
    const res = await listQualityScores({ ...filters, page: page.value, pageSize: 10 })
    rows.value = res.items
    total.value = res.total
    await nextTick()
    renderGradeChart()
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  detail.value = await getQualityScore(row.id)
  drawer.value = true
  await nextTick()
  renderDetailCharts()
}

function renderGradeChart() {
  if (!gradeRef.value) return
  let chart = charts.value.find((c) => c.__kind === 'grade')
  if (chart) chart.dispose()
  chart = echarts.init(gradeRef.value)
  chart.__kind = 'grade'
  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: Object.keys(gradeDist.value) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        type: 'bar',
        data: Object.values(gradeDist.value),
        itemStyle: {
          color: (p) => ['#52c41a', '#1677ff', '#faad14', '#fa8c16', '#ff4d4f'][p.dataIndex],
        },
      },
    ],
  })
  charts.value = [...charts.value.filter((c) => c.__kind !== 'grade'), chart]
}

function renderDetailCharts() {
  charts.value.filter((c) => c.__kind !== 'grade').forEach((c) => c.dispose())
  charts.value = charts.value.filter((c) => c.__kind === 'grade')
  if (!detail.value || !radarRef.value) return
  const d = detail.value.dimensions
  const radar = echarts.init(radarRef.value)
  radar.__kind = 'radar'
  radar.setOption({
    radar: { indicator: Object.keys(d).map((k) => ({ name: k, max: 1 })) },
    series: [{ type: 'radar', data: [{ value: Object.values(d), name: '维度', areaStyle: { opacity: 0.15 } }] }],
  })
  const trend = echarts.init(trendRef.value)
  trend.__kind = 'trend'
  const series = detail.value.trend || Array.from({ length: 7 }).map((_, i) => Number((detail.value.totalScore - 8 + i * 1.2).toFixed(1)))
  trend.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'today'] },
    yAxis: { type: 'value', min: 50, max: 100 },
    series: [{ type: 'line', smooth: true, data: series, areaStyle: { opacity: 0.08 } }],
  })
  charts.value = [...charts.value, radar, trend]
}

onMounted(load)
onBeforeUnmount(() => charts.value.forEach((c) => c.dispose()))

const cols = [
  { title: '评分单', dataIndex: 'id', width: 100 },
  { title: '类型', dataIndex: 'targetType', width: 130 },
  { title: '对象', dataIndex: 'targetId', width: 160 },
  { title: '名称', dataIndex: 'name', ellipsis: true },
  { title: '总分', dataIndex: 'totalScore', width: 80 },
  { title: '等级', key: 'grade', width: 80 },
  { title: '规则包', dataIndex: 'rulePack', width: 110 },
  { title: '问题数', dataIndex: 'issues', width: 80 },
  { title: '操作', key: 'op', width: 90 },
]
</script>

<template>
  <div>
    <a-alert type="info" show-icon style="margin-bottom: 12px" message="质量评分卡：多维伪造分数、等级分布、问题明细与 7 日趋势，用于演示质控运营看板。" />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="本页均分" :value="avg" /></a-col>
      <a-col :span="6"><a-statistic title="记录数" :value="total" /></a-col>
      <a-col :span="6"><a-statistic title="本页问题合计" :value="openIssues" /></a-col>
      <a-col :span="6"><a-statistic title="A 级占比" :value="rows.length ? Math.round((gradeDist.A / rows.length) * 100) : 0" suffix="%" /></a-col>
    </a-row>

    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="16">
        <a-space wrap>
          <a-input v-model:value="filters.keyword" placeholder="搜索" style="width: 180px" allow-clear />
          <a-select v-model:value="filters.grade" allow-clear placeholder="等级" style="width: 100px" :options="['A','B','C','D','E'].map((g)=>({value:g,label:g}))" />
          <a-select v-model:value="filters.targetType" allow-clear placeholder="类型" style="width: 160px" :options="[{value:'annotation_task',label:'标注任务'},{value:'vla_task',label:'VLA任务'}]" />
          <a-button type="primary" @click="() => { page = 1; load() }">查询</a-button>
        </a-space>
      </a-col>
      <a-col :span="8">
        <a-card size="small" title="本页等级分布"><div ref="gradeRef" style="height: 120px" /></a-card>
      </a-col>
    </a-row>

    <a-table
      :loading="loading"
      :columns="cols"
      :data-source="rows"
      row-key="id"
      size="small"
      :pagination="{ current: page, pageSize: 10, total, onChange: (p) => { page = p; load() } }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'grade'">
          <a-tag :color="record.grade === 'A' ? 'success' : record.grade === 'B' ? 'processing' : record.grade === 'C' ? 'warning' : 'error'">{{ record.grade }}</a-tag>
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
        </template>
      </template>
    </a-table>

    <a-drawer v-model:open="drawer" width="560" :title="detail?.name || '评分详情'">
      <template v-if="detail">
        <a-descriptions bordered size="small" :column="1">
          <a-descriptions-item label="对象">{{ detail.targetId }}</a-descriptions-item>
          <a-descriptions-item label="总分 / 等级">{{ detail.totalScore }} / {{ detail.grade }}</a-descriptions-item>
          <a-descriptions-item label="规则包">{{ detail.rulePack || '—' }}</a-descriptions-item>
          <a-descriptions-item label="复核人">{{ detail.reviewer || '—' }}</a-descriptions-item>
          <a-descriptions-item label="问题数">{{ detail.issues }}</a-descriptions-item>
          <a-descriptions-item label="更新">{{ detail.updatedAt }}</a-descriptions-item>
        </a-descriptions>
        <div ref="radarRef" style="height: 240px; margin-top: 12px" />
        <div ref="trendRef" style="height: 200px; margin-top: 8px" />
        <h4 style="margin: 12px 0 8px">问题明细</h4>
        <a-table
          size="small"
          row-key="id"
          :pagination="false"
          :data-source="detail.issueDetails || []"
          :columns="[
            { title: '码', dataIndex: 'code', width: 140 },
            { title: '说明', dataIndex: 'message' },
            { title: '等级', dataIndex: 'severity', width: 80 },
            { title: '帧', dataIndex: 'frame', width: 70 },
          ]"
        />
        <a-empty v-if="!(detail.issueDetails || []).length" description="无问题明细" />
      </template>
    </a-drawer>
  </div>
</template>
