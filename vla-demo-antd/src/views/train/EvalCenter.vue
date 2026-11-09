<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { notification } from 'ant-design-vue'
import { listExperiments, getExperiment } from '@/services/train'
import { listEvalModels } from '@/services/evalBiz'

const router = useRouter()
const exps = ref([])
const expId = ref('')
const exp = ref(null)
const evalModels = ref([])
const running = ref(false)
const curveRef = ref(null)
let curveChart = null

const evalRuns = ref([
  { id: 'ER-2401', set: 'val_set_a', map50: 0.62, precision: 0.71, recall: 0.68, latencyMs: 42, status: 'done', at: '2026-11-08 16:20' },
  { id: 'ER-2402', set: 'val_set_b', map50: 0.58, precision: 0.66, recall: 0.64, latencyMs: 47, status: 'done', at: '2026-11-08 17:05' },
  { id: 'ER-2403', set: 'holdout_c', map50: 0.55, precision: 0.63, recall: 0.61, latencyMs: 51, status: 'done', at: '2026-11-09 09:12' },
])

onMounted(async () => {
  const res = await listExperiments({ page: 1, pageSize: 30 })
  exps.value = res.items
  expId.value = exps.value[0]?.id
  evalModels.value = (await listEvalModels()).items
  await load()
})

onBeforeUnmount(() => curveChart?.dispose())

async function load() {
  if (!expId.value) return
  exp.value = await getExperiment(expId.value)
  await nextTick()
  renderCurve()
}

function renderCurve() {
  if (!curveRef.value || !exp.value?.metrics) return
  if (!curveChart) curveChart = echarts.init(curveRef.value)
  const m = exp.value.metrics
  const loss = m.loss || []
  const map = m.map || m.mAP || []
  const xs = loss.map((_, i) => i + 1)
  curveChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['loss', 'mAP'] },
    grid: { left: 48, right: 48, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: xs },
    yAxis: [
      { type: 'value', name: 'loss' },
      { type: 'value', name: 'mAP', max: 1 },
    ],
    series: [
      { name: 'loss', type: 'line', data: loss, smooth: true, itemStyle: { color: '#1677ff' } },
      { name: 'mAP', type: 'line', yAxisIndex: 1, data: map, smooth: true, itemStyle: { color: '#52c41a' } },
    ],
  })
}

const metrics = computed(() => {
  const m = exp.value?.metrics
  if (!m) return null
  const last = (arr) => (arr?.length ? arr[arr.length - 1] : null)
  return {
    loss: last(m.loss),
    acc: last(m.acc || m.accuracy),
    map: last(m.map || m.mAP),
    bestMap: Math.max(...(m.map || m.mAP || [0])),
  }
})

const linkedModels = computed(() => {
  if (!exp.value) return []
  return evalModels.value.filter((m) => m.algo === exp.value.algorithm || m.name?.toLowerCase().includes((exp.value.model || '').split('_')[0]))
})

const catalog = computed(() => {
  if (!exp.value) return []
  return (
    exp.value.catalog || [
      { name: 'val_set_a', precision: 0.71, recall: 0.68, map50: 0.62, f1: 0.69, samples: 420 },
      { name: 'val_set_b', precision: 0.66, recall: 0.64, map50: 0.58, f1: 0.65, samples: 380 },
      { name: 'holdout_c', precision: 0.63, recall: 0.61, map50: 0.55, f1: 0.62, samples: 210 },
    ]
  )
})

async function runEval() {
  running.value = true
  try {
    await new Promise((r) => setTimeout(r, 800))
    const base = metrics.value?.map || 0.55
    const row = {
      id: `ER-${2400 + evalRuns.value.length + 1}`,
      set: catalog.value[evalRuns.value.length % catalog.value.length]?.name || 'val_set_a',
      map50: Number((base + (Math.random() - 0.4) * 0.05).toFixed(3)),
      precision: Number((0.62 + Math.random() * 0.12).toFixed(3)),
      recall: Number((0.6 + Math.random() * 0.12).toFixed(3)),
      latencyMs: 40 + Math.round(Math.random() * 20),
      status: 'done',
      at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    }
    evalRuns.value.unshift(row)
    notification.success({ message: `评测跑次 ${row.id} 完成（演示假数据）`, placement: 'topRight' })
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="实验评测台：训练曲线 · 验证集 catalog · 评测跑次 · 关联登记模型。可跳转多模型对比与血缘追溯。"
    />
    <a-space style="margin-bottom: 12px" wrap>
      <a-select
        v-model:value="expId"
        style="width: 360px"
        :options="exps.map((e) => ({ value: e.id, label: `${e.id} · ${e.name}` }))"
        @change="load"
      />
      <a-button type="primary" :loading="running" @click="runEval">跑一次评测</a-button>
      <a-button type="primary" ghost @click="router.push('/train/compare')">多模型对比</a-button>
      <a-button @click="router.push('/train/lineage')">数据血缘</a-button>
      <a-button @click="router.push('/system/models')">模型注册</a-button>
    </a-space>

    <a-row :gutter="12" v-if="metrics">
      <a-col :span="6"><a-statistic title="Latest Loss" :value="metrics.loss" :precision="4" /></a-col>
      <a-col :span="6"><a-statistic title="Latest Acc" :value="metrics.acc" :precision="4" /></a-col>
      <a-col :span="6"><a-statistic title="Latest mAP" :value="metrics.map" :precision="4" /></a-col>
      <a-col :span="6"><a-statistic title="Best mAP" :value="metrics.bestMap" :precision="4" /></a-col>
    </a-row>

    <a-card title="训练指标曲线（伪造）" size="small" style="margin-top: 12px">
      <div ref="curveRef" class="curve" />
    </a-card>

    <a-row :gutter="12" style="margin-top: 12px">
      <a-col :span="14">
        <a-card title="评测目录" size="small" v-if="exp">
          <a-descriptions size="small" :column="2" bordered style="margin-bottom: 12px">
            <a-descriptions-item label="实验">{{ exp.name }}</a-descriptions-item>
            <a-descriptions-item label="算法">{{ exp.algorithm }} / {{ exp.version }}</a-descriptions-item>
            <a-descriptions-item label="模型">{{ exp.model }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ exp.status }}</a-descriptions-item>
          </a-descriptions>
          <a-table
            size="small"
            :pagination="false"
            row-key="name"
            :data-source="catalog"
            :columns="[
              { title: '验证集', dataIndex: 'name' },
              { title: '样本', dataIndex: 'samples', width: 70 },
              { title: 'Precision', dataIndex: 'precision', width: 90 },
              { title: 'Recall', dataIndex: 'recall', width: 80 },
              { title: 'F1', dataIndex: 'f1', width: 70 },
              { title: 'mAP50', dataIndex: 'map50', width: 80 },
            ]"
          />
          <a-alert style="margin-top: 12px" type="warning" show-icon message="指标来自演示 mockMetricPoint / 种子 catalog，非真实训练产物。" />
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card title="关联登记模型" size="small">
          <a-table
            size="small"
            row-key="id"
            :pagination="false"
            :data-source="linkedModels"
            :columns="[
              { title: '模型', dataIndex: 'name' },
              { title: '版本', dataIndex: 'version', ellipsis: true },
              { title: '主指标', key: 'm' },
            ]"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'm'">
                {{ record.metrics?.success ?? record.metrics?.map50 ?? record.metrics?.f1 ?? '—' }}
              </template>
            </template>
          </a-table>
          <a-empty v-if="!linkedModels.length" description="无匹配登记模型" />
        </a-card>
      </a-col>
    </a-row>

    <a-card title="评测跑次历史" size="small" style="margin-top: 12px">
      <a-table
        size="small"
        row-key="id"
        :pagination="false"
        :data-source="evalRuns"
        :columns="[
          { title: '跑次', dataIndex: 'id', width: 100 },
          { title: '验证集', dataIndex: 'set' },
          { title: 'mAP50', dataIndex: 'map50', width: 90 },
          { title: 'P', dataIndex: 'precision', width: 80 },
          { title: 'R', dataIndex: 'recall', width: 80 },
          { title: '时延ms', dataIndex: 'latencyMs', width: 90 },
          { title: '状态', dataIndex: 'status', width: 80 },
          { title: '时间', dataIndex: 'at', width: 150 },
        ]"
      />
    </a-card>
  </div>
</template>

<style scoped>
.curve { height: 260px; }
</style>
