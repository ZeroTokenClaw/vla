<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listMeta, refreshGpuMetrics, listExperiments } from '@/services/train'

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
    ? Number(
        (
          gpus.value.reduce((s, g) => s + (g.memUsedGb || 0) / (g.memoryGb || 1), 0) / total
        ).toFixed(2),
      )
    : 0
  return { total, busy, free: total - busy, avgUtil, avgMemPct: Math.round(avgMem * 100) }
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
    ElMessage.error(e.message)
  }
}

onMounted(async () => {
  await load()
  timer = setInterval(refresh, 2000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function holders(gpuId) {
  return experiments.value
    .filter((e) => (e.gpuIds || []).includes(gpuId))
    .map((e) => e.id)
}
</script>

<template>
  <div v-loading="loading">
    <el-alert
      class="tip"
      type="warning"
      :closable="false"
      show-icon
      title="算力监控为演示伪造读数（定时抖动），用于展示 GPU 利用率/显存/温度面板；非 NVML 真实采集。"
    />

    <el-row :gutter="12" class="stats">
      <el-col :span="6"><el-statistic title="GPU 总数" :value="summary.total" /></el-col>
      <el-col :span="6"><el-statistic title="占用中" :value="summary.busy" /></el-col>
      <el-col :span="6"><el-statistic title="平均利用率" :value="summary.avgUtil" suffix="%" /></el-col>
      <el-col :span="6"><el-statistic title="平均显存占用" :value="summary.avgMemPct" suffix="%" /></el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div class="hd">
          <span>GPU 资源池</span>
          <el-button size="small" @click="refresh">立即刷新</el-button>
        </div>
      </template>
      <el-table :data="gpus" stripe>
        <el-table-column prop="id" label="ID" width="90" />
        <el-table-column prop="name" label="卡名" width="150" />
        <el-table-column prop="nodeName" label="节点" width="120" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.free ? 'success' : 'danger'">
              {{ row.free ? '空闲' : '占用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="利用率" min-width="160">
          <template #default="{ row }">
            <el-progress
              :percentage="row.utilPct || 0"
              :status="row.utilPct > 90 ? 'exception' : undefined"
            />
          </template>
        </el-table-column>
        <el-table-column label="显存" width="150">
          <template #default="{ row }">
            {{ row.memUsedGb }} / {{ row.memoryGb }} GB
          </template>
        </el-table-column>
        <el-table-column prop="temperature" label="温度℃" width="90" />
        <el-table-column prop="powerW" label="功率W" width="90" />
        <el-table-column label="关联实验" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="id in holders(row.id)" :key="id" size="small" class="tag" effect="plain">
              {{ id }}
            </el-tag>
            <span v-if="!holders(row.id).length">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 12px;
}
.stats {
  margin-bottom: 12px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tag {
  margin-right: 4px;
}
</style>
