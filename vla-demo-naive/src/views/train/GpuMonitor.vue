<script setup>
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { NProgress, NTag } from 'naive-ui'
import { listMeta, refreshGpuMetrics, listExperiments } from '@/services/train'
import { message } from '@/ui/discrete'

const loading = ref(false)
const gpus = ref([])
const experiments = ref([])
let timer = null

const summary = computed(() => {
  const total = gpus.value.length
  const busy = gpus.value.filter((g) => !g.free).length
  const avgUtil = total
    ? Math.round(gpus.value.reduce((s, g) => s + (g.utilPct || 0), 0) / total)
    : 0
  const avgMem = total
    ? Math.round(
        (gpus.value.reduce((s, g) => s + (g.memUsedGb || 0) / (g.memoryGb || 1), 0) / total) * 100,
      )
    : 0
  return { total, busy, free: total - busy, avgUtil, avgMem }
})

function holders(gpuId) {
  return experiments.value
    .filter((e) => (e.gpuIds || []).includes(gpuId))
    .map((e) => e.id)
}

async function load() {
  loading.value = true
  try {
    gpus.value = listMeta().gpus
    const res = await listExperiments({ page: 1, pageSize: 50 })
    experiments.value = (res.items || []).filter((e) => e.status === 'running' || e.status === 'paused')
  } finally {
    loading.value = false
  }
}

async function refresh() {
  try {
    gpus.value = await refreshGpuMetrics()
  } catch (e) {
    message.error(e.message)
  }
}

onMounted(async () => {
  await load()
  timer = setInterval(refresh, 2000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const columns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '卡名', key: 'name', width: 150 },
  { title: '节点', key: 'nodeName', width: 120 },
  {
    title: '状态',
    key: 'free',
    width: 80,
    render: (r) =>
      h(NTag, { size: 'small', type: r.free ? 'success' : 'error', bordered: false }, { default: () => (r.free ? '空闲' : '占用') }),
  },
  {
    title: '利用率',
    key: 'utilPct',
    render: (r) => h(NProgress, { type: 'line', percentage: r.utilPct || 0, showIndicator: true, processing: !r.free }),
  },
  {
    title: '显存',
    key: 'mem',
    width: 130,
    render: (r) => `${r.memUsedGb ?? '—'} / ${r.memoryGb} GB`,
  },
  { title: '温度℃', key: 'temperature', width: 80 },
  { title: '功耗W', key: 'powerW', width: 80 },
  {
    title: '关联实验',
    key: 'exp',
    render: (r) => {
      const ids = holders(r.id)
      return ids.length ? ids.join(', ') : '—'
    },
  },
]
</script>

<template>
  <div class="page">
    <n-alert type="warning" :bordered="false" class="mb">
      算力监控为演示伪造读数（2s 抖动），用于展示 GPU 利用率 / 显存 / 温度；非 NVML 真实采集。
    </n-alert>

    <div class="kpis mb">
      <n-card size="small" :bordered="false"><div class="k">GPU 总数</div><div class="v">{{ summary.total }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">占用中</div><div class="v">{{ summary.busy }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">空闲</div><div class="v">{{ summary.free }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">平均利用率</div><div class="v">{{ summary.avgUtil }}%</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">平均显存</div><div class="v">{{ summary.avgMem }}%</div></n-card>
    </div>

    <n-card title="GPU 算力池" :bordered="false">
      <template #header-extra>
        <n-button size="small" @click="refresh">立即刷新</n-button>
      </template>
      <n-data-table size="small" :loading="loading" :data="gpus" :columns="columns" :bordered="false" />
    </n-card>
  </div>
</template>

<style scoped>
.page { max-width: 1180px; }
.mb { margin-bottom: 12px; }
.kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.k { color: #8b8b9a; font-size: 12px; }
.v { margin-top: 4px; font-size: 22px; color: #63e2b7; font-weight: 600; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 1000px) { .kpis { grid-template-columns: repeat(3, 1fr); } }
</style>
