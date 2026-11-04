<script setup>
import { Message } from '@/ui/discrete'
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
    Message.error(e.message || '加载失败')
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
    Message.info('该任务已验收完成')
    return
  }
  if (job.value.step === 'accept' && !canFinalAccept.value) {
    Message.warning('请切换为审核员或管理员后再最终验收')
    return
  }
  const stepLabel = currentStepMeta.value.label
  advancing.value = true
  try {
    job.value = await advanceAcceptStep(job.value.id, {
      qaNote: job.value.step === 'qa' ? qaNote.value : undefined,
    })
    if (job.value.status === 'accepted') {
      Message.success('结果验收通过，已入库')
    } else {
      Message.success(`已完成「${stepLabel}」，进入下一步`)
    }
    await loadList()
  } catch (e) {
    Message.error(e.message)
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
</script>

<template>
  <div class="accept-wiz">
    <a-row :gutter="12">
      <a-col :span="6">
        <a-card class="side">
          <template #title>
            <div class="card-h">验收任务</div>
          </template>
          <a-menu @menu-item-click="switchJob">
            <a-menu-item v-for="j in jobs" :key="j.id">
              <div class="doc-item">
                <div class="doc-id">{{ j.id }}</div>
                <div class="doc-title">{{ j.title }}</div>
                <a-tag
                  size="small"
                  :type="j.status === 'accepted' ? 'success' : 'warning'"
                >
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
            <a-tag v-if="job" :type="job.status === 'accepted' ? 'success' : 'warning'">
              {{ job.status === 'accepted' ? '已验收' : '进行中' }}
            </a-tag>
          </div>

          <a-steps :current="activeStepIndex" align-center class="steps">
            <a-step
              v-for="s in ACCEPT_STEPS"
              :key="s.key"
              :title="s.label"
              :description="s.desc"
              :status="stepStatus(s.key) === 'success' ? 'success' : undefined"
            />
          </a-steps>

          <ProgressMock :running="advancing" label="步骤处理中…" :duration="700" />

          <a-card class="step-card" v-if="job">
            <h3>{{ currentStepMeta.label }}</h3>
            <p class="desc">{{ currentStepMeta.desc }}</p>

            <ul class="checklist">
              <li v-for="s in ACCEPT_STEPS" :key="s.key">
                <span v-if="job.stepDone.includes(s.key)" color="#52c41a"><Select /></span>
                <span v-else-if="job.step === s.key" color="#1677ff"><Loading /></span>
                <span v-else color="#d1d5db"><Clock /></span>
                <span :class="{ done: job.stepDone.includes(s.key), current: job.step === s.key }">
                  {{ s.label }}
                </span>
              </li>
            </ul>

            <div v-if="job.step === 'confirm'" class="hint">
              请确认预标注结果与业务样例一致，确认后进入人工精标。
            </div>
            <div v-else-if="job.step === 'annotate'" class="hint">
              请在「文本预标 / 视觉预标」页完成人工修正后，回到本向导继续。
              <div class="links">
                <a-button  type="text" @click="router.push('/prelabel/text')">打开文本预标</a-button>
                <a-button  type="text" @click="router.push('/prelabel/vision')">打开视觉预标</a-button>
              </div>
            </div>
            <div v-else-if="job.step === 'qa'" class="hint">
              <div class="label">质检意见</div>
              <a-textarea
                v-model="qaNote"
                
                :rows="3"
                placeholder="例如：实体类型已修正，关系抽取合格，允许验收"
              />
            </div>
            <div v-else class="hint">
              <a-alert
                :type="canFinalAccept ? 'success' : 'warning'"
                :closable="false"
                :title="
                  canFinalAccept
                    ? `当前角色「${auth.role}」可执行最终验收`
                    : '当前为标注员，请切换审核员/管理员后验收'
                "
              />
            </div>

            <div class="footer">
              <a-button
                type="primary"
                :loading="advancing"
                :disabled="job.status === 'accepted'"
                @click="onAdvance"
              >
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
