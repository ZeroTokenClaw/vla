<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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
    ElMessage.error(e.message || '加载失败')
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
    ElMessage.success(`检出 ${res.issues.length} 条问题（抖动/遮挡/模糊/缺失/不匹配）`)
  } catch (e) {
    ElMessage.error(e.message || '检测失败')
  } finally {
    detecting.value = false
  }
}

async function onMark() {
  if (!task.value) return
  if (!selected.value.length) return ElMessage.warning('请先勾选要标记的问题样本')
  try {
    await markUnqualified(task.value.id, selected.value)
    task.value = await getVlaTask(task.value.id)
    ElMessage.success(`已标记 ${selected.value.length} 条不合格`)
  } catch (e) {
    ElMessage.error(e.message || '标记失败')
  }
}

async function onToggleFilter(val) {
  if (!task.value) return
  if (!task.value.issuesDetected) {
    filterOn.value = false
    return ElMessage.warning('请先执行一键检测')
  }
  try {
    const res = await setFilterUnqualified(task.value.id, val)
    task.value = await getVlaTask(task.value.id)
    ElMessage.success(val ? `已过滤隐藏 ${res.filteredOut.length} 条不合格` : '已显示全部样本')
  } catch (e) {
    filterOn.value = !val
    ElMessage.error(e.message || '过滤失败')
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
</script>

<template>
  <div v-loading="loading" class="qg">
    <div class="toolbar">
      <el-select
        :model-value="taskId"
        placeholder="选择采集任务"
        style="width: 280px"
        @change="onSelectTask"
      >
        <el-option
          v-for="t in taskList"
          :key="t.id"
          :label="`${t.id} · ${t.name}`"
          :value="t.id"
        />
      </el-select>
      <div class="spacer" />
      <el-button type="primary" :loading="detecting" @click="onDetect">一键检测</el-button>
      <el-button type="danger" :disabled="!selected.length" @click="onMark">标记不合格</el-button>
      <span class="filter-lab">过滤不合格</span>
      <el-switch v-model="filterOn" @change="onToggleFilter" />
      <el-button @click="$router.push('/vla/timeline/' + taskId)">返回时间轴</el-button>
    </div>

    <ProgressMock :running="detecting" label="检测抖动/遮挡/模糊/缺失/不匹配" :duration="1100" />

    <template v-if="task">
      <el-row :gutter="12" class="summary">
        <el-col v-for="t in meta.issueTypes" :key="t.key" :span="4">
          <el-card shadow="never" class="sum-card">
            <div class="sum-label">{{ t.label }}</div>
            <div class="sum-num">{{ summary[t.key] || 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="sum-card">
            <div class="sum-label">可见样本</div>
            <div class="sum-num">{{ visibleIssues.length }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never">
        <template #header>
          <div class="card-head">
            <span>质检问题列表 · {{ task.id }}</span>
            <el-tag v-if="task.issuesDetected" type="success" size="small">已检测</el-tag>
            <el-tag v-else type="info" size="small">未检测</el-tag>
          </div>
        </template>

        <el-alert
          v-if="!task.issuesDetected"
          title="点击「一键检测」演示抖动、遮挡、模糊、数据缺失、样本与任务不匹配五类问题检出。"
          type="info"
          :closable="false"
          show-icon
          class="mb"
        />

        <el-table
          :data="visibleIssues"
          size="small"
          stripe
          empty-text="暂无可见问题（可能已被过滤或尚未检测）"
          @selection-change="(rows) => (selected = rows.map((r) => r.id))"
        >
          <el-table-column type="selection" width="48" />
          <el-table-column prop="sampleId" label="样本号" width="120" />
          <el-table-column label="问题类型" width="140">
            <template #default="{ row }">
              <el-tag size="small" :type="issueTypeColor(row.type)">
                {{ issueTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="frame" label="帧" width="70" />
          <el-table-column prop="severity" label="严重度" width="90">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.severity === 'high' ? 'danger' : row.severity === 'medium' ? 'warning' : 'info'"
              >
                {{ row.severity }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="说明" min-width="240" show-overflow-tooltip />
          <el-table-column label="不合格" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.unqualified" size="small" type="danger">已标记</el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-empty v-else description="请先创建采集任务" />
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
