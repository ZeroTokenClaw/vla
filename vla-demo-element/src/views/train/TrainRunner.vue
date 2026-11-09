<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProgressMock from '@/components/ProgressMock.vue'
import { useAuthStore } from '@/stores/auth'
import { copy } from '@/i18n/copy'
import {
  listExperiments,
  getExperiment,
  startTrain,
  stopTrain,
  pauseTrain,
  resumeTrain,
  retryTrain,
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
  const res = await listExperiments({ page: 1, pageSize: 200 })
  experiments.value = res.items || []
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
    ElMessage.error(e.message || '加载失败')
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
        ElMessage.success('训练已完成')
        await loadList()
      }
    } catch (e) {
      stopTimer()
      ElMessage.error(e.message || '推进 epoch 失败')
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
    ElMessage.warning('请切换为管理员后再启停训练')
    return
  }
  acting.value = true
  try {
    exp.value = await startTrain(exp.value.id)
    ElMessage.success('训练已启动')
    startTimer()
    await loadList()
  } catch (e) {
    ElMessage.error(e.message || '启动失败')
  } finally {
    acting.value = false
  }
}

async function onStop() {
  if (!exp.value) return
  if (!isAdmin.value) {
    ElMessage.warning('请切换为管理员后再启停训练')
    return
  }
  acting.value = true
  try {
    stopTimer()
    exp.value = await stopTrain(exp.value.id)
    ElMessage.warning('训练已停止')
    await loadList()
  } catch (e) {
    ElMessage.error(e.message || '停止失败')
  } finally {
    acting.value = false
  }
}

async function onPause() {
  if (!exp.value || !isAdmin.value) return
  acting.value = true
  try {
    stopTimer()
    exp.value = await pauseTrain(exp.value.id)
    ElMessage.warning('训练已暂停')
    await loadList()
  } catch (e) {
    ElMessage.error(e.message || '暂停失败')
  } finally {
    acting.value = false
  }
}

async function onResume() {
  if (!exp.value || !isAdmin.value) return
  acting.value = true
  try {
    exp.value = await resumeTrain(exp.value.id)
    ElMessage.success('训练已恢复')
    startTimer()
    await loadList()
  } catch (e) {
    ElMessage.error(e.message || '恢复失败')
  } finally {
    acting.value = false
  }
}

async function onRetry() {
  if (!exp.value || !isAdmin.value) return
  acting.value = true
  try {
    exp.value = await retryTrain(exp.value.id)
    ElMessage.success('已重试（指标重置）')
    startTimer()
    await loadList()
  } catch (e) {
    ElMessage.error(e.message || '重试失败')
  } finally {
    acting.value = false
  }
}

function goMetrics() {
  if (exp.value) router.push(`/train/metrics/${exp.value.id}`)
}

async function toggleAugmentDisplay() {
  // read-only display of augment flag; actual toggle is at create time
  ElMessage.info(
    exp.value?.augment
      ? `当前增强开启：${(exp.value.augmentOps || []).join(', ') || '默认'}`
      : '当前未开启数据增强（创建实验时可配置）',
  )
}
</script>

<template>
  <div v-loading="loading" class="runner">
    <el-alert
      v-if="!isAdmin"
      type="info"
      :closable="false"
      show-icon
      class="perm"
      :title="`当前身份 ${copy.roles[auth.role]}：可查看运行日志与进度；启停训练需管理员`"
    />

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="never" class="card">
          <template #header>选择实验</template>
          <el-menu
            :key="currentId"
            :default-active="currentId"
            @select="switchExp"
          >
            <el-menu-item v-for="e in experiments" :key="e.id" :index="e.id">
              <div class="menu-item">
                <div class="id">{{ e.id }}</div>
                <div class="name">{{ e.name }}</div>
                <el-tag size="small" effect="plain">{{ e.status }}</el-tag>
              </div>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card v-if="exp" shadow="never" class="card">
          <template #header>
            <div class="card-head">
              <span>{{ exp.id }} · {{ exp.name }}</span>
              <div class="ops">
                <el-button size="small" @click="toggleAugmentDisplay">
                  数据增强：{{ exp.augment ? '开' : '关' }}
                </el-button>
                <el-button
                  type="primary"
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || exp.status === 'running' || exp.status === 'paused'"
                  @click="onStart"
                >
                  启动
                </el-button>
                <el-button
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || exp.status !== 'running'"
                  @click="onPause"
                >
                  暂停
                </el-button>
                <el-button
                  size="small"
                  type="warning"
                  :loading="acting"
                  :disabled="!isAdmin || exp.status !== 'paused'"
                  @click="onResume"
                >
                  恢复
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || !(exp.status === 'running' || exp.status === 'paused')"
                  @click="onStop"
                >
                  停止
                </el-button>
                <el-button
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || !['stopped', 'failed', 'finished'].includes(exp.status)"
                  @click="onRetry"
                >
                  重试
                </el-button>
                <el-button size="small" type="success" plain @click="goMetrics">查看指标</el-button>
              </div>
            </div>
          </template>

          <el-descriptions :column="3" border size="small" class="desc">
            <el-descriptions-item label="算法">{{ exp.algorithm }} @ {{ exp.version }}</el-descriptions-item>
            <el-descriptions-item label="模型">{{ exp.model }}</el-descriptions-item>
            <el-descriptions-item label="超参">
              bs={{ exp.batchSize }} / lr={{ exp.learningRate }} / ep={{ exp.epochs }}
            </el-descriptions-item>
            <el-descriptions-item label="GPU">{{ gpuNames(exp.gpuIds) || '未分配' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small">{{ exp.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="进度">
              epoch {{ exp.currentEpoch }} / {{ exp.epochs }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="prog">
            <el-progress
              :percentage="progressPct"
              :status="exp.status === 'finished' ? 'success' : exp.status === 'running' ? undefined : undefined"
              :striped="exp.status === 'running'"
              striped-flow
            />
          </div>

          <ProgressMock
            :running="exp.status === 'running'"
            label="模拟训练步进（loss / acc / mAP 写入中）"
            :duration="800"
          />

          <h4>运行日志</h4>
          <el-timeline class="logs">
            <el-timeline-item
              v-for="(log, idx) in [...(exp.logs || [])].reverse()"
              :key="idx"
              :timestamp="log.at"
              :type="log.level === 'success' ? 'success' : log.level === 'warning' ? 'warning' : 'primary'"
              placement="top"
            >
              {{ log.message }}
            </el-timeline-item>
          </el-timeline>
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
