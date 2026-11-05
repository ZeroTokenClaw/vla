<script setup>import { notification } from 'ant-design-vue'

import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  experiments.value = (await listExperiments({ page: 1, pageSize: 200 })).items
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
    notification.error({ message: e.message || '加载失败', placement: 'topRight' })
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
    notification.warning({ message: '尚无指标点，建议先运行训练或选择已完成实验', placement: 'topRight' })
  }
  exporting.value = true
  try {
    const res = await exportReport(exp.value.id, format)
    notification.success({ message: `已导出 ${res.filename}`, placement: 'topRight' })
  } catch (e) {
    notification.error({ message: e.message || '导出失败', placement: 'topRight' })
  } finally {
    exporting.value = false
  }
}

async function refresh() {
  if (currentId.value) await loadAll(currentId.value)
}
</script>

<template>
  <div :loading="loading" class="metrics">
    <a-alert
      v-if="isAnnotator"
      type="info"
      :closable="false"
      show-icon
      class="perm"
      :message="`当前身份 ${copy.roles[auth.role]}：只读查看 loss / acc / mAP，可导出报表`" />

    <a-row :gutter="16">
      <a-col :span="6">
        <a-card  class="card">
          <template #title>选择实验</template>
          <a-menu :key="currentId" :selected-keys="currentId" @click="switchExp">
            <a-menu-item v-for="e in experiments" :key="e.id" :index="e.id">
              <div class="menu-item">
                <div class="id">{{ e.id }}</div>
                <div class="name">{{ e.name }}</div>
                <a-tag size="small">{{ e.status }} · {{ e.metricLen || 0 }}pts</a-tag>
              </div>
            </a-menu-item>
          </a-menu>
        </a-card>
      </a-col>

      <a-col :span="18">
        <a-card v-if="exp"  class="card">
          <template #title>
            <div class="card-head">
              <span>指标面板 · {{ exp.id }}</span>
              <div class="ops">
                <a-button size="small" @click="refresh">刷新</a-button>
                <a-button
                  size="small"
                  type="primary"
                  plain
                  :loading="exporting"
                  :disabled="!canExport"
                  @click="onExport('csv')">
                  导出 CSV
                </a-button>
                <a-button
                  size="small"
                  type="success"
                  plain
                  :loading="exporting"
                  :disabled="!canExport"
                  @click="onExport('excel')">
                  导出 Excel
                </a-button>
              </div>
            </div>
          </template>

          <a-descriptions :column="4" size="small" bordered class="desc">
            <a-descriptions-item label="状态">{{ exp.status }}</a-descriptions-item>
            <a-descriptions-item label="Epoch">
              {{ exp.currentEpoch }} / {{ exp.epochs }}
            </a-descriptions-item>
            <a-descriptions-item label="最新 loss">
              {{ metrics.loss.at(-1) ?? '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="最新 acc / mAP">
              {{ metrics.acc.at(-1) ?? '—' }} / {{ metrics.map.at(-1) ?? '—' }}
            </a-descriptions-item>
          </a-descriptions>

          <div ref="chartRef" class="chart" />

          <a-table
            v-if="metrics.loss.length"
            class="table"
            size="small"
            :pagination="false"
            row-key="epoch"
            :data-source="metrics.loss.map((loss, i) => ({
              epoch: i + 1,
              loss,
              acc: metrics.acc[i],
              map: metrics.map[i],
            }))"
            :columns="[
              { title: 'epoch', dataIndex: 'epoch', key: 'epoch', width: 80 },
              { title: 'loss', dataIndex: 'loss', key: 'loss' },
              { title: 'acc', dataIndex: 'acc', key: 'acc' },
              { title: 'mAP', dataIndex: 'map', key: 'map' },
            ]"
            :scroll="{ y: 220 }"
          />
          <a-empty v-else description="暂无指标，请先在「训练运行」启动实验" />
        </a-card>
        <a-empty v-else description="请选择实验" />
      </a-col>
    </a-row>
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
