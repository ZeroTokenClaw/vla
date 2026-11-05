<script setup>
import { Message } from '@/ui/discrete'
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
    Message.error(e.message)
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
    Message.warning('批注不能为空')
    return
  }
  busy.value = true
  try {
    await addComment(task.value.id, commentBody.value)
    commentBody.value = ''
    Message.success('批注已写入')
    await loadTask(task.value.id)
  } catch (e) {
    Message.error(e.message)
  } finally {
    busy.value = false
  }
}

async function doPassInitial() {
  if (!canReview.value) {
    Message.warning('标注员不可推进终审')
    return
  }
  busy.value = true
  try {
    await transition(task.value.id, 'final_review', '初审通过')
    Message.success('初审通过，进入终审')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    Message.error(e.message)
  } finally {
    busy.value = false
  }
}

async function doPassFinal() {
  if (!canReview.value) {
    Message.warning('标注员无权终审通过')
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
    Message.success('终审通过')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    Message.error(e.message)
  } finally {
    busy.value = false
  }
}

async function doReject() {
  if (!canReview.value) {
    Message.warning('标注员无权驳回')
    return
  }
  if (!rejectReason.value) {
    Message.warning('请选择驳回原因')
    return
  }
  busy.value = true
  try {
    await transition(task.value.id, 'rejected', rejectNote.value, {
      rejectReason: rejectReason.value,
    })
    Message.success('已驳回返修')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    Message.error(e.message)
  } finally {
    busy.value = false
  }
}

async function resumeAnnotate() {
  busy.value = true
  try {
    await transition(task.value.id, 'annotating', '驳回后重标')
    Message.success('已回到标注中')
    await loadTask(task.value.id)
    await loadList()
  } catch (e) {
    Message.error(e.message)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="audit">
    <a-alert
      type="warning"
      :closable="false"
      show-icon
      class="tip"
      :title="`多级审核闭环：初审 / 终审。当前身份 ${copy.roles[auth.role]} — ${isAnnotator ? '不可终审通过或驳回' : '可执行通过/驳回'}`"
    />

    <div class="toolbar">
      <a-select :model-value="currentId" filterable style="width: 360px" @change="switchTask">
        <a-option
          v-for="t in tasks"
          :key="t.id"
          :label="`${t.id} · ${getStatusMeta(t.status)?.label} · ${t.title}`"
          :value="t.id"
        />
      </a-select>
    </div>

    <ProgressMock :running="busy" label="审核操作处理中" />

    <a-row v-if="task" :gutter="12">
      <a-col :span="14">
        <a-card>
          <template #title>
            <div class="hd">
              <span>{{ task.id }} · {{ task.title }}</span>
              <a-tag :type="getStatusMeta(task.status)?.color || 'info'">
                {{ getStatusMeta(task.status)?.label }}
              </a-tag>
            </div>
          </template>
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="模态">
              {{ getModalityMeta(task.modality)?.label }}
            </a-descriptions-item>
            <a-descriptions-item label="批次">{{ task.batchId }}</a-descriptions-item>
            <a-descriptions-item label="进度">
              {{ task.doneCount }}/{{ task.sampleCount }}
            </a-descriptions-item>
            <a-descriptions-item label="驳回原因">
              {{
                task.rejectReason
                  ? REJECT_REASONS.find((r) => r.value === task.rejectReason)?.label
                  : '—'
              }}
            </a-descriptions-item>
            <a-descriptions-item label="协作人" :span="2">
              {{ task.collaborators?.join('、') }}
            </a-descriptions-item>
          </a-descriptions>

          <h4>流转时间线</h4>
          <a-timeline>
            <a-timeline-item
              v-for="(h, i) in task.history"
              :key="i"
              :label="h.at"
            >
              <strong>{{ h.action }}</strong>
              <span class="muted"> · {{ h.actor }}</span>
              <div v-if="h.note" class="note">{{ h.note }}</div>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </a-col>

      <a-col :span="10">
        <a-card class="mb">
          <template #title>批注线程（多人协作）</template>
          <div v-for="c in task.comments" :key="c.id" class="comment">
            <div class="c-head">
              <strong>{{ c.authorName }}</strong>
              <span class="muted">{{ c.at }}</span>
            </div>
            <div>{{ c.body }}</div>
          </div>
          <a-empty v-if="!task.comments?.length" description="暂无批注" />
          <a-textarea
            v-model="commentBody"
            
            :rows="3"
            placeholder="写下批注…"
            class="mt"
          />
          <a-button class="mt" type="primary" size="small" :loading="busy" @click="postComment">
            发送批注
          </a-button>
        </a-card>

        <a-card>
          <template #title>审核操作</template>
          <div class="ops">
            <a-button
              status="success"
              :disabled="task.status !== 'reviewing' || !canReview"
              @click="doPassInitial"
            >
              初审通过
            </a-button>
            <a-button
              type="primary"
              :disabled="task.status !== 'final_review' || !canReview"
              @click="doPassFinal"
            >
              终审通过
            </a-button>
            <a-button
              status="warning"
              :disabled="task.status !== 'rejected'"
              @click="resumeAnnotate"
            >
              驳回后重标
            </a-button>
          </div>
          <a-divider />
          <a-form label-position="top" size="small">
            <a-form-item label="驳回原因（必填）">
              <a-select v-model="rejectReason" style="width: 100%" :disabled="!canReview">
                <a-option
                  v-for="r in REJECT_REASONS"
                  :key="r.value"
                  :label="r.label"
                  :value="r.value"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="说明">
              <a-textarea v-model="rejectNote"  :rows="2" :disabled="!canReview" />
            </a-form-item>
            <a-button
              type="primary" status="danger"
              :disabled="!(task.status === 'reviewing' || task.status === 'final_review') || !canReview"
              @click="doReject"
            >
              驳回返修
            </a-button>
          </a-form>
          <p v-if="isAnnotator" class="warn">当前为标注员：不可终审通过或驳回（演示权限）。</p>
        </a-card>
      </a-col>
    </a-row>
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
