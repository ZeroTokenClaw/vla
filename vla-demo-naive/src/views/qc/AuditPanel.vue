<script setup>
import { message } from '@/ui/discrete'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const currentId = computed(() => route.params.id)

const canReview = computed(() => auth.role === 'reviewer' || auth.role === 'admin')
const isAnnotator = computed(() => auth.role === 'annotator')

async function loadList() {
  tasks.value = await listQcTasks()
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
  busy.value = true
  try {
    await transition(task.value.id, 'final_review', '初审通过')
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
  try {
    (window.confirm(String('确认终审通过？通过后工单完成。')) || Promise.reject('cancel'))
  } catch {
    return
  }
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
      <n-select :model-value="currentId" filterable style="width: 360px" @change="switchTask" :options="tasks.map(t => ({ label: `${t.id} · ${getStatusMeta(t.status)?.label} · ${t.title}`, value: t.id }))"></n-select>
    </div>

    <ProgressMock :running="busy" label="审核操作处理中" />

    <n-grid cols="24"  v-if="task" x-gap="12" y-gap="12">
      <n-gi :span="14">
        <n-card>
          <template #header>
            <div class="hd">
              <span>{{ task.id }} · {{ task.title }}</span>
              <n-tag :type="getStatusMeta(task.status)?.color || 'info'">
                {{ getStatusMeta(task.status)?.label }}
              </n-tag>
            </div>
          </template>
          <n-descriptions :column="2" bordered size="small">
            <n-descriptions-item label="模态">
              {{ getModalityMeta(task.modality)?.label }}
            </n-descriptions-item>
            <n-descriptions-item label="批次">{{ task.batchId }}</n-descriptions-item>
            <n-descriptions-item label="进度">
              {{ task.doneCount }}/{{ task.sampleCount }}
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

          <h4>流转时间线</h4>
          <n-timeline>
            <n-timeline-item
              v-for="(h, i) in task.history"
              :key="i"
              :timestamp="h.at"
              placement="top"
            >
              <strong>{{ h.action }}</strong>
              <span class="muted"> · {{ h.actor }}</span>
              <div v-if="h.note" class="note">{{ h.note }}</div>
            </n-timeline-item>
          </n-timeline>
        </n-card>
      </n-gi>

      <n-gi :span="10">
        <n-card class="mb">
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
            v-model="commentBody"
            type="textarea"
            :rows="3"
            placeholder="写下批注…"
            class="mt"
          />
          <n-button class="mt" type="primary" size="small" :loading="busy" @click="postComment">
            发送批注
          </n-button>
        </n-card>

        <n-card>
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
          <n-form label-position="top" size="small">
            <n-form-item label="驳回原因（必填）">
              <n-select v-model="rejectReason" style="width: 100%" :disabled="!canReview" :options="REJECT_REASONS.map(r => ({ label: r.label, value: r.value }))"></n-select>
            </n-form-item>
            <n-form-item label="说明">
              <n-input v-model="rejectNote" type="textarea" :rows="2" :disabled="!canReview" />
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
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 12px;
}
.toolbar {
  margin-bottom: 12px;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.muted {
  color: #9ca3af;
  font-size: 12px;
}
.note {
  font-size: 13px;
  color: #4b5563;
  margin-top: 2px;
}
.comment {
  padding: 8px 0;
  border-bottom: 1px dashed #eee;
}
.c-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.mt {
  margin-top: 8px;
}
.mb {
  margin-bottom: 12px;
}
.ops {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.warn {
  margin-top: 10px;
  color: #d48806;
  font-size: 12px;
}
</style>
