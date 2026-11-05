<script setup>
import { message } from '@/ui/discrete'
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
    if (exp.value.status === 'running') startTimer()
    else stopTimer()
  } catch (e) {
    message.error(e.message || '加载失败')
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
    message.warning('请切换为管理员后再启停训练')
    return
  }
  acting.value = true
  try {
    exp.value = await startTrain(exp.value.id)
    message.success('训练已启动')
    startTimer()
    await loadList()
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

async function toggleAugmentDisplay() {
  // read-only display of augment flag; actual toggle is at create time
  message.info(
    exp.value?.augment
      ? `当前增强开启：${(exp.value.augmentOps || []).join(', ') || '默认'}`
      : '当前未开启数据增强（创建实验时可配置）',
  )
}
</script>

<template>
  <div class="runner">
    <n-alert
      v-if="!isAdmin"
      type="info"
      :closable="false"
      show-icon
      class="perm"
      :title="`当前身份 ${copy.roles[auth.role]}：可查看运行日志与进度；启停训练需管理员`"
    />

    <n-grid cols="24"  x-gap="16" y-gap="16">
      <n-gi :span="6">
        <n-card class="card">
          <template #header>选择实验</template>
          
        </n-card>
      </n-gi>

      <n-gi :span="18">
        <n-card v-if="exp" class="card">
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
                <n-button size="small" type="success" secondary @click="goMetrics">查看指标</n-button>
              </div>
            </div>
          </template>

          <n-descriptions :column="3" bordered size="small" class="desc">
            <n-descriptions-item label="算法">{{ exp.algorithm }} @ {{ exp.version }}</n-descriptions-item>
            <n-descriptions-item label="模型">{{ exp.model }}</n-descriptions-item>
            <n-descriptions-item label="超参">
              bs={{ exp.batchSize }} / lr={{ exp.learningRate }} / ep={{ exp.epochs }}
            </n-descriptions-item>
            <n-descriptions-item label="GPU">{{ gpuNames(exp.gpuIds) || '未分配' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag size="small">{{ exp.status }}</n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="进度">
              epoch {{ exp.currentEpoch }} / {{ exp.epochs }}
            </n-descriptions-item>
          </n-descriptions>

          <div class="prog">
            <n-progress
              :percentage="progressPct"
              :status="exp.status === 'finished' ? 'success' : exp.status === 'running' ? undefined : undefined"
              :="exp.status === 'running'"
            />
          </div>

          <ProgressMock
            :running="exp.status === 'running'"
            label="模拟训练步进（loss / acc / mAP 写入中）"
            :duration="800"
          />

          <h4>运行日志</h4>
          <n-timeline class="logs">
            <n-timeline-item
              v-for="(log, idx) in [...(exp.consoleLines || [])].reverse()"
              :key="idx"
              :timestamp="log.at"
              :type="log.level === 'success' ? 'success' : log.level === 'warning' ? 'warning' : 'primary'"
              placement="top"
            >
              {{ log.message }}
            </n-timeline-item>
          </n-timeline>
        </n-card>
        <n-empty v-else description="请选择实验" />
      </n-gi>
    </n-grid>
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
