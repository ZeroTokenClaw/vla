<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { listVlaTasks, detectIssues, markUnqualified, setFilterUnqualified, getVlaTask } from '@/services/vla'

const router = useRouter()
const tasks = ref([])
const taskId = ref('')
const task = ref(null)
const loading = ref(false)
const filterOn = ref(false)
const current = ref(null)

const issues = computed(() => task.value?.issues || task.value?.issuesSeed || [])
const beforeCount = computed(() => (task.value?.actions || []).length)
const filteredCount = computed(() => (task.value?.filteredOut || []).length)
const severityStats = computed(() => {
  const map = { high: 0, medium: 0, low: 0 }
  for (const i of issues.value) {
    const s = i.severity || 'medium'
    map[s] = (map[s] || 0) + 1
  }
  return map
})

async function loadTasks() {
  const res = await listVlaTasks({ page: 1, pageSize: 30 })
  tasks.value = res.items
  taskId.value = tasks.value[0]?.id
  await loadTask()
}

async function loadTask() {
  if (!taskId.value) return
  loading.value = true
  try {
    task.value = await getVlaTask(taskId.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadTasks)

async function runDetect() {
  const res = await detectIssues(taskId.value)
  task.value = {
    ...task.value,
    issues: (res.issues || []).map((iss, i) => ({
      ...iss,
      suggest: iss.suggest || (iss.type === 'gap' ? '补标空隙动作段' : iss.type === 'blur' ? '复采或降权' : '人工复核'),
      evidence: iss.evidence || [`frame=${iss.frameStart ?? iss.frame ?? i}`, `rule=${iss.type || 'auto'}`],
    })),
    issuesDetected: true,
  }
  notification.success({ message: `检出 ${res.issues.length} 条异常`, placement: 'topRight' })
}

async function mark(issueId) {
  await markUnqualified(taskId.value, [issueId])
  await loadTask()
  notification.success({ message: '已标记不合格', placement: 'topRight' })
}

async function toggleFilter() {
  filterOn.value = !filterOn.value
  await setFilterUnqualified(taskId.value, filterOn.value)
  await loadTask()
}

const cols = [
  { title: '类型', dataIndex: 'type', width: 110 },
  { title: '等级', key: 'severity', width: 80 },
  { title: '定位', key: 'loc', width: 120 },
  { title: '说明', dataIndex: 'message', ellipsis: true },
  { title: '建议', dataIndex: 'suggest', ellipsis: true },
  { title: '操作', key: 'op', width: 160 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="异常处理：运行质检 → 证据链 → 标不合格 → 批量过滤（伪造规则引擎）。"
    />
    <a-space style="margin-bottom: 12px" wrap>
      <a-select
        v-model:value="taskId"
        style="width: 320px"
        :options="tasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.name}` }))"
        @change="loadTask"
      />
      <a-button type="primary" @click="runDetect">运行质检</a-button>
      <a-button @click="toggleFilter">{{ filterOn ? '取消过滤' : '批量过滤不合格' }}</a-button>
      <a-button @click="router.push(`/vla/quality/${taskId}`)">样本质检</a-button>
      <a-button @click="router.push(`/vla/timeline/${taskId}`)">时间轴</a-button>
    </a-space>
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="动作片段数" :value="beforeCount" /></a-col>
      <a-col :span="6"><a-statistic title="已过滤/不合格" :value="filteredCount" /></a-col>
      <a-col :span="6"><a-statistic title="异常条数" :value="issues.length" /></a-col>
      <a-col :span="6">
        <a-statistic title="高/中/低" :value="severityStats.high" :suffix="` / ${severityStats.medium} / ${severityStats.low}`" />
      </a-col>
    </a-row>
    <a-spin :spinning="loading">
      <a-table :columns="cols" :data-source="issues" row-key="id" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'severity'">
            <a-tag :color="record.severity === 'high' ? 'error' : record.severity === 'medium' ? 'warning' : 'default'">
              {{ record.severity || 'medium' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'loc'">帧 {{ record.frameStart ?? record.frame ?? '—' }}</template>
          <template v-else-if="column.key === 'op'">
            <a-button type="link" size="small" @click="current = record">详情</a-button>
            <a-button type="link" size="small" @click="mark(record.id)">标不合格</a-button>
          </template>
        </template>
      </a-table>
      <a-empty v-if="!issues.length" description="暂无异常，可点击「运行质检」生成演示结果" />

      <a-card v-if="(task?.filteredOut || []).length" title="已过滤不合格片段" size="small" style="margin-top: 12px">
        <a-table
          size="small"
          row-key="id"
          :pagination="false"
          :data-source="task.filteredOut"
          :columns="[
            { title: '片段', dataIndex: 'id', width: 120 },
            { title: '动作', dataIndex: 'actionLabel' },
            { title: '帧', key: 'fr', width: 120 },
            { title: '原因', dataIndex: 'reason', ellipsis: true },
          ]"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'fr'">F{{ record.startFrame }}–{{ record.endFrame }}</template>
          </template>
        </a-table>
      </a-card>

      <a-card v-if="task" title="规则引擎摘要（演示）" size="small" style="margin-top: 12px">
        <a-descriptions size="small" :column="2" bordered>
          <a-descriptions-item label="任务">{{ task.id }}</a-descriptions-item>
          <a-descriptions-item label="过滤开关">{{ filterOn ? '开' : '关' }}</a-descriptions-item>
          <a-descriptions-item label="质量要求">{{ task.qualityRequirement || task.qualityReq || '—' }}</a-descriptions-item>
          <a-descriptions-item label="设备">{{ (task.deviceIds || []).join(', ') || '未绑定' }}</a-descriptions-item>
        </a-descriptions>
        <p style="margin-top: 10px; color: #8c8c8c; font-size: 12px">
          规则：gap&gt;5 · blur/jitter/occlusion · instruction_mismatch · keynode_miss（本地假引擎，非真实 CV）。
        </p>
      </a-card>
    </a-spin>

    <a-drawer :open="!!current" title="异常详情" width="420" @close="current = null">
      <template v-if="current">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="类型">{{ current.type }}</a-descriptions-item>
          <a-descriptions-item label="等级">{{ current.severity }}</a-descriptions-item>
          <a-descriptions-item label="定位">帧 {{ current.frameStart ?? current.frame ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="说明">{{ current.message }}</a-descriptions-item>
          <a-descriptions-item label="建议">{{ current.suggest || '—' }}</a-descriptions-item>
        </a-descriptions>
        <h4 style="margin: 14px 0 8px">证据</h4>
        <a-timeline>
          <a-timeline-item v-for="(e, i) in current.evidence || []" :key="i" color="red">{{ e }}</a-timeline-item>
        </a-timeline>
        <a-space style="margin-top: 12px">
          <a-button type="primary" @click="mark(current.id)">标不合格</a-button>
          <a-button @click="router.push(`/vla/timeline/${taskId}`)">去时间轴定位</a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>
