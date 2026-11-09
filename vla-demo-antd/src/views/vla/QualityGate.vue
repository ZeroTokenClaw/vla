<script setup>import { notification } from 'ant-design-vue'

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProgressMock from '@/components/ProgressMock.vue'
import {
  listVlaTasks,
  getVlaTask,
  detectIssues,
  markUnqualified,
  setFilterUnqualified,
  listMeta,
} from '@/services/vla'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detecting = ref(false)
const taskList = ref([])
const task = ref(null)
const summary = ref({})
const selected = ref([])
function onSelectChange(keys) {
  selected.value = keys
}

const filterOn = ref(false)
const meta = listMeta()

const taskId = computed(() => route.params.id || taskList.value[0]?.id || '')

const visibleIssues = computed(() => {
  if (!task.value) return []
  return task.value.issues.filter((i) => !i.filtered)
})

const issueTypeLabel = (key) => meta.issueTypes.find((t) => t.key === key)?.label || key
const issueTypeColor = (key) => meta.issueTypes.find((t) => t.key === key)?.color || 'info'

async function loadList() {
  taskList.value = (await listVlaTasks({ page: 1, pageSize: 200 })).items
}

async function loadTask(id) {
  if (!id) return
  loading.value = true
  try {
    task.value = await getVlaTask(id)
    filterOn.value = (task.value.filteredOut || []).length > 0
    summary.value = {}
    if (task.value.issuesDetected) {
      for (const t of meta.issueTypes) summary.value[t.key] = 0
      for (const i of task.value.issues) {
        summary.value[i.type] = (summary.value[i.type] || 0) + 1
      }
    }
    selected.value = []
  } catch (e) {
    notification.error({ message: e.message || '加载失败', placement: 'topRight' })
  } finally {
    loading.value = false
  }
}

function onSelectTask(id) {
  router.push(`/vla/quality/${id}`)
}

async function onDetect() {
  if (!task.value) return
  detecting.value = true
  try {
    const res = await detectIssues(task.value.id)
    task.value = await getVlaTask(task.value.id)
    summary.value = res.summary
    filterOn.value = false
    selected.value = []
    notification.success({ message: `检出 ${res.issues.length} 条问题（抖动/遮挡/模糊/缺失/不匹配）`, placement: 'topRight' })
  } catch (e) {
    notification.error({ message: e.message || '检测失败', placement: 'topRight' })
  } finally {
    detecting.value = false
  }
}

async function onMark() {
  if (!task.value) return
  if (!selected.value.length) return notification.warning({ message: '请先勾选要标记的问题样本', placement: 'topRight' })
  try {
    await markUnqualified(task.value.id, selected.value)
    task.value = await getVlaTask(task.value.id)
    notification.success({ message: `已标记 ${selected.value.length} 条不合格`, placement: 'topRight' })
  } catch (e) {
    notification.error({ message: e.message || '标记失败', placement: 'topRight' })
  }
}

async function onToggleFilter(val) {
  if (!task.value) return
  if (!task.value.issuesDetected) {
    filterOn.value = false
    return notification.warning({ message: '请先执行一键检测', placement: 'topRight' })
  }
  try {
    const res = await setFilterUnqualified(task.value.id, val)
    task.value = await getVlaTask(task.value.id)
    notification.success({ message: val ? `已过滤隐藏 ${res.filteredOut.length} 条不合格` : '已显示全部样本', placement: 'topRight' })
  } catch (e) {
    filterOn.value = !val
    notification.error({ message: e.message || '过滤失败', placement: 'topRight' })
  }
}

watch(
  () => route.params.id,
  async (id) => {
    await loadList()
    const target = id || taskList.value[0]?.id
    if (target && target !== task.value?.id) await loadTask(target)
    if (!id && target) router.replace(`/vla/quality/${target}`)
  },
)

onMounted(async () => {
  await loadList()
  const id = route.params.id || taskList.value[0]?.id
  if (id) {
    if (!route.params.id) router.replace(`/vla/quality/${id}`)
    await loadTask(id)
  }
})

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}

const beforeCount = computed(() => (task.value?.issues || []).length)
const afterCount = computed(() => visibleIssues.value.length)
const unqualifiedCount = computed(() => (task.value?.issues || []).filter((i) => i.unqualified).length)

const detailIssue = ref(null)

const ornTableCols1 = [
  { title: '类型', key: 'type', width: 110 },
  { title: '等级', key: 'severity', width: 90 },
  { title: '帧', key: 'frame', width: 70 },
  { title: '说明', dataIndex: 'message' },
  { title: '证据分', key: 'score', width: 90 },
  { title: '标记', key: 'flag', width: 90 },
  { title: '详情', key: 'op', width: 80 },
]
</script>

<template>
  <div class="qg">
    <a-alert
      type="info"
      show-icon
      class="mb"
      message="VLA 质检详情页：展示伪造检测证据分 / 检测器版本 / 处理前后数量变化。非真实 OpenCV 推理。"
    />
    <div class="toolbar">
      <a-select :value="taskId" placeholder="选择采集任务" style="width: 280px" @change="onSelectTask">
        <a-select-option v-for="t in taskList" :key="t.id" :value="t.id">{{ `${t.id} · ${t.name}` }}</a-select-option>
      </a-select>
      <div class="spacer" />
      <a-button type="primary" :loading="detecting" @click="onDetect">一键检测</a-button>
      <a-button danger :disabled="!selected.length" @click="onMark">标记不合格</a-button>
      <span class="filter-lab">过滤不合格</span>
      <a-switch v-model:checked="filterOn" @change="onToggleFilter" />
      <a-button @click="router.push('/vla/timeline/' + taskId)">返回时间轴</a-button>
    </div>

    <ProgressMock :running="detecting" label="检测抖动/遮挡/模糊/缺失/不匹配" :duration="1100" />

    <template v-if="task">
      <a-row :gutter="12" class="summary">
        <a-col v-for="t in meta.issueTypes" :key="t.key" :span="3">
          <a-card class="sum-card" size="small">
            <div class="sum-label">{{ t.label }}</div>
            <div class="sum-num">{{ summary[t.key] || 0 }}</div>
          </a-card>
        </a-col>
        <a-col :span="3">
          <a-card class="sum-card" size="small">
            <div class="sum-label">检出总数</div>
            <div class="sum-num">{{ beforeCount }}</div>
          </a-card>
        </a-col>
        <a-col :span="3">
          <a-card class="sum-card" size="small">
            <div class="sum-label">过滤后可见</div>
            <div class="sum-num">{{ afterCount }}</div>
          </a-card>
        </a-col>
        <a-col :span="3">
          <a-card class="sum-card" size="small">
            <div class="sum-label">已标不合格</div>
            <div class="sum-num">{{ unqualifiedCount }}</div>
          </a-card>
        </a-col>
      </a-row>

      <a-card>
        <template #title>
          <div class="card-head">
            <span>质检问题列表 · {{ task.id }}</span>
            <a-tag v-if="task.issuesDetected" color="success" size="small">已检测</a-tag>
            <a-tag v-else color="default" size="small">未检测</a-tag>
            <a-tag v-if="task.issuesDetected" color="blue">处理前 {{ beforeCount }} → 可见 {{ afterCount }}</a-tag>
          </div>
        </template>

        <a-alert
          v-if="!task.issuesDetected"
          message="点击「一键检测」演示五类问题检出与证据字段。"
          type="info"
          show-icon
          class="mb"
        />

        <a-table
          :data-source="visibleIssues"
          :columns="ornTableCols1"
          :pagination="false"
          row-key="id"
          size="small"
          :row-selection="{ selectedRowKeys: selected, onChange: onSelectChange }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="mapTagColor(issueTypeColor(record.type))">{{ issueTypeLabel(record.type) }}</a-tag>
            </template>
            <template v-else-if="column.key === 'severity'">
              <a-tag :color="mapTagColor(record.severity === 'high' ? 'danger' : record.severity === 'medium' ? 'warning' : 'info')">
                {{ record.severity }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'frame'">{{ record.frame ?? record.evidence?.frameStart ?? '—' }}</template>
            <template v-else-if="column.key === 'score'">{{ record.evidence?.score ?? '—' }}</template>
            <template v-else-if="column.key === 'flag'">
              <a-tag v-if="record.unqualified" color="error">不合格</a-tag>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'op'">
              <a-button type="link" size="small" @click="detailIssue = record">证据</a-button>
            </template>
          </template>
        </a-table>
      </a-card>
    </template>

    <a-empty v-else description="请先创建采集任务" />

    <a-drawer :open="!!detailIssue" title="检测证据详情" width="420" @close="detailIssue = null">
      <template v-if="detailIssue">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="类型">{{ issueTypeLabel(detailIssue.type) }}</a-descriptions-item>
          <a-descriptions-item label="等级">{{ detailIssue.severity }}</a-descriptions-item>
          <a-descriptions-item label="说明">{{ detailIssue.message }}</a-descriptions-item>
          <a-descriptions-item label="detector">{{ detailIssue.evidence?.detectorVersion }}</a-descriptions-item>
          <a-descriptions-item label="score">{{ detailIssue.evidence?.score }}</a-descriptions-item>
          <a-descriptions-item label="threshold">{{ detailIssue.evidence?.threshold }}</a-descriptions-item>
          <a-descriptions-item label="帧区间">
            {{ detailIssue.evidence?.frameStart }} – {{ detailIssue.evidence?.frameEnd }}
          </a-descriptions-item>
          <a-descriptions-item label="备注">{{ detailIssue.evidence?.note }}</a-descriptions-item>
        </a-descriptions>
        <pre class="ev">{{ JSON.stringify(detailIssue.evidence, null, 2) }}</pre>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.spacer {
  flex: 1;
}
.filter-lab {
  font-size: 13px;
  color: #6b7280;
}
.summary {
  margin-bottom: 12px;
}
.sum-card {
  text-align: center;
  border-radius: 8px;
}
.sum-label {
  font-size: 12px;
  color: #6b7280;
}
.sum-num {
  font-size: 22px;
  font-weight: 700;
  color: #1677ff;
  margin-top: 4px;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mb {
  margin-bottom: 12px;
}
.ev {
  margin-top: 12px;
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
}
</style>
