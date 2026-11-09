<script setup>
import { message } from '@/ui/discrete'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import ProgressMock from '@/components/ProgressMock.vue'
import { useAuthStore } from '@/stores/auth'
import { copy } from '@/i18n/copy'
import {
  listExperiments,
  getExperiment,
  startTrain,
  stopTrain,
  tickEpoch,
  listMeta,
} from '@/services/train'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const experiments = ref([])
const exp = ref(null)
const loading = ref(false)
const acting = ref(false)
const meta = ref({ gpus: [] })
const sparkRef = ref(null)
let chart = null
let timer = null

const currentId = computed(() => route.params.id)
const isAdmin = computed(() => auth.role === 'admin')
const progressPct = computed(() => {
  if (!exp.value?.epochs) return 0
  return Math.min(100, Math.round((exp.value.currentEpoch / exp.value.epochs) * 100))
})

const latestMetrics = computed(() => {
  const m = exp.value?.metrics
  if (!m) return { loss: '—', acc: '—', map: '—' }
  return {
    loss: m.loss?.length ? m.loss[m.loss.length - 1] : '—',
    acc: m.acc?.length ? m.acc[m.acc.length - 1] : '—',
    map: m.map?.length ? m.map[m.map.length - 1] : '—',
  }
})

const gpuCards = computed(() => {
  const ids = new Set(exp.value?.gpuIds || [])
  return (meta.value.gpus || []).map((g) => ({
    ...g,
    usedByThis: ids.has(g.id),
    util: g.free && !ids.has(g.id) ? 8 : ids.has(g.id) ? 62 + (g.id.charCodeAt(4) % 20) : 35,
  }))
})

function gpuNames(ids) {
  return (ids || [])
    .map((id) => meta.value.gpus.find((g) => g.id === id)?.name || id)
    .join(', ')
}

async function loadList() {
  experiments.value = (await listExperiments({ page: 1, pageSize: 200 })).items
  meta.value = listMeta()
}

async function loadExp(id) {
  if (!id) {
    exp.value = null
    stopTimer()
    return
  }
  loading.value = true
  try {
    exp.value = await getExperiment(id)
    await nextTick()
    renderSpark()
    if (exp.value.status === 'running') startTimer()
    else stopTimer()
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function renderSpark() {
  if (!sparkRef.value || !exp.value?.metrics) return
  if (!chart) chart = echarts.init(sparkRef.value)
  const loss = exp.value.metrics.loss || []
  const acc = exp.value.metrics.acc || []
  const map = exp.value.metrics.map || []
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['loss', 'acc', 'mAP'], textStyle: { color: '#8b8b9a' }, top: 0 },
    grid: { left: 40, right: 16, top: 36, bottom: 24 },
    xAxis: {
      type: 'category',
      data: loss.map((_, i) => i + 1),
      axisLabel: { color: '#6e6e7a' },
    },
    yAxis: { type: 'value', scale: true, axisLabel: { color: '#6e6e7a' } },
    series: [
      { name: 'loss', type: 'line', smooth: true, showSymbol: false, data: loss, itemStyle: { color: '#f0a020' } },
      { name: 'acc', type: 'line', smooth: true, showSymbol: false, data: acc, itemStyle: { color: '#63e2b7' } },
      { name: 'mAP', type: 'line', smooth: true, showSymbol: false, data: map, itemStyle: { color: '#70c0e8' } },
    ],
  })
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startTimer() {
  stopTimer()
  timer = setInterval(async () => {
    if (!exp.value || exp.value.status !== 'running') {
      stopTimer()
      return
    }
    try {
      const res = await tickEpoch(exp.value.id)
      exp.value = res.experiment
      renderSpark()
      if (res.done) {
        stopTimer()
        message.success('训练已完成')
        await loadList()
      }
    } catch (e) {
      stopTimer()
      message.error(e.message || '推进 epoch 失败')
    }
  }, 900)
}

onMounted(async () => {
  await loadList()
  if (currentId.value) await loadExp(currentId.value)
  else if (experiments.value[0]) router.replace(`/train/runner/${experiments.value[0].id}`)
})

onUnmounted(() => {
  stopTimer()
  chart?.dispose()
})

watch(currentId, (id) => {
  if (id) loadExp(id)
})

function switchExp(id) {
  router.push(`/train/runner/${id}`)
}

async function onStart() {
  if (!exp.value) return
  if (!isAdmin.value) {
    message.warning('请切换为管理员后再启停训练')
    return
  }
  acting.value = true
  try {
    exp.value = await startTrain(exp.value.id)
    message.success('训练已启动')
    startTimer()
    await loadList()
    renderSpark()
  } catch (e) {
    message.error(e.message || '启动失败')
  } finally {
    acting.value = false
  }
}

async function onStop() {
  if (!exp.value) return
  if (!isAdmin.value) {
    message.warning('请切换为管理员后再启停训练')
    return
  }
  acting.value = true
  try {
    stopTimer()
    exp.value = await stopTrain(exp.value.id)
    message.warning('训练已停止')
    await loadList()
  } catch (e) {
    message.error(e.message || '停止失败')
  } finally {
    acting.value = false
  }
}

function goMetrics() {
  if (exp.value) router.push(`/train/metrics/${exp.value.id}`)
}

function toggleAugmentDisplay() {
  message.info(
    exp.value?.augment
      ? `当前增强开启：${(exp.value.augmentOps || []).join(', ') || '默认'}`
      : '当前未开启数据增强（创建实验时可配置）',
  )
}

const statusType = (s) => {
  if (s === 'running') return 'success'
  if (s === 'finished') return 'info'
  if (s === 'failed' || s === 'stopped') return 'warning'
  return 'default'
}
</script>

<template>
  <div class="runner">
    <n-alert
      v-if="!isAdmin"
      type="info"
      :bordered="false"
      class="perm"
      :title="`当前身份 ${copy.roles[auth.role]}：可查看运行日志与进度；启停训练需管理员`"
    />
    <n-alert type="warning" :bordered="false" class="perm">
      演示说明：epoch 步进与曲线为本地假数据模拟，非真实训练进程产物。
    </n-alert>

    <div class="layout">
      <n-card class="side" title="实验列表" :bordered="false">
        <div
          v-for="e in experiments"
          :key="e.id"
          class="exp-item"
          :class="{ on: e.id === currentId }"
          @click="switchExp(e.id)"
        >
          <div class="id">{{ e.id }}</div>
          <div class="name">{{ e.name }}</div>
          <n-space size="small">
            <n-tag size="tiny" :type="statusType(e.status)" :bordered="false">{{ e.status }}</n-tag>
            <span class="muted">ep {{ e.currentEpoch }}/{{ e.epochs }}</span>
          </n-space>
        </div>
      </n-card>

      <n-spin :show="loading" class="main">
        <n-card v-if="exp" :bordered="false">
          <template #header>
            <div class="card-head">
              <span>{{ exp.id }} · {{ exp.name }}</span>
              <div class="ops">
                <n-button size="small" @click="toggleAugmentDisplay">
                  数据增强：{{ exp.augment ? '开' : '关' }}
                </n-button>
                <n-button
                  type="primary"
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || exp.status === 'running'"
                  @click="onStart"
                >
                  启动训练
                </n-button>
                <n-button
                  type="error"
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || exp.status !== 'running'"
                  @click="onStop"
                >
                  停止
                </n-button>
                <n-button size="small" type="success" secondary @click="goMetrics">完整报表</n-button>
              </div>
            </div>
          </template>

          <n-descriptions :column="3" label-placement="left" size="small" class="desc">
            <n-descriptions-item label="算法">{{ exp.algorithm }} @ {{ exp.version }}</n-descriptions-item>
            <n-descriptions-item label="模型">{{ exp.model }}</n-descriptions-item>
            <n-descriptions-item label="超参">
              bs={{ exp.batchSize }} / lr={{ exp.learningRate }} / ep={{ exp.epochs }}
            </n-descriptions-item>
            <n-descriptions-item label="GPU">{{ gpuNames(exp.gpuIds) || '未分配' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag size="small" :type="statusType(exp.status)" :bordered="false">{{ exp.status }}</n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="进度">
              epoch {{ exp.currentEpoch }} / {{ exp.epochs }}
            </n-descriptions-item>
          </n-descriptions>

          <div class="metric-kpis">
            <div><span>Loss</span><b>{{ latestMetrics.loss }}</b></div>
            <div><span>Acc</span><b>{{ latestMetrics.acc }}</b></div>
            <div><span>mAP</span><b>{{ latestMetrics.map }}</b></div>
          </div>

          <div class="prog">
            <n-progress
              type="line"
              :percentage="progressPct"
              :status="exp.status === 'finished' ? 'success' : undefined"
              :processing="exp.status === 'running'"
            />
          </div>

          <div ref="sparkRef" class="spark" />

          <h4>GPU 占用（演示估算）</h4>
          <div class="gpus">
            <div v-for="g in gpuCards" :key="g.id" class="gpu">
              <div class="gpu-h">
                <span>{{ g.name }}</span>
                <n-tag size="tiny" :type="g.usedByThis ? 'success' : g.free ? 'default' : 'warning'" :bordered="false">
                  {{ g.usedByThis ? '本实验' : g.free ? '空闲' : '占用' }}
                </n-tag>
              </div>
              <n-progress type="line" :percentage="g.util" :show-indicator="true" />
            </div>
          </div>

          <ProgressMock
            :running="exp.status === 'running'"
            label="模拟训练步进（loss / acc / mAP 写入中）"
            :duration="800"
          />

          <h4>运行日志</h4>
          <n-timeline class="logs">
            <n-timeline-item
              v-for="(log, idx) in [...(exp.logs || exp.consoleLines || [])].reverse()"
              :key="idx"
              :timestamp="log.at"
              :type="log.level === 'success' ? 'success' : log.level === 'warning' ? 'warning' : 'default'"
            >
              {{ log.message }}
            </n-timeline-item>
          </n-timeline>
          <n-empty v-if="!(exp.logs || exp.consoleLines || []).length" description="暂无日志" />
        </n-card>
        <n-empty v-else description="请选择实验" />
      </n-spin>
    </div>
  </div>
</template>

<style scoped>
.perm { margin-bottom: 10px; }
.layout { display: grid; grid-template-columns: 240px 1fr; gap: 12px; }
.side { background: #14141c; max-height: 78vh; overflow: auto; }
.exp-item {
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 6px;
}
.exp-item:hover { background: #1a1a22; }
.exp-item.on { border-color: #18a058; background: #163528; }
.id { font-size: 11px; color: #8b8b9a; }
.name { font-size: 13px; color: #e8e8ed; margin: 2px 0 4px; }
.muted { font-size: 11px; color: #6e6e7a; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.ops { display: flex; gap: 8px; flex-wrap: wrap; }
.desc { margin-bottom: 12px; }
.metric-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.metric-kpis div {
  background: #0f0f14;
  border-radius: 8px;
  padding: 10px;
  border: 1px solid #2a2a36;
}
.metric-kpis span { display: block; color: #8b8b9a; font-size: 12px; }
.metric-kpis b { color: #63e2b7; font-size: 20px; }
.prog { margin: 8px 0 12px; }
.spark { height: 220px; margin-bottom: 12px; }
.gpus { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.gpu { background: #0f0f14; border-radius: 8px; padding: 8px 10px; border: 1px solid #2a2a36; }
.gpu-h { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #c8c8d0; }
.logs { max-height: 280px; overflow: auto; }
h4 { margin: 8px 0 10px; font-size: 14px; color: #c8c8d0; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 900px) {
  .layout, .gpus { grid-template-columns: 1fr; }
}
</style>
