<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { useAuthStore } from '@/stores/auth'
import { copy } from '@/i18n/copy'
import {
  listExperiments,
  getExperiment,
  getMetrics,
  exportReport,
} from '@/services/train'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const experiments = ref([])
const exp = ref(null)
const metrics = ref({ loss: [], acc: [], map: [] })
const loading = ref(false)
const exporting = ref(false)
const chartRef = ref(null)
let chart = null

const currentId = computed(() => route.params.id)
const isAnnotator = computed(() => auth.role === 'annotator')
const canExport = computed(() => true) // all roles may export report after finish / anytime for demo

async function loadList() {
  experiments.value = await listExperiments()
}

async function loadAll(id) {
  if (!id) {
    exp.value = null
    metrics.value = { loss: [], acc: [], map: [] }
    renderChart()
    return
  }
  loading.value = true
  try {
    exp.value = await getExperiment(id)
    metrics.value = await getMetrics(id)
    await nextTick()
    renderChart()
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const epochs = metrics.value.loss.map((_, i) => i + 1)
  chart.setOption({
    title: {
      text: exp.value ? `${exp.value.id} 训练指标` : '训练指标',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['loss', 'acc', 'mAP'], top: 28 },
    grid: { left: 48, right: 24, top: 64, bottom: 40 },
    xAxis: {
      type: 'category',
      name: 'epoch',
      data: epochs.length ? epochs : [0],
    },
    yAxis: { type: 'value', scale: true },
    series: [
      {
        name: 'loss',
        type: 'line',
        smooth: true,
        data: metrics.value.loss,
        itemStyle: { color: '#f97316' },
      },
      {
        name: 'acc',
        type: 'line',
        smooth: true,
        data: metrics.value.acc,
        itemStyle: { color: '#1677ff' },
      },
      {
        name: 'mAP',
        type: 'line',
        smooth: true,
        data: metrics.value.map,
        itemStyle: { color: '#16a34a' },
      },
    ],
  })
}

function onResize() {
  chart?.resize()
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await loadList()
  if (currentId.value) await loadAll(currentId.value)
  else if (experiments.value[0]) router.replace(`/train/metrics/${experiments.value[0].id}`)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

watch(currentId, (id) => {
  if (id) loadAll(id)
})

function switchExp(id) {
  router.push(`/train/metrics/${id}`)
}

async function onExport(format) {
  if (!exp.value) return
  if (!metrics.value.loss.length && exp.value.status !== 'finished') {
    ElMessage.warning('尚无指标点，建议先运行训练或选择已完成实验')
  }
  exporting.value = true
  try {
    const res = await exportReport(exp.value.id, format)
    ElMessage.success(`已导出 ${res.filename}`)
  } catch (e) {
    ElMessage.error(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function refresh() {
  if (currentId.value) await loadAll(currentId.value)
}
</script>

<template>
  <div v-loading="loading" class="metrics">
    <el-alert
      v-if="isAnnotator"
      type="info"
      :closable="false"
      show-icon
      class="perm"
      :title="`当前身份 ${copy.roles[auth.role]}：只读查看 loss / acc / mAP，可导出报表`"
    />

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="never" class="card">
          <template #header>选择实验</template>
          <el-menu :key="currentId" :default-active="currentId" @select="switchExp">
            <el-menu-item v-for="e in experiments" :key="e.id" :index="e.id">
              <div class="menu-item">
                <div class="id">{{ e.id }}</div>
                <div class="name">{{ e.name }}</div>
                <el-tag size="small" effect="plain">{{ e.status }} · {{ e.metricLen || 0 }}pts</el-tag>
              </div>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card v-if="exp" shadow="never" class="card">
          <template #header>
            <div class="card-head">
              <span>指标面板 · {{ exp.id }}</span>
              <div class="ops">
                <el-button size="small" @click="refresh">刷新</el-button>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :loading="exporting"
                  :disabled="!canExport"
                  @click="onExport('csv')"
                >
                  导出 CSV
                </el-button>
                <el-button
                  size="small"
                  type="success"
                  plain
                  :loading="exporting"
                  :disabled="!canExport"
                  @click="onExport('excel')"
                >
                  导出 Excel
                </el-button>
              </div>
            </div>
          </template>

          <el-descriptions :column="4" size="small" border class="desc">
            <el-descriptions-item label="状态">{{ exp.status }}</el-descriptions-item>
            <el-descriptions-item label="Epoch">
              {{ exp.currentEpoch }} / {{ exp.epochs }}
            </el-descriptions-item>
            <el-descriptions-item label="最新 loss">
              {{ metrics.loss.at(-1) ?? '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="最新 acc / mAP">
              {{ metrics.acc.at(-1) ?? '—' }} / {{ metrics.map.at(-1) ?? '—' }}
            </el-descriptions-item>
          </el-descriptions>

          <div ref="chartRef" class="chart" />

          <el-table
            v-if="metrics.loss.length"
            class="table"
            size="small"
            stripe
            :data="
              metrics.loss.map((loss, i) => ({
                epoch: i + 1,
                loss,
                acc: metrics.acc[i],
                map: metrics.map[i],
              }))
            "
            max-height="220"
          >
            <el-table-column prop="epoch" label="epoch" width="80" />
            <el-table-column prop="loss" label="loss" />
            <el-table-column prop="acc" label="acc" />
            <el-table-column prop="map" label="mAP" />
          </el-table>
          <el-empty v-else description="暂无指标，请先在「训练运行」启动实验" :image-size="72" />
        </el-card>
        <el-empty v-else description="请选择实验" />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.perm {
  margin-bottom: 12px;
}
.card {
  border-radius: 8px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.ops {
  display: flex;
  gap: 8px;
}
.menu-item .id {
  font-size: 12px;
  color: #6b7280;
}
.menu-item .name {
  font-size: 13px;
  margin: 2px 0 4px;
}
.desc {
  margin-bottom: 12px;
}
.chart {
  width: 100%;
  height: 360px;
  background: #fafafa;
  border-radius: 6px;
}
.table {
  margin-top: 12px;
}
</style>
