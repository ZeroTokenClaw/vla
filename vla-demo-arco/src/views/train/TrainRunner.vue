<script setup>
import { Message } from '@/ui/discrete'
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
    Message.error(e.message || '加载失败')
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
        Message.success('训练已完成')
        await loadList()
      }
    } catch (e) {
      stopTimer()
      Message.error(e.message || '推进 epoch 失败')
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
    Message.warning('请切换为管理员后再启停训练')
    return
  }
  acting.value = true
  try {
    exp.value = await startTrain(exp.value.id)
    Message.success('训练已启动')
    startTimer()
    await loadList()
  } catch (e) {
    Message.error(e.message || '启动失败')
  } finally {
    acting.value = false
  }
}

async function onStop() {
  if (!exp.value) return
  if (!isAdmin.value) {
    Message.warning('请切换为管理员后再启停训练')
    return
  }
  acting.value = true
  try {
    stopTimer()
    exp.value = await stopTrain(exp.value.id)
    Message.warning('训练已停止')
    await loadList()
  } catch (e) {
    Message.error(e.message || '停止失败')
  } finally {
    acting.value = false
  }
}

function goMetrics() {
  if (exp.value) router.push(`/train/metrics/${exp.value.id}`)
}

const latestMetrics = computed(() => {
  const m = exp.value?.metrics
  if (!m) return null
  const n = (m.loss || []).length
  if (!n) return null
  return {
    epoch: n,
    loss: m.loss[n - 1],
    acc: m.acc?.[n - 1],
    map: m.map?.[n - 1],
    mapMetric: exp.value?.algorithm === 'det_yolo' ? 'mAP@0.5' : 'Acc/Proxy-mAP',
  }
})

const augmentSamples = computed(() => {
  const ops = exp.value?.augmentOps || []
  if (!ops.length) return []
  // 伪造增强样例条：用 CSS 滤镜示意，不依赖真实图像管线
  return ops.map((op, i) => ({
    op,
    label: (
      {
        flip: '水平翻转',
        color_jitter: '色彩抖动',
        crop: '随机裁剪',
        mixup: 'MixUp',
        rotate: '旋转',
        scale: '缩放',
        brightness: '亮度',
        contrast: '对比度',
        noise: '噪声',
      }[op] || op
    ),
    filter:
      (
        {
          flip: 'none',
          color_jitter: 'hue-rotate(25deg) saturate(1.3)',
          crop: 'contrast(1.1)',
          mixup: 'opacity(0.85)',
          rotate: 'none',
          scale: 'none',
          brightness: 'brightness(1.25)',
          contrast: 'contrast(1.35)',
          noise: 'contrast(1.1) brightness(0.95)',
        }[op] || 'none'
      ),
    transform: op === 'flip' ? 'scaleX(-1)' : op === 'rotate' ? 'rotate(8deg)' : op === 'scale' ? 'scale(1.12)' : 'none',
    seed: i + 1,
  }))
})

async function toggleAugmentDisplay() {
  Message.info(
    exp.value?.augment
      ? `当前增强开启：${(exp.value.augmentOps || []).join(', ') || '默认'}`
      : '当前未开启数据增强（创建实验时可配置）',
  )
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
      :title="`当前身份 ${copy.roles[auth.role]}：可查看运行日志与进度；启停训练需管理员`"
    />

    <a-row :gutter="16">
      <a-col :span="6">
        <a-card class="card">
          <template #title>选择实验</template>
          <a-menu
            :key="currentId"
            @menu-item-click="switchExp"
          >
            <a-menu-item v-for="e in experiments" :key="e.id">
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
        <a-card v-if="exp" class="card">
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
                  @click="onStart"
                >
                  启动训练
                </a-button>
                <a-button
                  type="primary" status="danger"
                  size="small"
                  :loading="acting"
                  :disabled="!isAdmin || exp.status !== 'running'"
                  @click="onStop"
                >
                  停止
                </a-button>
                <a-button size="small" status="success" @click="goMetrics">查看指标</a-button>
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
              :status="exp.status === 'finished' ? 'success' : undefined"
            />
          </div>

          <a-row v-if="latestMetrics" :gutter="12" class="metric-cards">
            <a-col :span="6">
              <a-statistic title="Epoch" :value="latestMetrics.epoch" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="Train Loss" :value="Number(latestMetrics.loss || 0)" :precision="4" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="Accuracy" :value="Number(latestMetrics.acc || 0)" :precision="4" />
            </a-col>
            <a-col :span="6">
              <a-statistic :title="latestMetrics.mapMetric" :value="Number(latestMetrics.map || 0)" :precision="4" />
            </a-col>
          </a-row>
          <a-empty v-else description="启动训练后此处展示伪造步进指标" />

          <div v-if="augmentSamples.length" class="aug-block">
            <h4>数据增强样例预览（伪造滤镜示意）</h4>
            <div class="aug-grid">
              <div v-for="s in augmentSamples" :key="s.op" class="aug-card">
                <div
                  class="aug-thumb"
                  :style="{
                    filter: s.filter,
                    transform: s.transform,
                    background: `linear-gradient(135deg, hsl(${40 + s.seed * 40}, 70%, 45%), hsl(${180 + s.seed * 20}, 55%, 35%))`,
                  }"
                >
                  SRC
                </div>
                <div class="aug-lab">{{ s.label }}</div>
                <code>{{ s.op }}</code>
              </div>
            </div>
          </div>

          <ProgressMock
            :running="exp.status === 'running'"
            label="演示训练步进（伪造 loss / acc / mAP 写入中）"
            :duration="800"
          />

          <h4>运行日志</h4>
          <a-timeline class="logs">
            <a-timeline-item
              v-for="(log, idx) in [...(exp.trainLog || [])].reverse()"
              :key="idx"
              :label="log.at"
              :type="log.level === 'success' ? 'success' : log.level === 'warning' ? 'warning' : 'primary'"
            >
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
.metric-cards {
  margin: 8px 0 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}
.aug-block {
  margin-bottom: 12px;
}
.aug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.aug-card {
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  padding: 8px;
  background: #fff;
  text-align: center;
}
.aug-thumb {
  height: 72px;
  border-radius: 6px;
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.08em;
}
.aug-lab {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 600;
}
.aug-card code {
  font-size: 10px;
  color: #86909c;
}
</style>
