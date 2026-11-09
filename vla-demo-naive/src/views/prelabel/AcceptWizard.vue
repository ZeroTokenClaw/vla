<script setup>
import { message } from '@/ui/discrete'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NTag } from 'naive-ui'
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
const compareRows = ref([])
const checklist = reactive({
  schemaOk: true,
  noLeak: true,
  confGate: true,
  modalityLink: false,
  spotPass: false,
  signOff: false,
})

const currentId = computed(() => route.params.id)

function buildCompare(jobRow) {
  if (!jobRow) return []
  if (jobRow.sourceType === 'vision') {
    return [
      { field: 'OCR 文本「托盘」', model: '托盘', human: '托盘', conf: 0.91, status: '一致', rule: 'OCR-文本一致' },
      { field: 'OCR 文本「箱号」', model: 'B0X-11', human: 'BOX-11', conf: 0.62, status: '已修正', rule: 'OCR-错字修正' },
      { field: 'OCR 「PLATE」', model: 'PLATE-8', human: 'PLATE-B', conf: 0.63, status: '已修正', rule: 'OCR-易混字符' },
      { field: 'YOLO cup', model: 'cup@0.88', human: 'cup', conf: 0.88, status: '一致', rule: '检测-类别一致' },
      { field: 'YOLO hand', model: 'tool@0.41', human: 'hand', conf: 0.41, status: '已修正', rule: '检测-误检纠偏' },
      { field: '分割区域 mask#2', model: 'object', human: 'gripper', conf: 0.55, status: '已修正', rule: '分割-语义对齐' },
      { field: '低置信框 y7', model: 'other@0.33', human: '（已删除）', conf: 0.33, status: '人工删除', rule: '低置信丢弃' },
    ]
  }
  return [
    { field: '文本分类', model: '投诉-物流延误', human: '投诉-包裹破损', conf: 0.81, status: '已修正', rule: '分类-业务口径' },
    { field: '实体 ADDRESS', model: 'ORG', human: 'ADDRESS', conf: 0.72, status: '已修正', rule: 'NER-类型纠偏' },
    { field: '关系 ORDER→ADDR', model: 'SHIPS_TO', human: 'RETURN_TO', conf: 0.61, status: '已修正', rule: 'RE-关系纠偏' },
    { field: '实体 PERSON', model: 'PERSON', human: 'PERSON', conf: 0.94, status: '一致', rule: 'NER-高置信' },
    { field: '实体 PHONE', model: 'PHONE', human: 'PHONE', conf: 0.96, status: '一致', rule: 'NER-高置信' },
    { field: '结构化 amount', model: '128.0', human: '128.00', conf: 0.9, status: '一致', rule: '字段-金额格式' },
  ]
}

function defaultChecklist(jobRow) {
  const vision = jobRow?.sourceType === 'vision'
  return {
    schemaOk: true,
    noLeak: true,
    confGate: true,
    modalityLink: vision,
    spotPass: jobRow?.stepDone?.includes('qa') || false,
    signOff: jobRow?.status === 'accepted',
  }
}

const activeStepIndex = computed(() => {
  if (!job.value) return 0
  return ACCEPT_STEPS.findIndex((s) => s.key === job.value.step)
})

const canFinalAccept = computed(() => ['reviewer', 'admin'].includes(auth.role))
const currentStepMeta = computed(() => ACCEPT_STEPS[activeStepIndex.value] || ACCEPT_STEPS[0])
const diffSummary = computed(() => {
  const ok = compareRows.value.filter((r) => r.status === '一致').length
  const fixed = compareRows.value.filter((r) => r.status === '已修正').length
  const removed = compareRows.value.filter((r) => r.status === '人工删除').length
  return { ok, fixed, removed, total: compareRows.value.length }
})

const checklistScore = computed(() => {
  const keys = Object.keys(checklist)
  const done = keys.filter((k) => checklist[k]).length
  return { done, total: keys.length, pct: Math.round((done / keys.length) * 100) }
})

const canAdvance = computed(() => {
  if (!job.value || job.value.status === 'accepted') return false
  if (job.value.step === 'qa' && !qaNote.value.trim()) return false
  if (job.value.step === 'accept') {
    if (!canFinalAccept.value) return false
    if (!checklist.schemaOk || !checklist.noLeak || !checklist.confGate) return false
    if (!checklist.spotPass || !checklist.signOff) return false
  }
  return true
})

const diffColumns = [
  { title: '字段', key: 'field', width: 150 },
  { title: '规则', key: 'rule', width: 120, ellipsis: { tooltip: true } },
  { title: '模型结果', key: 'model', ellipsis: { tooltip: true } },
  { title: '人工最终', key: 'human', ellipsis: { tooltip: true } },
  {
    title: '置信度',
    key: 'conf',
    width: 80,
    render: (r) => `${(r.conf * 100).toFixed(0)}%`,
  },
  {
    title: '对照',
    key: 'status',
    width: 90,
    render: (r) =>
      h(
        NTag,
        {
          size: 'small',
          type:
            r.status === '一致'
              ? 'success'
              : r.status === '人工删除'
                ? 'error'
                : 'warning',
          bordered: false,
        },
        { default: () => r.status },
      ),
  },
]

const acceptPacket = computed(() => {
  if (!job.value) return {}
  return {
    accept_id: job.value.id,
    source_type: job.value.sourceType,
    source_id: job.value.sourceId,
    step: job.value.step,
    status: job.value.status,
    qa_note: qaNote.value,
    checklist: { ...checklist },
    diff_summary: diffSummary.value,
    role: auth.role,
    generated_at: new Date().toISOString(),
  }
})

async function loadList() {
  jobs.value = (await listAcceptJobs({ page: 1, pageSize: 200 })).items
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
    compareRows.value = buildCompare(job.value)
    Object.assign(checklist, defaultChecklist(job.value))
  } catch (e) {
    message.error(e.message || '加载失败')
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
    message.info('该任务已验收完成')
    return
  }
  if (job.value.step === 'accept' && !canFinalAccept.value) {
    message.warning('请切换为审核员或管理员后再最终验收')
    return
  }
  if (job.value.step === 'qa' && !qaNote.value.trim()) {
    message.warning('请填写质检意见后再继续')
    return
  }
  if (job.value.step === 'accept' && !canAdvance.value) {
    message.warning('请勾齐验收清单（含抽检通过与签收）')
    return
  }
  const stepLabel = currentStepMeta.value.label
  advancing.value = true
  try {
    job.value = await advanceAcceptStep(job.value.id, {
      qaNote: job.value.step === 'qa' ? qaNote.value : undefined,
    })
    if (job.value.status === 'accepted') message.success('结果验收通过，已入库')
    else message.success(`已完成「${stepLabel}」，进入下一步`)
    compareRows.value = buildCompare(job.value)
    Object.assign(checklist, defaultChecklist(job.value))
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    advancing.value = false
  }
}

function stepStatus(key) {
  if (!job.value) return 'wait'
  if (job.value.stepDone.includes(key)) return 'finish'
  if (job.value.step === key) return 'process'
  return 'wait'
}

function openSource() {
  if (!job.value) return
  if (job.value.sourceType === 'vision') router.push(`/prelabel/vision/${job.value.sourceId}`)
  else router.push(`/prelabel/text/${job.value.sourceId}`)
}
</script>

<template>
  <div class="accept-wiz">
    <n-grid cols="24" :x-gap="12" :y-gap="12">
      <n-gi :span="6">
        <n-card class="side" :bordered="false">
          <template #header>
            <div class="card-h">验收任务（{{ jobs.length }}）</div>
          </template>
          <div
            v-for="j in jobs"
            :key="j.id"
            class="job-item"
            :class="{ on: j.id === currentId }"
            @click="switchJob(j.id)"
          >
            <div class="doc-id">{{ j.id }}</div>
            <div class="doc-title">{{ j.title }}</div>
            <n-space :size="4">
              <n-tag size="tiny" :bordered="false">{{ j.sourceType }}</n-tag>
              <n-tag size="tiny" :type="j.status === 'accepted' ? 'success' : 'warning'" :bordered="false">
                {{ j.status === 'accepted' ? '已验收' : j.step }}
              </n-tag>
            </n-space>
          </div>
        </n-card>
      </n-gi>

      <n-gi :span="18">
        <n-spin :show="loading">
          <n-card :bordered="false">
            <div class="toolbar">
              <div>
                <div class="title">{{ job?.title || '选择验收任务' }}</div>
                <div v-if="job" class="meta">
                  来源 {{ job.sourceType }} / {{ job.sourceId }}
                  <template v-if="job.acceptedAt"> · 验收人 {{ job.acceptedBy }} · {{ job.acceptedAt }}</template>
                </div>
              </div>
              <n-space>
                <n-button size="small" secondary :disabled="!job" @click="openSource">打开源样例</n-button>
                <n-tag v-if="job" :type="job.status === 'accepted' ? 'success' : 'warning'" :bordered="false">
                  {{ job.status === 'accepted' ? '已验收' : '进行中' }}
                </n-tag>
              </n-space>
            </div>

            <n-steps :current="activeStepIndex + 1" class="steps">
              <n-step
                v-for="s in ACCEPT_STEPS"
                :key="s.key"
                :title="s.label"
                :description="s.desc"
                :status="stepStatus(s.key)"
              />
            </n-steps>

            <ProgressMock :running="advancing" label="步骤处理中…" :duration="700" />

            <n-grid v-if="job" cols="24" :x-gap="12" :y-gap="12">
              <n-gi :span="16">
                <n-card class="step-card" size="small" :bordered="false">
                  <h3>{{ currentStepMeta.label }}</h3>
                  <p class="desc">{{ currentStepMeta.desc }}</p>

                  <div v-if="job.step === 'confirm'" class="hint">
                    <n-alert type="info" :bordered="false" class="mb">
                      请核对模型预标与人工终态 Diff。一致率建议 ≥ 60% 后再进入精标（演示阈值）。
                      当前一致 {{ diffSummary.ok }} / 修正 {{ diffSummary.fixed }} / 删除
                      {{ diffSummary.removed }} / 共 {{ diffSummary.total }}
                    </n-alert>
                    <n-data-table size="small" :data="compareRows" :columns="diffColumns" :bordered="false" />
                  </div>

                  <div v-else-if="job.step === 'annotate'" class="hint">
                    <n-alert type="warning" :bordered="false" class="mb">
                      请在预标页完成漏标补标、错标修正，再回到本向导继续。下方 Diff 为当前对照快照。
                    </n-alert>
                    <n-space class="mb">
                      <n-button type="primary" secondary @click="router.push('/prelabel/text')">打开文本预标</n-button>
                      <n-button type="primary" secondary @click="router.push('/prelabel/vision')">打开视觉预标</n-button>
                      <n-button quaternary @click="openSource">打开本任务源样例</n-button>
                    </n-space>
                    <n-data-table size="small" :data="compareRows" :columns="diffColumns" :bordered="false" />
                  </div>

                  <div v-else-if="job.step === 'qa'" class="hint">
                    <div class="label">质检意见（必填）</div>
                    <n-input
                      v-model:value="qaNote"
                      type="textarea"
                      :rows="4"
                      placeholder="例如：实体类型已修正，关系抽取合格；OCR 易混字符已纠正；允许进入终验"
                    />
                    <n-space class="mt" vertical>
                      <n-checkbox v-model:checked="checklist.spotPass">抽检关键字段通过（演示勾选）</n-checkbox>
                      <n-checkbox v-model:checked="checklist.confGate">低置信项均已人工复核</n-checkbox>
                    </n-space>
                    <p class="qa-sum">
                      Diff 摘要：一致 {{ diffSummary.ok }} / 已修正 {{ diffSummary.fixed }} / 删除
                      {{ diffSummary.removed }} / 共 {{ diffSummary.total }}
                    </p>
                  </div>

                  <div v-else class="hint">
                    <n-alert
                      :type="canFinalAccept ? 'success' : 'warning'"
                      :bordered="false"
                      class="mb"
                      :title="
                        canFinalAccept
                          ? `当前角色「${auth.role}」可执行最终验收`
                          : '当前为标注员，请切换审核员/管理员后验收'
                      "
                    />
                    <n-data-table size="small" :data="compareRows" :columns="diffColumns" :bordered="false" />
                  </div>

                  <div class="footer">
                    <n-button
                      type="primary"
                      :loading="advancing"
                      :disabled="job.status === 'accepted' || (job.step === 'accept' && !canAdvance)"
                      @click="onAdvance"
                    >
                      {{ job.step === 'accept' ? '确认验收通过' : '完成本步并继续' }}
                    </n-button>
                  </div>
                </n-card>
              </n-gi>

              <n-gi :span="8">
                <n-card size="small" :bordered="false" class="side-panel">
                  <template #header>
                    <div class="card-h">
                      验收清单
                      <n-tag size="tiny" :bordered="false" type="info">{{ checklistScore.pct }}%</n-tag>
                    </div>
                  </template>
                  <n-progress
                    type="line"
                    :percentage="checklistScore.pct"
                    :indicator-placement="'inside'"
                    processing
                    class="mb"
                  />
                  <n-space vertical>
                    <n-checkbox v-model:checked="checklist.schemaOk">Schema / 字段契约合规</n-checkbox>
                    <n-checkbox v-model:checked="checklist.noLeak">无隐私字段外泄</n-checkbox>
                    <n-checkbox v-model:checked="checklist.confGate">低置信门禁已复核</n-checkbox>
                    <n-checkbox v-model:checked="checklist.modalityLink">多模态联动（视觉任务）</n-checkbox>
                    <n-checkbox v-model:checked="checklist.spotPass">抽检通过</n-checkbox>
                    <n-checkbox v-model:checked="checklist.signOff" :disabled="!canFinalAccept">
                      审核员签收
                    </n-checkbox>
                  </n-space>
                  <n-divider />
                  <div class="label">验收包预览</div>
                  <pre class="json">{{ JSON.stringify(acceptPacket, null, 2) }}</pre>
                </n-card>
              </n-gi>
            </n-grid>
          </n-card>
        </n-spin>
      </n-gi>
    </n-grid>
  </div>
</template>

<style scoped>
.side { min-height: 560px; background: #14141c; }
.card-h { font-weight: 600; display: flex; align-items: center; gap: 8px; }
.job-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 6px;
}
.job-item:hover { background: #1a1a22; }
.job-item.on { background: #163528; border-color: #18a058; }
.doc-id { font-size: 11px; color: #6b7280; }
.doc-title { font-size: 13px; margin: 2px 0 4px; color: #e8e8ed; }
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.title { font-size: 16px; font-weight: 600; color: #e8e8ed; }
.meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
.steps { margin: 8px 0 20px; }
.step-card, .side-panel { background: #101018; }
.step-card h3 { margin: 0 0 6px; color: #e8e8ed; }
.desc { margin: 0 0 12px; color: #6b7280; font-size: 13px; }
.hint { color: #c8c8d4; font-size: 13px; }
.label { margin-bottom: 6px; color: #8b8b9a; font-size: 12px; }
.mt { margin-top: 12px; }
.mb { margin-bottom: 12px; }
.qa-sum { margin: 8px 0 0; font-size: 12px; color: #8b8b9a; }
.footer { margin-top: 16px; }
.json {
  background: #0b0b0f;
  border: 1px solid #2a2a36;
  border-radius: 6px;
  padding: 8px;
  max-height: 280px;
  overflow: auto;
  font-size: 11px;
  color: #c8c8d0;
}
:deep(.n-card) { background: #14141c; }
</style>
