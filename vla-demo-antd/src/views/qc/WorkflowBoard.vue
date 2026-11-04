<script setup>import { notification, Modal } from 'ant-design-vue'

import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  listQcTasks,
  transition,
  assignTask,
  addComment,
  listMeta,
  getModalityMeta,
  getStatusMeta,
  STATUS_FLOW,
  REJECT_REASONS,
} from '@/services/qc'
import { useAuthStore } from '@/stores/auth'
import ProgressMock from '@/components/ProgressMock.vue'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const busy = ref(false)
const tasks = ref([])
const meta = reactive({ users: [] })

const columns = computed(() =>
  STATUS_FLOW.filter((s) => s.value !== 'done').concat(STATUS_FLOW.filter((s) => s.value === 'done')),
)

const grouped = computed(() => {
  const map = {}
  for (const c of columns.value) map[c.value] = []
  for (const t of tasks.value) {
    if (!map[t.status]) map[t.status] = []
    map[t.status].push(t)
  }
  return map
})

const commentVisible = ref(false)
const commentTask = ref(null)
const commentBody = ref('')

const rejectVisible = ref(false)
const rejectTask = ref(null)
const rejectReason = ref('')
const rejectNote = ref('')

async function load() {
  loading.value = true
  try {
    Object.assign(meta, listMeta())
    tasks.value = await listQcTasks()
  } finally {
    loading.value = false
  }
}

onMounted(load)

function userName(id) {
  return meta.users.find((u) => u.id === id)?.name || '未分配'
}

function openComment(t) {
  commentTask.value = t
  commentBody.value = ''
  commentVisible.value = true
}

async function submitComment() {
  if (!commentBody.value.trim()) {
    notification.warning({ message: '请输入批注', placement: 'topRight' })
    return
  }
  busy.value = true
  try {
    await addComment(commentTask.value.id, commentBody.value)
    notification.success({ message: '批注已添加', placement: 'topRight' })
    commentVisible.value = false
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    busy.value = false
  }
}

async function quickStart(t) {
  busy.value = true
  try {
    if (t.status === 'created') {
      const ann = meta.users.find((u) => u.role === 'annotator')
      if (ann) await assignTask(t.id, ann.id)
    }
    if (t.status === 'assigned' || t.status === 'created') {
      await transition(t.id, t.status === 'created' ? 'assigned' : 'annotating')
      if (t.status === 'assigned' || findStatus(t.id) === 'assigned') {
        // after assign may need second hop — reload then start
      }
    }
    const latest = (await listQcTasks()).find((x) => x.id === t.id)
    if (latest?.status === 'assigned') await transition(latest.id, 'annotating', '开始标注')
    if (latest?.status === 'rejected') await transition(latest.id, 'annotating', '驳回后重标')
    notification.success({ message: '已更新状态', placement: 'topRight' })
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    busy.value = false
  }
}

function findStatus(id) {
  return tasks.value.find((t) => t.id === id)?.status
}

async function submitReview(t) {
  busy.value = true
  try {
    if (t.status === 'assigned') await transition(t.id, 'annotating')
    const cur = (await listQcTasks()).find((x) => x.id === t.id) || t
    if (cur.status === 'annotating') await transition(cur.id, 'reviewing', '提交初审')
    notification.success({ message: '已提交初审', placement: 'topRight' })
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    busy.value = false
  }
}

function openReject(t) {
  if (auth.role === 'annotator') {
    notification.warning({ message: '标注员无权驳回', placement: 'topRight' })
    return
  }
  rejectTask.value = t
  rejectReason.value = 'label_miss'
  rejectNote.value = ''
  rejectVisible.value = true
}

async function confirmReject() {
  if (!rejectReason.value) {
    notification.warning({ message: '请选择驳回原因', placement: 'topRight' })
    return
  }
  busy.value = true
  try {
    await transition(rejectTask.value.id, 'rejected', rejectNote.value, {
      rejectReason: rejectReason.value,
    })
    notification.success({ message: '已驳回，等待返修', placement: 'topRight' })
    rejectVisible.value = false
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    busy.value = false
  }
}

async function passInitial(t) {
  if (auth.role === 'annotator') {
    notification.warning({ message: '标注员无权推进终审', placement: 'topRight' })
    return
  }
  busy.value = true
  try {
    await transition(t.id, 'final_review', '初审通过')
    notification.success({ message: '已进入终审', placement: 'topRight' })
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    busy.value = false
  }
}

async function passFinal(t) {
  if (auth.role === 'annotator') {
    notification.warning({ message: '标注员无权终审通过', placement: 'topRight' })
    return
  }
  try {
    await new Promise((resolve, reject) => Modal.confirm({ title: '终审确认', content: `确认终审通过工单 ${t.id}？`, onOk: () => resolve(true), onCancel: () => reject('cancel') }))
  } catch {
    return
  }
  busy.value = true
  try {
    await transition(t.id, 'done', '终审通过，写入回流库候选')
    notification.success({ message: '终审通过', placement: 'topRight' })
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    busy.value = false
  }
}

function goAudit(id) {
  router.push(`/qc/audit/${id}`)
}

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}
</script>

<template>
  <div :loading="loading">
    <a-alert
      class="tip"
      type="success"
      :closable="false"
      show-icon
      message="协作看板：创建 → 分配 → 标注 → 初审 → 终审 → 完成；驳回回到标注中。批注支持多人协作痕迹。" />
    <ProgressMock :running="busy" label="状态流转处理中" />
    <div class="board">
      <div v-for="col in columns" :key="col.value" class="col">
        <div class="col-head">
          <a-tag :color="mapTagColor(col.color || 'info')" size="small">{{ col.label }}</a-tag>
          <span class="count">{{ grouped[col.value]?.length || 0 }}</span>
        </div>
        <div
          v-for="t in grouped[col.value]"
          :key="t.id"
          class="card">
          <div class="id">{{ t.id }}</div>
          <div class="title">{{ t.title }}</div>
          <div class="meta">
            <span>{{ getModalityMeta(t.modality)?.short }}</span>
            <span>{{ userName(t.assigneeId) }}</span>
          </div>
          <div class="collab">协作 {{ t.collaborators?.length || 0 }} 人 · 批注 {{ t.comments?.length || 0 }}</div>
          <div class="ops">
            <a-button  type="link" size="small" @click="openComment(t)">批注</a-button>
            <a-button  type="link" size="small" @click="goAudit(t.id)">详情</a-button>
            <a-button
              v-if="t.status === 'created' || t.status === 'assigned' || t.status === 'rejected'"
              
              type="link"
              size="small"
              @click="quickStart(t)">
              开工
            </a-button>
            <a-button
              v-if="t.status === 'annotating'"
              
              type="link"
              size="small"
              @click="submitReview(t)">
              交初审
            </a-button>
            <a-button
              v-if="t.status === 'reviewing'"
              
              type="success"
              size="small"
              @click="passInitial(t)">
              初审过
            </a-button>
            <a-button
              v-if="t.status === 'reviewing' || t.status === 'final_review'"
              
              type="link" danger
              size="small"
              @click="openReject(t)">
              驳回
            </a-button>
            <a-button
              v-if="t.status === 'final_review'"
              
              type="success"
              size="small"
              @click="passFinal(t)">
              终审过
            </a-button>
          </div>
        </div>
        <a-empty v-if="!(grouped[col.value]?.length)"  description="暂无工单" />
      </div>
    </div>

    <a-modal v-model:open="commentVisible" title="添加批注" width="440px">
      <p class="hint">{{ commentTask?.id }} · 当前可多人协作留言</p>
      <a-textarea v-model:value="commentBody"  :rows="4" placeholder="填写批注内容" />
      <template #footer>
        <a-button @click="commentVisible = false">取消</a-button>
        <a-button type="primary" :loading="busy" @click="submitComment">提交批注</a-button>
      </template>
    </a-modal>

    <a-modal v-model:open="rejectVisible" title="驳回返修" width="460px">
      <a-form :label-col="{ style: { width: '90px' } }">
        <a-form-item label="驳回原因" required>
          <a-select v-model:value="rejectReason" style="width: 100%">
            <a-select-option v-for="r in REJECT_REASONS" :key="r.value" :value="r.value">{{ r.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="rejectNote"  :rows="3" placeholder="补充说明（可选）" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="rejectVisible = false">取消</a-button>
        <a-button danger :loading="busy" @click="confirmReject">确认驳回</a-button>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 12px;
}
.board {
  display: grid;
  grid-template-columns: repeat(7, minmax(160px, 1fr));
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.col {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 8px;
  min-height: 420px;
}
.col-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.count {
  font-size: 12px;
  color: #6b7280;
}
.card {
  background: #fff;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid #e5e7eb;
}
.id {
  font-size: 11px;
  color: #6b7280;
}
.title {
  font-size: 13px;
  font-weight: 600;
  margin: 4px 0;
}
.meta,
.collab {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  justify-content: space-between;
}
.collab {
  margin-top: 4px;
}
.ops {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}
.hint {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 8px;
}
</style>
