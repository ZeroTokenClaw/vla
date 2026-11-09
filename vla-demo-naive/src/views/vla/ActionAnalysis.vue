<script setup>
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NTag } from 'naive-ui'
import * as echarts from 'echarts'
import { listVlaTasks, getVlaTask } from '@/services/vla'
import { exportJSON } from '@/utils/exportFiles'
import { message } from '@/ui/discrete'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const tasks = ref([])
const task = ref(null)
const selected = ref(null)
const typeChartRef = ref(null)
const durChartRef = ref(null)
const gapChartRef = ref(null)
let typeChart = null
let durChart = null
let gapChart = null

const COLORS = ['#63e2b7', '#18a058', '#70c0e8', '#f0a020', '#e88080', '#a78bfa', '#f472b6']

const actions = computed(() => {
  const list = task.value?.actions || []
  return list.map((a, i) => ({
    ...a,
    name: a.name || a.actionLabel || a.type || a.action || a.id,
    type: a.type || a.action || a.code || 'ACT',
    color: COLORS[i % COLORS.length],
    dur: Math.max(0, (a.endFrame || 0) - (a.startFrame || 0)),
    keyNode: !!(a.keyNode || a.isKey),
  }))
})

const totalFrames = computed(() => Number(task.value?.totalFrames || 120))

const gaps = computed(() => {
  const sorted = [...actions.value].sort((a, b) => (a.startFrame || 0) - (b.startFrame || 0))
  const out = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = (sorted[i + 1].startFrame || 0) - (sorted[i].endFrame || 0)
    out.push({
      from: sorted[i].name,
      to: sorted[i + 1].name,
      gap,
      warn: gap > 15 || gap < 0,
    })
  }
  return out
})

const transitions = computed(() => {
  const sorted = [...actions.value].sort((a, b) => (a.startFrame || 0) - (b.startFrame || 0))
  const map = {}
  for (let i = 0; i < sorted.length - 1; i++) {
    const key = `${sorted[i].type} → ${sorted[i + 1].type}`
    map[key] = (map[key] || 0) + 1
  }
  return Object.entries(map).map(([edge, count]) => ({ edge, count }))
})

const stats = computed(() => {
  const list = actions.value
  const totalDur = list.reduce((s, a) => s + a.dur, 0)
  const keyNodes = list.filter((a) => a.keyNode).length
  const coverage = totalFrames.value ? Math.min(100, Math.round((totalDur / totalFrames.value) * 100)) : 0
  const typeMap = {}
  for (const a of list) typeMap[a.type] = (typeMap[a.type] || 0) + 1
  const overlap = gaps.value.filter((g) => g.gap < 0).length
  const longGap = gaps.value.filter((g) => g.gap > 15).length
  return {
    count: list.length,
    totalFrames: totalDur,
    avgFrames: list.length ? Math.round(totalDur / list.length) : 0,
    keyNodes,
    coverage,
    typeDist: Object.entries(typeMap).map(([name, value]) => ({ name, value })),
    dens: totalFrames.value ? Number(((keyNodes / totalFrames.value) * 100).toFixed(2)) : 0,
    overlap,
    longGap,
  }
})

const actionColumns = [
  { title: '动作', key: 'name', ellipsis: { tooltip: true } },
  { title: '类型', key: 'type', width: 90 },
  {
    title: '帧区间',
    key: 'frames',
    width: 120,
    render: (r) => `F${r.startFrame}–${r.endFrame}`,
  },
  { title: '时长', key: 'dur', width: 70 },
  {
    title: '关键',
    key: 'keyNode',
    width: 70,
    render: (r) =>
      h(NTag, { size: 'tiny', type: r.keyNode ? 'warning' : 'default', bordered: false }, {
        default: () => (r.keyNode ? '是' : '否'),
      }),
  },
]

async function loadList() {
  tasks.value = (await listVlaTasks({ page: 1, pageSize: 100 })).items || []
}

async function loadTask(id) {
  if (!id) {
    task.value = null
    selected.value = null
    return
  }
  loading.value = true
  try {
    task.value = await getVlaTask(id)
    selected.value = null
    await nextTick()
    renderCharts()
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function renderCharts() {
  if (typeChartRef.value) {
    if (!typeChart) typeChart = echarts.init(typeChartRef.value)
    typeChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          label: { color: '#a0a0aa', formatter: '{b}\n{c}' },
          data: stats.value.typeDist.map((d, i) => ({
            ...d,
            itemStyle: { color: COLORS[i % COLORS.length] },
          })),
        },
      ],
    })
  }
  if (durChartRef.value) {
    if (!durChart) durChart = echarts.init(durChartRef.value)
    durChart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 40, right: 12, top: 20, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: actions.value.map((a) => a.name),
        axisLabel: { color: '#8b8b97', rotate: 30, fontSize: 10 },
      },
      yAxis: { type: 'value', name: '帧', axisLabel: { color: '#8b8b97' }, splitLine: { lineStyle: { color: '#2a2a35' } } },
      series: [
        {
          type: 'bar',
          data: actions.value.map((a) => ({ value: a.dur, itemStyle: { color: a.color } })),
          barWidth: 16,
        },
      ],
    })
  }
  if (gapChartRef.value) {
    if (!gapChart) gapChart = echarts.init(gapChartRef.value)
    gapChart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 40, right: 12, top: 20, bottom: 40 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: gaps.value.map((g) => `${g.from}→${g.to}`),
        axisLabel: { color: '#8b8b97', rotate: 25, fontSize: 10 },
      },
      yAxis: { type: 'value', name: '间隔帧', axisLabel: { color: '#8b8b97' } },
      series: [
        {
          type: 'bar',
          data: gaps.value.map((g) => ({
            value: g.gap,
            itemStyle: { color: g.warn ? '#e88080' : '#63e2b7' },
          })),
        },
      ],
    })
  }
}

function onSelect(id) {
  router.push(`/vla/action-analysis/${id}`)
}

function selectAction(a) {
  selected.value = a
}

function exportReport() {
  if (!task.value) return
  exportJSON(`EIDE-action-analysis-${task.value.id}.json`, {
    taskId: task.value.id,
    name: task.value.name,
    instruction: task.value.instruction,
    stats: stats.value,
    actions: actions.value,
    gaps: gaps.value,
    transitions: transitions.value,
    exportedAt: new Date().toISOString(),
    sourceMode: 'demo',
  })
  message.success('已导出动作分析报告 JSON')
}

onMounted(async () => {
  await loadList()
  const id = route.params.id || tasks.value[0]?.id
  if (id && !route.params.id) router.replace(`/vla/action-analysis/${id}`)
  else if (id) await loadTask(id)
})

onUnmounted(() => {
  typeChart?.dispose()
  durChart?.dispose()
  gapChart?.dispose()
})

watch(
  () => route.params.id,
  (id) => loadTask(id),
)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>VLA 动作序列分析</h2>
        <p>甘特 · 类型分布 · 段长 · 间隔异常 · 转移边 · 段详情（可导出）</p>
      </div>
      <n-space>
        <n-select
          :value="route.params.id"
          style="width: 280px"
          :options="tasks.map((t) => ({ label: `${t.id} · ${t.name}`, value: t.id }))"
          @update:value="onSelect"
        />
        <n-button :disabled="!task" @click="exportReport">导出 JSON</n-button>
      </n-space>
    </div>

    <n-alert type="info" :bordered="false" class="mb">
      演示假数据：甘特与间隔基于当前 Episode 动作标注内存态计算。红柱表示重叠或超长间隔（&gt;15 帧）。
    </n-alert>

    <n-spin :show="loading">
      <div class="kpis">
        <n-card size="small" :bordered="false"><div class="k">动作段</div><div class="v">{{ stats.count }}</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">覆盖帧</div><div class="v">{{ stats.totalFrames }}</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">平均段长</div><div class="v">{{ stats.avgFrames }}</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">关键节点</div><div class="v">{{ stats.keyNodes }}</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">时间覆盖</div><div class="v">{{ stats.coverage }}%</div></n-card>
        <n-card size="small" :bordered="false"><div class="k">重叠/长间隔</div><div class="v warn">{{ stats.overlap }}/{{ stats.longGap }}</div></n-card>
      </div>

      <n-card title="动作甘特（单击查看段详情）" :bordered="false" class="mb">
        <div class="ruler">
          <span>0</span>
          <span>{{ Math.round(totalFrames / 2) }}</span>
          <span>{{ totalFrames }}</span>
        </div>
        <div
          v-for="a in actions"
          :key="a.id"
          class="bar-row"
          :class="{ active: selected?.id === a.id }"
          @click="selectAction(a)"
        >
          <span class="name">
            {{ a.name }}
            <n-tag v-if="a.keyNode" size="tiny" type="warning" :bordered="false">关键</n-tag>
          </span>
          <div class="bar-track">
            <div
              class="bar"
              :style="{
                left: ((a.startFrame || 0) / Math.max(totalFrames, 1)) * 100 + '%',
                width: Math.max(1.5, (a.dur / Math.max(totalFrames, 1)) * 100) + '%',
                background: a.color,
              }"
              :title="`${a.name} F${a.startFrame}-${a.endFrame}`"
            />
          </div>
          <code>F{{ a.startFrame }}–{{ a.endFrame }} · {{ a.dur }}f</code>
        </div>
        <n-empty v-if="!actions.length" description="无动作序列，请先在时间轴标注" />
      </n-card>

      <div class="grid3">
        <n-card title="动作类型分布" :bordered="false"><div ref="typeChartRef" class="chart" /></n-card>
        <n-card title="各段时长（帧）" :bordered="false"><div ref="durChartRef" class="chart" /></n-card>
        <n-card title="段间间隔" :bordered="false"><div ref="gapChartRef" class="chart" /></n-card>
      </div>

      <div class="grid2 mt">
        <n-card title="动作明细表" :bordered="false">
          <n-data-table
            size="small"
            :data="actions"
            :columns="actionColumns"
            :row-props="(row) => ({ style: 'cursor:pointer', onClick: () => selectAction(row) })"
            :max-height="260"
          />
        </n-card>
        <n-card title="类型转移边" :bordered="false">
          <n-data-table
            size="small"
            :pagination="false"
            :data="transitions"
            :columns="[
              { title: '转移', key: 'edge' },
              { title: '次数', key: 'count', width: 70 },
            ]"
          />
          <n-empty v-if="!transitions.length" description="不足两段，无转移" />
        </n-card>
      </div>

      <n-card v-if="selected" title="选中段详情" :bordered="false" class="mt">
        <n-descriptions label-placement="left" :column="2" size="small" bordered>
          <n-descriptions-item label="名称">{{ selected.name }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ selected.type }}</n-descriptions-item>
          <n-descriptions-item label="帧区间">F{{ selected.startFrame }}–{{ selected.endFrame }}</n-descriptions-item>
          <n-descriptions-item label="时长">{{ selected.dur }} 帧</n-descriptions-item>
          <n-descriptions-item label="关键节点">{{ selected.keyNode ? '是' : '否' }}</n-descriptions-item>
          <n-descriptions-item label="指令/备注">{{ selected.instruction || selected.desc || '—' }}</n-descriptions-item>
        </n-descriptions>
      </n-card>

      <n-card v-if="task" title="任务上下文" :bordered="false" class="mt">
        <p><b>指令：</b>{{ task.instruction || '—' }}</p>
        <p class="muted">场景 {{ task.scene }} · 方案 {{ task.plan }} · 模式 {{ task.mode }} · fps {{ task.fps }}</p>
        <n-space class="mt">
          <n-button size="small" @click="router.push(`/vla/timeline/${task.id}`)">打开时间轴标注</n-button>
          <n-button size="small" @click="router.push(`/vla/consistency/${task.id}`)">指令一致性</n-button>
          <n-button size="small" @click="router.push(`/vla/quality/${task.id}`)">质检门禁</n-button>
        </n-space>
      </n-card>
    </n-spin>
  </div>
</template>

<style scoped>
.page { max-width: 1180px; }
.head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
h2 { margin: 0 0 6px; font-size: 20px; }
p { margin: 0; color: #9a9aab; }
.mb { margin-bottom: 12px; }
.mt { margin-top: 12px; }
.muted { color: #6e6e7a; font-size: 12px; margin-top: 6px; }
.kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 12px; }
.k { color: #8b8b9a; font-size: 12px; }
.v { margin-top: 4px; font-size: 22px; color: #63e2b7; font-weight: 600; }
.v.warn { color: #f0a020; }
.ruler { display: flex; justify-content: space-between; color: #6e6e7a; font-size: 11px; margin: 0 0 8px 130px; padding-right: 110px; }
.bar-row {
  display: grid; grid-template-columns: 130px 1fr 120px; gap: 10px; align-items: center;
  margin-bottom: 8px; padding: 4px 6px; border-radius: 6px; cursor: pointer;
}
.bar-row:hover, .bar-row.active { background: #1a1a24; }
.name { font-size: 12px; color: #d0d0da; display: flex; gap: 6px; align-items: center; }
.bar-track { position: relative; height: 16px; background: #1f1f28; border-radius: 4px; overflow: hidden; }
.bar { position: absolute; top: 0; bottom: 0; border-radius: 4px; opacity: 0.92; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.grid2 { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; }
.chart { height: 240px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 1000px) {
  .kpis, .grid3, .grid2 { grid-template-columns: 1fr; }
}
</style>
