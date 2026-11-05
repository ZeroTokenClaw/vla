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

const ornTableCols1 = [
  { title: 'col0', key: 'col0', width: 48 },
  { title: '帧', key: 'frame', dataIndex: 'frame', width: 70 },
  { title: '说明', key: 'message', dataIndex: 'message', width: 240 }
]
</script>

<template>
  <div :loading="loading" class="qg">
    <div class="toolbar">
      <a-select
        :value="taskId"
        placeholder="选择采集任务"
        style="width: 280px"
        @change="onSelectTask">
        <a-select-option
          v-for="t in taskList"
          :key="t.id"
          :value="t.id">{{ `${t.id} · ${t.name}` }}</a-select-option>
      </a-select>
      <div class="spacer" />
      <a-button type="primary" :loading="detecting" @click="onDetect">一键检测</a-button>
      <a-button danger :disabled="!selected.length" @click="onMark">标记不合格</a-button>
      <span class="filter-lab">过滤不合格</span>
      <a-switch v-model:checked="filterOn" @change="onToggleFilter" />
      <a-button @click="$.push('/vla/timeline/' + taskId)">返回时间轴</a-button>
    </div>

    <ProgressMock :running="detecting" label="检测抖动/遮挡/模糊/缺失/不匹配" :duration="1100" />

    <template v-if="task">
      <a-row :gutter="12" class="summary">
        <a-col v-for="t in meta.issueTypes" :key="t.key" :span="4">
          <a-card  class="sum-card">
            <div class="sum-label">{{ t.label }}</div>
            <div class="sum-num">{{ summary[t.key] || 0 }}</div>
          </a-card>
        </a-col>
        <a-col :span="4">
          <a-card  class="sum-card">
            <div class="sum-label">可见样本</div>
            <div class="sum-num">{{ visibleIssues.length }}</div>
          </a-card>
        </a-col>
      </a-row>

      <a-card>
        <template #title>
          <div class="card-head">
            <span>质检问题列表 · {{ task.id }}</span>
            <a-tag v-if="task.issuesDetected" color="success" size="small">已检测</a-tag>
            <a-tag v-else color="default" size="small">未检测</a-tag>
          </div>
        </template>

        <a-alert
          v-if="!task.issuesDetected"
          message="点击「一键检测」演示抖动、遮挡、模糊、数据缺失、样本与任务不匹配五类问题检出。"
          type="info"
          :closable="false"
          show-icon
          class="mb" />

        <a-table
          :data-source="visibleIssues"
          :columns="ornTableCols1"
          :pagination="false"
          row-key="id"
          size="small"
          :row-selection="{ selectedRowKeys: selected, onChange: onSelectChange }"
        >
          <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'col0'">
<a-tag size="small" :color="mapTagColor(issueTypeColor(record.type))">
                {{ issueTypeLabel(record.type) }}
              </a-tag>
      </template>
      <template v-if="column.key === 'frame'">
<a-tag
                size="small"
                :color="mapTagColor(record.severity === 'high' ? 'danger' : record.severity === 'medium' ? 'warning' : 'info')">
                {{ record.severity }}
              </a-tag>
      </template>
      <template v-if="column.key === 'message'">
<a-tag v-if="record.unqualified" size="small" color="error">已标记</a-tag>
              <span v-else>—</span>
      </template>
  </template>
</a-table>
      </a-card>
    </template>

    <a-empty v-else description="请先创建采集任务" />
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
</style>
