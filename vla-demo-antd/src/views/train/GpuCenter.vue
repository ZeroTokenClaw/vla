<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listMeta, refreshGpuMetrics, listExperiments } from '@/services/train'

const router = useRouter()
const loading = ref(false)
const gpus = ref([])
const experiments = ref([])
let timer = null

const summary = computed(() => {
  const total = gpus.value.length
  const busy = gpus.value.filter((g) => !g.free).length
  const avgUtil = total ? Math.round(gpus.value.reduce((s, g) => s + (g.utilPct || 0), 0) / total) : 0
  const avgMem = total
    ? Math.round((gpus.value.reduce((s, g) => s + (g.memUsedGb || 0) / (g.memoryGb || 1), 0) / total) * 100)
    : 0
  return { total, busy, free: total - busy, avgUtil, avgMem }
})

function holders(gpuId) {
  return experiments.value.filter((e) => (e.gpuIds || []).includes(gpuId)).map((e) => e.id)
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
  gpus.value = await refreshGpuMetrics()
}

onMounted(async () => {
  await load()
  timer = setInterval(refresh, 2000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const cols = [
  { title: 'GPU', dataIndex: 'id', width: 80 },
  { title: '型号', dataIndex: 'name', width: 150 },
  { title: '节点', dataIndex: 'nodeName', width: 130 },
  { title: '状态', key: 'free', width: 80 },
  { title: '利用率', key: 'util', width: 160 },
  { title: '显存', key: 'mem', width: 130 },
  { title: '温度℃', dataIndex: 'temperature', width: 80 },
  { title: '功耗W', dataIndex: 'powerW', width: 80 },
  { title: '关联实验', key: 'exp' },
]
</script>

<template>
  <div>
    <a-alert
      type="warning"
      show-icon
      style="margin-bottom: 12px"
      message="算力监控为演示伪造读数（2s 抖动），展示利用率 / 显存 / 温度；非 NVML 真实采集。"
    />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="5"><a-statistic title="GPU 总数" :value="summary.total" /></a-col>
      <a-col :span="5"><a-statistic title="占用中" :value="summary.busy" /></a-col>
      <a-col :span="5"><a-statistic title="空闲" :value="summary.free" /></a-col>
      <a-col :span="5"><a-statistic title="平均利用率" :value="summary.avgUtil" suffix="%" /></a-col>
      <a-col :span="4"><a-statistic title="平均显存" :value="summary.avgMem" suffix="%" /></a-col>
    </a-row>
    <a-card title="GPU 算力池" size="small">
      <template #extra>
        <a-space>
          <a-button size="small" @click="refresh">立即刷新</a-button>
          <a-button size="small" type="primary" @click="router.push('/train/runner')">训练运行</a-button>
        </a-space>
      </template>
      <a-table :loading="loading" :columns="cols" :data-source="gpus" row-key="id" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'free'">
            <a-tag :color="record.free ? 'success' : 'error'">{{ record.free ? '空闲' : '占用' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'util'">
            <a-progress :percent="record.utilPct || 0" size="small" :status="record.free ? 'normal' : 'active'" />
          </template>
          <template v-else-if="column.key === 'mem'">
            {{ record.memUsedGb ?? '—' }} / {{ record.memoryGb }} GB
          </template>
          <template v-else-if="column.key === 'exp'">
            {{ holders(record.id).join(', ') || '—' }}
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>
