<script setup>
import { message } from '@/ui/discrete'
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NTag } from 'naive-ui'
import {
  listQcTasks,
  getQcTask,
  transition,
  addComment,
  getStatusMeta,
  getModalityMeta,
  REJECT_REASONS,
} from '@/services/qc'
import { useAuthStore } from '@/stores/auth'
import { copy } from '@/i18n/copy'
import ProgressMock from '@/components/ProgressMock.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const busy = ref(false)
const tasks = ref([])
const task = ref(null)
const commentBody = ref('')
const rejectReason = ref('label_miss')
const rejectNote = ref('')
const spotVisible = ref(false)
const filterStatus = ref(null)

const spotChecks = reactive([
  { id: 's1', item: '关键实体/框完整', pass: true, note: '' },
  { id: 's2', item: '类别与规范一致', pass: true, note: '' },
  { id: 's3', item: '边界/起止帧偏差 ≤ 2 帧', pass: false, note: '第 3 段 endFrame 偏 +4' },
  { id: 's4', item: '脱敏字段无明文', pass: true, note: '' },
  { id: 's5', item: '协作批注已闭环', pass: true, note: '' },
])

const currentId = computed(() => route.params.id)
const canReview = computed(() => auth.role === 'reviewer' || auth.role === 'admin')
const isAnnotator = computed(() => auth.role === 'annotator')

const filteredTasks = computed(() => {
  if (!filterStatus.value) return tasks.value
  return tasks.value.filter((t) => t.status === filterStatus.value)
})

const spotScore = computed(() => {
  const pass = spotChecks.filter((s) => s.pass).length
  return { pass, total: spotChecks.length, pct: Math.round((pass / spotChecks.length) * 100) }
})

const defectBoard = computed(() => {
  if (!task.value) return []
  const reason = task.value.rejectReason
  return [
    { type: '漏标', count: reason === 'label_miss' ? 3 : 1, severity: '高' },
    { type: '错标', count: reason === 'label_wrong' ? 2 : 0, severity: '中' },
    { type: '边界偏差', count: reason === 'boundary_bad' ? 4 : 1, severity: '中' },
    { type: '规范违反', count: reason === 'spec_violate' ? 2 : 0, severity: '高' },
    { type: '样本质量', count: reason === 'sample_bad' ? 1 : 0, severity: '低' },
  ]
})

const defectColumns = [
  { title: '缺陷类型', key: 'type' },
  { title: '计数', key: 'count', width: 70 },
  {
    title: '严重度',
    key: 'severity',
    width: 80,
    render: (r) =>
      h(
        NTag,
        {
          size: 'tiny',
          bordered: false,
          type: r.severity === '高' ? 'error' : r.severity === '中' ? 'warning' : 'default',
        },
        { default: () => r.severity },
      ),
  },
]

const spotColumns = [
  { title: '抽检项', key: 'item' },
  {
    title: '结果',
    key: 'pass',
    width: 90,
    render: (r) =>
      h(NTag, { size: 'tiny', type: r.pass ? 'success' : 'error', bordered: false }, {
        default: () => (r.pass ? '通过' : '不通过'),
      }),
  },
  { title: '备注', key: 'note', ellipsis: { tooltip: true } },
]

const progressPct = computed(() => {
  if (!task.value?.sampleCount) return 0
  return Math.round((task.value.doneCount / task.value.sampleCount) * 100)
})

async function loadList() {
  tasks.value = (await listQcTasks({ page: 1, pageSize: 200 })).items
}

async function loadTask(id) {
  if (!id) {
    task.value = null
    return
  }
  loading.value = true
  try {
    task.value = await getQcTask(id)
  } catch (e) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadList()
  if (currentId.value) await loadTask(currentId.value)
  else {
    const prefer =
      tasks.value.find((t) => t.status === 'reviewing' || t.status === 'final_review') ||
      tasks.value[0]
    if (prefer) router.replace(`/qc/audit/${prefer.id}`)
  }
})

watch(currentId, (id) => {
  if (id) loadTask(id)
})

function switchTask(id) {
  router.push(`/qc/audit/${id}`)
}

async function postComment() {
  if (!commentBody.value.trim()) {
    message.warning('批注不能为空')
    return
  }
  busy.value = true
  try {
    await addComment(task.value.id, commentBody.value)
    commentBody.value = ''
    message.success('批注已写入')
    await loadTask(task.value.id)
  } catch (e) {
    message.error(e.message)
  } finally {
    busy.value = false
  }
}

async function doPassInitial() {
  if (!canReview.value) {
    message.warning('标注员不可推进终审')
    return
  }
  if (spotScore.value.pct < 60) {
    message.warning('抽检通过率偏低，建议先处理不通过项')
  }
  busy.value = true
  try {
    await transition(task.value.id, 'final_review', `初审通过 · 抽检 ${spotScore.value.pass}/${spotScore.value.total}`)
    message.success('初审通过，进入终审')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    busy.value = false
  }
}

async function doPassFinal() {
  if (!canReview.value) {
    message.warning('标注员无权终审通过')
    return
  }
  if (!window.confirm('确认终审通过？通过后工单完成。')) return
  busy.value = true
  try {
    await transition(task.value.id, 'done', '终审通过')
    message.success('终审通过')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    busy.value = false
  }
}

async function doReject() {
  if (!canReview.value) {
    message.warning('标注员无权驳回')
    return
  }
  if (!rejectReason.value) {
    message.warning('请选择驳回原因')
    return
  }
  busy.value = true
  try {
    await transition(task.value.id, 'rejected', rejectNote.value, {
      rejectReason: rejectReason.value,
    })
    message.success('已驳回返修')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    busy.value = false
  }
}

async function resumeAnnotate() {
  busy.value = true
  try {
    await transition(task.value.id, 'annotating', '驳回后重标')
    message.success('已回到标注中')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    message.error(e.message)
  } finally {
    busy.value = false
  }
}

function toggleSpot(row) {
  row.pass = !row.pass
  if (row.pass) row.note = ''
  else if (!row.note) row.note = '抽检发现问题（演示）'
}
</script>

<template>
  <div class="audit">
    <n-alert
      type="warning"
      :closable="false"
      show-icon
      class="tip"
      :title="`多级审核闭环：初审 / 终审。当前身份 ${copy.roles[auth.role]} — ${isAnnotator ? '不可终审通过或驳回' : '可执行通过/驳回'}`"
    />

    <div class="toolbar">
      <n-select
        :value="currentId"
        filterable
        style="width: 360px"
        :options="filteredTasks.map((t) => ({ label: `${t.id} · ${getStatusMeta(t.status)?.label} · ${t.title}`, value: t.id }))"
        @update:value="switchTask"
      />
      <n-select
        v-model:value="filterStatus"
        clearable
        placeholder="按状态筛选"
        style="width: 160px"
        :options="[
          { label: '初审中', value: 'reviewing' },
          { label: '终审中', value: 'final_review' },
          { label: '已驳回', value: 'rejected' },
          { label: '已完成', value: 'done' },
          { label: '标注中', value: 'annotating' },
        ]"
      />
      <n-button secondary @click="spotVisible = true">抽检清单</n-button>
      <n-button quaternary @click="router.push('/qc/sample-check')">抽检工作台</n-button>
    </div>

    <ProgressMock :running="busy" label="审核操作处理中" />

    <n-spin :show="loading">
      <n-grid v-if="task" cols="24" :x-gap="12" :y-gap="12">
        <n-gi :span="14">
          <n-card :bordered="false">
            <template #header>
              <div class="hd">
                <span>{{ task.id }} · {{ task.title }}</span>
                <n-tag :type="getStatusMeta(task.status)?.color || 'info'" :bordered="false">
                  {{ getStatusMeta(task.status)?.label }}
                </n-tag>
              </div>
            </template>
            <n-descriptions :column="2" bordered size="small" label-placement="left">
              <n-descriptions-item label="模态">
                {{ getModalityMeta(task.modality)?.label }}
              </n-descriptions-item>
              <n-descriptions-item label="批次">{{ task.batchId }}</n-descriptions-item>
              <n-descriptions-item label="进度">
                {{ task.doneCount }}/{{ task.sampleCount }}（{{ progressPct }}%）
              </n-descriptions-item>
              <n-descriptions-item label="驳回原因">
                {{
                  task.rejectReason
                    ? REJECT_REASONS.find((r) => r.value === task.rejectReason)?.label
                    : '—'
                }}
              </n-descriptions-item>
              <n-descriptions-item label="协作人" :span="2">
                {{ task.collaborators?.join('、') }}
              </n-descriptions-item>
            </n-descriptions>

            <n-progress type="line" :percentage="progressPct" class="mt" :indicator-placement="'inside'" />

            <div class="section">
              <div class="sec-h">
                <h4>缺陷看板（演示）</h4>
                <n-tag size="small" :bordered="false" type="error">
                  合计 {{ defectBoard.reduce((a, b) => a + b.count, 0) }}
                </n-tag>
              </div>
              <n-data-table size="small" :columns="defectColumns" :data="defectBoard" :bordered="false" />
            </div>

            <div class="section">
              <div class="sec-h">
                <h4>抽检快照</h4>
                <n-tag size="small" :type="spotScore.pct >= 80 ? 'success' : 'warning'" :bordered="false">
                  通过率 {{ spotScore.pct }}%
                </n-tag>
              </div>
              <n-data-table
                size="small"
                :columns="spotColumns"
                :data="spotChecks"
                :bordered="false"
                :row-props="(row) => ({ style: 'cursor:pointer', onClick: () => toggleSpot(row) })"
              />
              <p class="hint">点击行可切换通过/不通过（演示交互）。</p>
            </div>

            <h4>流转时间线</h4>
            <n-timeline>
              <n-timeline-item
                v-for="(hitem, i) in task.history"
                :key="i"
                :timestamp="hitem.at"
                placement="top"
              >
                <strong>{{ hitem.action }}</strong>
                <span class="muted"> · {{ hitem.actor }}</span>
                <div v-if="hitem.note" class="note">{{ hitem.note }}</div>
              </n-timeline-item>
            </n-timeline>
          </n-card>
        </n-gi>

        <n-gi :span="10">
          <n-card class="mb" :bordered="false">
            <template #header>批注线程（多人协作）</template>
            <div v-for="c in task.comments" :key="c.id" class="comment">
              <div class="c-head">
                <strong>{{ c.authorName }}</strong>
                <span class="muted">{{ c.at }}</span>
              </div>
              <div>{{ c.body }}</div>
            </div>
            <n-empty v-if="!task.comments?.length" description="暂无批注" />
            <n-input
              v-model:value="commentBody"
              type="textarea"
              :rows="3"
              placeholder="写下批注…例如：边界偏差需返修第 3 段"
              class="mt"
            />
            <n-button class="mt" type="primary" size="small" :loading="busy" @click="postComment">
              发送批注
            </n-button>
          </n-card>

          <n-card :bordered="false">
            <template #header>审核操作</template>
            <div class="ops">
              <n-button
                type="success"
                :disabled="task.status !== 'reviewing' || !canReview"
                @click="doPassInitial"
              >
                初审通过
              </n-button>
              <n-button
                type="primary"
                :disabled="task.status !== 'final_review' || !canReview"
                @click="doPassFinal"
              >
                终审通过
              </n-button>
              <n-button
                type="warning"
                :disabled="task.status !== 'rejected'"
                @click="resumeAnnotate"
              >
                驳回后重标
              </n-button>
            </div>
            <n-divider />
            <n-form label-placement="top" size="small">
              <n-form-item label="驳回原因（必填）">
                <n-select
                  v-model:value="rejectReason"
                  style="width: 100%"
                  :disabled="!canReview"
                  :options="REJECT_REASONS.map((r) => ({ label: r.label, value: r.value }))"
                />
              </n-form-item>
              <n-form-item label="说明">
                <n-input
                  v-model:value="rejectNote"
                  type="textarea"
                  :rows="2"
                  :disabled="!canReview"
                  placeholder="说明需返修的具体样本/字段"
                />
              </n-form-item>
              <n-button
                type="error"
                :disabled="!(task.status === 'reviewing' || task.status === 'final_review') || !canReview"
                @click="doReject"
              >
                驳回返修
              </n-button>
            </n-form>
            <p v-if="isAnnotator" class="warn">当前为标注员：不可终审通过或驳回（演示权限）。</p>
          </n-card>
        </n-gi>
      </n-grid>
    </n-spin>

    <n-drawer v-model:show="spotVisible" :width="480" placement="right">
      <n-drawer-content title="审核抽检清单" closable>
        <n-alert type="info" :bordered="false" class="mb">
          演示抽检项可点击切换。通过率 {{ spotScore.pct }}%（{{ spotScore.pass }}/{{ spotScore.total }}）
        </n-alert>
        <n-space vertical>
          <div v-for="s in spotChecks" :key="s.id" class="spot-row">
            <n-checkbox v-model:checked="s.pass">{{ s.item }}</n-checkbox>
            <n-input
              v-if="!s.pass"
              v-model:value="s.note"
              size="small"
              placeholder="不通过原因"
              class="mt"
            />
          </div>
        </n-space>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.tip { margin-bottom: 12px; }
.toolbar { margin-bottom: 12px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.hd { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.muted { color: #9ca3af; font-size: 12px; }
.note { font-size: 13px; color: #a0a0aa; margin-top: 2px; }
.comment { padding: 8px 0; border-bottom: 1px dashed #2a2a36; }
.c-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
.mt { margin-top: 8px; }
.mb { margin-bottom: 12px; }
.ops { display: flex; flex-wrap: wrap; gap: 8px; }
.warn { margin-top: 10px; color: #d48806; font-size: 12px; }
.section { margin: 16px 0; }
.sec-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.sec-h h4 { margin: 0; color: #e8e8ed; }
.hint { font-size: 12px; color: #6b7280; margin-top: 6px; }
.spot-row { padding: 8px 0; border-bottom: 1px solid #1f1f28; }
:deep(.n-card) { background: #14141c; }
</style>
