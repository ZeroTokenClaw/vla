<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { listMeta, refreshGpuMetrics, listExperiments } from '@/services/train'

const loading = ref(false)
const gpus = ref([])
const experiments = ref([])
let timer = null

const summary = computed(() => {
  const total = gpus.value.length
  const busy = gpus.value.filter((g) => !g.free).length
  const avgUtil = total ? Math.round(gpus.value.reduce((s, g) => s + (g.utilPct || 0), 0) / total) : 0
  return { total, busy, free: total - busy, avgUtil }
})

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
    Message.error(e.message)
  }
}

function holders(gpuId) {
  return experiments.value.filter((e) => (e.gpuIds || []).includes(gpuId)).map((e) => e.id)
}

onMounted(async () => {
  await load()
  timer = setInterval(refresh, 2000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div>
    <a-alert type="warning" banner style="margin-bottom: 12px">
      算力监控为演示伪造读数（定时抖动），用于展示 GPU 利用率/显存/温度；非 NVML 真实采集。
    </a-alert>
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="GPU 总数" :value="summary.total" /></a-col>
      <a-col :span="6"><a-statistic title="占用中" :value="summary.busy" /></a-col>
      <a-col :span="6"><a-statistic title="空闲" :value="summary.free" /></a-col>
      <a-col :span="6"><a-statistic title="平均利用率" :value="summary.avgUtil" suffix="%" /></a-col>
    </a-row>
    <a-card title="GPU 算力池" :bordered="false">
      <template #extra>
        <a-button size="small" @click="refresh">立即刷新</a-button>
      </template>
      <a-table :data="gpus" :pagination="false" :loading="loading" row-key="id">
        <a-table-column title="ID" data-index="id" :width="90" />
        <a-table-column title="卡名" data-index="name" :width="150" />
        <a-table-column title="节点" data-index="nodeName" :width="120" />
        <a-table-column title="状态" :width="90">
          <template #cell="{ record }">
            <a-tag :color="record.free ? 'green' : 'red'">{{ record.free ? '空闲' : '占用' }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="利用率">
          <template #cell="{ record }">
            <a-progress :percent="(record.utilPct || 0) / 100" />
          </template>
        </a-table-column>
        <a-table-column title="显存" :width="140">
          <template #cell="{ record }">{{ record.memUsedGb }} / {{ record.memoryGb }} GB</template>
        </a-table-column>
        <a-table-column title="温度℃" data-index="temperature" :width="90" />
        <a-table-column title="关联实验">
          <template #cell="{ record }">
            <a-tag v-for="id in holders(record.id)" :key="id" size="small" style="margin-right: 4px">{{ id }}</a-tag>
            <span v-if="!holders(record.id).length">—</span>
          </template>
        </a-table-column>
      </a-table>
    </a-card>
  </div>
</template>
