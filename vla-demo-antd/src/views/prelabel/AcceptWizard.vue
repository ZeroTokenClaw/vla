<script setup>import { notification } from 'ant-design-vue'
import { CheckCircleOutlined, SyncOutlined, ClockCircleOutlined } from '@ant-design/icons-vue'

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  listAcceptJobs,
  getAcceptJob,
  advanceAcceptStep,
  ACCEPT_STEPS,
} from '@/services/prelabel'
import { useAuthStore } from '@/stores/auth'
import ProgressMock from '@/components/ProgressMock.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const jobs = ref([])
const job = ref(null)
const loading = ref(false)
const advancing = ref(false)
const qaNote = ref('')

const currentId = computed(() => route.params.id)

const activeStepIndex = computed(() => {
  if (!job.value) return 0
  return ACCEPT_STEPS.findIndex((s) => s.key === job.value.step)
})

const canFinalAccept = computed(() => ['reviewer', 'admin'].includes(auth.role))

const currentStepMeta = computed(() => ACCEPT_STEPS[activeStepIndex.value] || ACCEPT_STEPS[0])

async function loadList() {
  jobs.value = await listAcceptJobs()
}

async function loadJob(id) {
  if (!id) {
    job.value = null
    return
  }
  loading.value = true
  try {
    job.value = await getAcceptJob(id)
    qaNote.value = job.value.qaNote || ''
  } catch (e) {
    notification.error({ message: e.message || '加载失败', placement: 'topRight' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadList()
  if (currentId.value) await loadJob(currentId.value)
  else if (jobs.value[0]) router.replace(`/prelabel/accept/${jobs.value[0].id}`)
})

watch(currentId, (id) => {
  if (id) loadJob(id)
})

function switchJob(id) {
  router.push(`/prelabel/accept/${id}`)
}

async function onAdvance() {
  if (!job.value) return
  if (job.value.status === 'accepted') {
    notification.info({ message: '该任务已验收完成', placement: 'topRight' })
    return
  }
  if (job.value.step === 'accept' && !canFinalAccept.value) {
    notification.warning({ message: '请切换为审核员或管理员后再最终验收', placement: 'topRight' })
    return
  }
  const stepLabel = currentStepMeta.value.label
  advancing.value = true
  try {
    job.value = await advanceAcceptStep(job.value.id, {
      qaNote: job.value.step === 'qa' ? qaNote.value : undefined,
    })
    if (job.value.status === 'accepted') {
      notification.success({ message: '结果验收通过，已入库', placement: 'topRight' })
    } else {
      notification.success({ message: `已完成「${stepLabel}」，进入下一步`, placement: 'topRight' })
    }
    await loadList()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    advancing.value = false
  }
}

function stepStatus(key) {
  if (!job.value) return 'wait'
  if (job.value.stepDone.includes(key)) return 'success'
  if (job.value.step === key) return 'process'
  return 'wait'
}

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}
</script>

<template>
  <div :loading="loading" class="accept-wiz">
    <a-row :gutter="12">
      <a-col :span="6">
        <a-card  class="side">
          <template #title>
            <div class="card-h">验收任务</div>
          </template>
          <a-menu :selected-keys="currentId" @click="switchJob">
            <a-menu-item v-for="j in jobs" :key="j.id" :index="j.id">
              <div class="doc-item">
                <div class="doc-id">{{ j.id }}</div>
                <div class="doc-title">{{ j.title }}</div>
                <a-tag
                  size="small"
                  :color="mapTagColor(j.status === 'accepted' ? 'success' : 'warning')">
                  {{ j.status === 'accepted' ? '已验收' : j.step }}
                </a-tag>
              </div>
            </a-menu-item>
          </a-menu>
        </a-card>
      </a-col>

      <a-col :span="18">
        <a-card>
          <div class="toolbar">
            <div>
              <div class="title">{{ job?.title || '选择验收任务' }}</div>
              <div class="meta" v-if="job">
                来源 {{ job.sourceType }} / {{ job.sourceId }}
                <template v-if="job.acceptedAt">
                  · 验收人 {{ job.acceptedBy }} · {{ job.acceptedAt }}
                </template>
              </div>
            </div>
            <a-tag v-if="job" :color="mapTagColor(job.status === 'accepted' ? 'success' : 'warning')">
              {{ job.status === 'accepted' ? '已验收' : '进行中' }}
            </a-tag>
          </div>

          <a-steps :current="activeStepIndex" finish-status="success" align-center class="steps">
            <a-step
              v-for="s in ACCEPT_STEPS"
              :key="s.key"
              :title="s.label"
              :description="s.desc"
              :status="stepStatus(s.key) === 'success' ? 'success' : undefined" />
          </a-steps>

          <ProgressMock :running="advancing" label="步骤处理中…" :duration="700" />

          <a-card  class="step-card" v-if="job">
            <h3>{{ currentStepMeta.label }}</h3>
            <p class="desc">{{ currentStepMeta.desc }}</p>

            <ul class="checklist">
              <li v-for="s in ACCEPT_STEPS" :key="s.key">
                <CheckCircleOutlined />
                <SyncOutlined spin />
                <ClockCircleOutlined />
                <span :class="{ done: job.stepDone.includes(s.key), current: job.step === s.key }">
                  {{ s.label }}
                </span>
              </li>
            </ul>

            <a-descriptions size="small" bordered :column="2" style="margin-bottom: 12px">
              <a-descriptions-item label="任务号">{{ job.id }}</a-descriptions-item>
              <a-descriptions-item label="当前步">{{ job.step }}</a-descriptions-item>
              <a-descriptions-item label="来源类型">{{ job.sourceType }}</a-descriptions-item>
              <a-descriptions-item label="来源 ID">{{ job.sourceId }}</a-descriptions-item>
              <a-descriptions-item label="已完成步骤" :span="2">
                <a-tag v-for="s in job.stepDone || []" :key="s" color="success">{{ s }}</a-tag>
                <span v-if="!(job.stepDone || []).length">—</span>
              </a-descriptions-item>
            </a-descriptions>

            <div v-if="job.step === 'confirm'" class="hint">
              <a-checkbox-group
                :value="['schema', 'batch', 'model']"
                :options="[
                  { label: '样例与 Schema 对齐', value: 'schema' },
                  { label: '批次样本齐全', value: 'batch' },
                  { label: '模型版本可追溯', value: 'model' },
                ]"
              />
              <p style="margin-top: 8px">请确认预标注结果与业务样例一致，确认后进入人工精标。</p>
            </div>
            <div v-else-if="job.step === 'annotate'" class="hint">
              请在「文本预标 / OCR / YOLO」页完成人工修正后，回到本向导继续。
              <div class="links">
                <a-button type="link" @click="router.push('/prelabel/text')">打开文本预标</a-button>
                <a-button type="link" @click="router.push('/prelabel/ocr')">打开 OCR</a-button>
                <a-button type="link" @click="router.push('/prelabel/yolo')">打开 YOLO</a-button>
              </div>
            </div>
            <div v-else-if="job.step === 'qa'" class="hint">
              <div class="label">质检意见</div>
              <a-textarea
                v-model:value="qaNote"
                :rows="3"
                placeholder="例如：实体类型已修正，关系抽取合格，允许验收"
              />
              <a-row :gutter="8" style="margin-top: 8px">
                <a-col :span="8"><a-statistic title="伪造准确率" :value="0.93" :precision="2" /></a-col>
                <a-col :span="8"><a-statistic title="修正条目" :value="7" /></a-col>
                <a-col :span="8"><a-statistic title="低置信度" :value="3" /></a-col>
              </a-row>
            </div>
            <div v-else class="hint">
              <a-alert
                :type="canFinalAccept ? 'success' : 'warning'"
                :closable="false"
                :message="
                  canFinalAccept
                    ? `当前角色「${auth.role}」可执行最终验收`
                    : '当前为标注员，请切换审核员/管理员后验收'
                "
              />
              <a-card size="small" style="margin-top: 8px" title="验收归档预览（伪造）">
                <code>model_output + human_correction + final_accept → Dataset reflux</code>
              </a-card>
            </div>

            <div class="footer">
              <a-button
                type="primary"
                :loading="advancing"
                :disabled="job.status === 'accepted'"
                @click="onAdvance">
                {{ job.step === 'accept' ? '确认验收通过' : '完成本步并继续' }}
              </a-button>
            </div>
          </a-card>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.side {
  min-height: 520px;
}
.card-h {
  font-weight: 600;
}
.doc-item {
  line-height: 1.3;
  white-space: normal;
}
.doc-id {
  font-size: 11px;
  color: #6b7280;
}
.doc-title {
  font-size: 13px;
  margin-bottom: 2px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
.steps {
  margin: 8px 0 20px;
}
.step-card {
  background: #fafafa;
}
.step-card h3 {
  margin: 0 0 6px;
}
.desc {
  margin: 0 0 12px;
  color: #6b7280;
  font-size: 13px;
}
.checklist {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.checklist li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.checklist .done {
  color: #52c41a;
  font-weight: 600;
}
.checklist .current {
  color: #1677ff;
  font-weight: 600;
}
.hint {
  margin-bottom: 16px;
  font-size: 13px;
  color: #374151;
}
.label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}
.links {
  margin-top: 8px;
}
.footer {
  display: flex;
  justify-content: flex-end;
}
</style>
