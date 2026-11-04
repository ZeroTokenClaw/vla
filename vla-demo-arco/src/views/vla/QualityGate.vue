<script setup>
import { Message } from '@/ui/discrete'
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
  taskList.value = await listVlaTasks()
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
    Message.error(e.message || '加载失败')
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
    Message.success(`检出 ${res.issues.length} 条问题（抖动/遮挡/模糊/缺失/不匹配）`)
  } catch (e) {
    Message.error(e.message || '检测失败')
  } finally {
    detecting.value = false
  }
}

async function onMark() {
  if (!task.value) return
  if (!selected.value.length) return Message.warning('请先勾选要标记的问题样本')
  try {
    await markUnqualified(task.value.id, selected.value)
    task.value = await getVlaTask(task.value.id)
    Message.success(`已标记 ${selected.value.length} 条不合格`)
  } catch (e) {
    Message.error(e.message || '标记失败')
  }
}

async function onToggleFilter(val) {
  if (!task.value) return
  if (!task.value.issuesDetected) {
    filterOn.value = false
    return Message.warning('请先执行一键检测')
  }
  try {
    const res = await setFilterUnqualified(task.value.id, val)
    task.value = await getVlaTask(task.value.id)
    Message.success(val ? `已过滤隐藏 ${res.filteredOut.length} 条不合格` : '已显示全部样本')
  } catch (e) {
    filterOn.value = !val
    Message.error(e.message || '过滤失败')
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
const scTableCols1 = [
  
]
</script>

<template>
  <div class="qg">
    <div class="toolbar">
      <a-select
        :model-value="taskId"
        placeholder="选择采集任务"
        style="width: 280px"
        @change="onSelectTask"
      >
        <a-option
          v-for="t in taskList"
          :key="t.id"
          :label="`${t.id} · ${t.name}`"
          :value="t.id"
        />
      </a-select>
      <div class="spacer" />
      <a-button type="primary" :loading="detecting" @click="onDetect">一键检测</a-button>
      <a-button type="primary" status="danger" :disabled="!selected.length" @click="onMark">标记不合格</a-button>
      <span class="filter-lab">过滤不合格</span>
      <a-switch v-model="filterOn" @change="onToggleFilter" />
      <a-button @click="$router.push('/vla/timeline/' + taskId)">返回时间轴</a-button>
    </div>

    <ProgressMock :running="detecting" label="检测抖动/遮挡/模糊/缺失/不匹配" :duration="1100" />

    <template v-if="task">
      <a-row :gutter="12" class="summary">
        <a-col v-for="t in meta.issueTypes" :key="t.key" :span="4">
          <a-card class="sum-card">
            <div class="sum-label">{{ t.label }}</div>
            <div class="sum-num">{{ summary[t.key] || 0 }}</div>
          </a-card>
        </a-col>
        <a-col :span="4">
          <a-card class="sum-card">
            <div class="sum-label">可见样本</div>
            <div class="sum-num">{{ visibleIssues.length }}</div>
          </a-card>
        </a-col>
      </a-row>

      <a-card>
        <template #title>
          <div class="card-head">
            <span>质检问题列表 · {{ task.id }}</span>
            <a-tag v-if="task.issuesDetected" color="green" size="small">已检测</a-tag>
            <a-tag v-else color="arcoblue" size="small">未检测</a-tag>
          </div>
        </template>

        <a-alert
          v-if="!task.issuesDetected"
          title="点击「一键检测」演示抖动、遮挡、模糊、数据缺失、样本与任务不匹配五类问题检出。"
          type="info"
          :closable="false"
          show-icon
          class="mb"
        />

        <a-table :columns="scTableCols1" :data="visibleIssues" row-key="id" :pagination="false" size="small"></a-table>
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
