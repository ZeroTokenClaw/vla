<script setup>import { notification } from 'ant-design-vue'

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

let timer = null

const currentId = computed(() => route.params.id)
const isAdmin = computed(() => auth.role === 'admin')
const progressPct = computed(() => {
  if (!exp.value?.epochs) return 0
  return Math.min(100, Math.round((exp.value.currentEpoch / exp.value.epochs) * 100))
})

function gpuNames(ids) {
  return (ids || [])
    .map((id) => meta.value.gpus.find((g) => g.id === id)?.name || id)
    .join(', ')
}

async function loadList() {
  experiments.value = await listExperiments()
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
    if (exp.value.status === 'running') startTimer()
    else stopTimer()
  } catch (e) {
    notification.error({ message: e.message || '加载失败', placement: 'topRight' })
  } finally {
    loading.value = false
  }
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
      if (res.done) {
        stopTimer()
        notification.success({ message: '训练已完成', placement: 'topRight' })
        await loadList()
      }
    } catch (e) {
      stopTimer()
      notification.error({ message: e.message || '推进 epoch 失败', placement: 'topRight' })
    }
  }, 900)
}

onMounted(async () => {
  await loadList()
  if (currentId.value) await loadExp(currentId.value)
  else if (experiments.value[0]) router.replace(`/train/runner/${experiments.value[0].id}`)
})

onUnmounted(stopTimer)

watch(currentId, (id) => {
  if (id) loadExp(id)
})

function switchExp(id) {
  router.push(`/train/runner/${id}`)
}

async function onStart() {
  if (!exp.value) return
  if (!isAdmin.value) {
    notification.warning({ message: '请切换为管理员后再启停训练', placement: 'topRight' })
    return
  }
  acting.value = true
  try {
    exp.value = await startTrain(exp.value.id)
    notification.success({ message: '训练已启动', placement: 'topRight' })
    startTimer()
    await loadList()
  } catch (e) {
    notification.error({ message: e.message || '启动失败', placement: 'topRight' })
  } finally {
    acting.value = false
  }
}

async function onStop() {
  if (!exp.value) return
  if (!isAdmin.value) {
    notification.warning({ message: '请切换为管理员后再启停训练', placement: 'topRight' })
    return
  }
  acting.value = true
  try {
    stopTimer()
    exp.value = await stopTrain(exp.value.id)
    notification.warning({ message: '训练已停止', placement: 'topRight' })
    await loadList()
  } catch (e) {
    notification.error({ message: e.message || '停止失败', placement: 'topRight' })
  } finally {
    acting.value = false
  }
}

function goMetrics() {
  if (exp.value) router.push(`/train/metrics/${exp.value.id}`)
}

async function toggleAugmentDisplay() {
  const ops = (exp.value?.augmentOps || []).join(', ') || '默认'
  const msg = exp.value?.augment
    ? `当前增强开启：${ops}`
    : '当前未开启数据增强（创建实验时可配置）'
  notification.info({ message: msg, placement: 'topRight' })
}
</script>

<template>
  <div class="runner">
    <a-alert
      v-if="!isAdmin"
      type="info"
      :closable="false"
      show-icon
      class="perm"
      :message="`当前身份 ${copy.roles[auth.role]}：可查看运行日志与进度；启停训练需管理员`" />

    <a-row :gutter="16">
      <a-col :span="6">
        <a-card  class="card">
          <template #title>选择实验</template>
          <a-menu
            :key="currentId"
            :selected-keys="currentId"
            @click="switchExp">
            <a-menu-item v-for="e in experiments" :key="e.id" :index="e.id">
              <div class="menu-item">
                <div class="id">{{ e.id }}</div>
                <div class="name">{{ e.name }}</div>
                <a-tag size="small">{{ e.status }}</a-tag>
              </div>
            </a-menu-item>
          </a-menu>
        </a-card>
      </a-col>

      <a-col :span="18">
        <a-card v-if="exp"  class="card">
          <template #title>
            <div class="card-head">
              <span>{{ exp.id }} · {{ exp.name }}</span>
              <div class="ops">
                <a-button size="small" @click="toggleAugmentDisplay">
                  数据增强：{{ exp.augment ? '开' : '关' }}
                </a-button>
                <a-button
                  type="primary"
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || exp.status === 'running'"
                  @click="onStart">
                  启动训练
                </a-button>
                <a-button
                  danger
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || exp.status !== 'running'"
                  @click="onStop">
                  停止
                </a-button>
                <a-button size="small" type="success" plain @click="goMetrics">查看指标</a-button>
              </div>
            </div>
          </template>

          <a-descriptions :column="3" bordered size="small" class="desc">
            <a-descriptions-item label="算法">{{ exp.algorithm }} @ {{ exp.version }}</a-descriptions-item>
            <a-descriptions-item label="模型">{{ exp.model }}</a-descriptions-item>
            <a-descriptions-item label="超参">
              bs={{ exp.batchSize }} / lr={{ exp.learningRate }} / ep={{ exp.epochs }}
            </a-descriptions-item>
            <a-descriptions-item label="GPU">{{ gpuNames(exp.gpuIds) || '未分配' }}</a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag size="small">{{ exp.status }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="进度">
              epoch {{ exp.currentEpoch }} / {{ exp.epochs }}
            </a-descriptions-item>
          </a-descriptions>

          <div class="prog">
            <a-progress
              :percent="progressPct"
              :status="exp.status === 'finished' ? 'success' : exp.status === 'running' ? 'active' : 'normal'" />
          </div>

          <ProgressMock
            :running="exp.status === 'running'"
            label="模拟训练步进（loss / acc / mAP 写入中）"
            :duration="800" />

          <h4>运行日志</h4>
          <a-timeline class="logs">
            <a-timeline-item
              v-for="(log, idx) in [...(exp.logs || [])].reverse()"
              :key="idx"
              :timestamp="log.at"
              :type="log.level === 'success' ? 'success' : log.level === 'warning' ? 'warning' : 'primary'"
              placement="top">
              {{ log.message }}
            </a-timeline-item>
          </a-timeline>
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
  flex-wrap: wrap;
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
.prog {
  margin: 12px 0;
}
.logs {
  max-height: 360px;
  overflow: auto;
  padding-left: 4px;
}
h4 {
  margin: 8px 0 12px;
  font-size: 14px;
}
</style>
