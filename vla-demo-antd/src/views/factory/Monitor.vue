<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { notification } from 'ant-design-vue'
import {
  listProductionTasks,
  getProductionTask,
  getExecution,
  tickProductionTask,
  resumeHumanGate,
  retryProductionTask,
  runProductionTask,
} from '@/services/factory'

const route = useRoute()
const loading = ref(false)
const tasks = ref([])
const taskId = ref('')
const task = ref(null)
const execution = ref(null)
let timer = null

const selectedNode = ref(null)
const currentNodeDetail = computed(() => {
  if (!execution.value) return null
  return execution.value.nodes.find((n) => n.key === selectedNode.value) || execution.value.nodes.find((n) => n.status === 'running' || n.status === 'waiting_human') || execution.value.nodes[0]
})

async function loadTasks() {
  const res = await listProductionTasks({ page: 1, pageSize: 50 })
  tasks.value = res.items
  taskId.value = route.query.task || tasks.value.find((t) => t.status === 'running')?.id || tasks.value[0]?.id
}

async function loadDetail() {
  if (!taskId.value) return
  loading.value = true
  try {
    task.value = await getProductionTask(taskId.value)
    execution.value = await getExecution(taskId.value)
    selectedNode.value = execution.value.nodes.find((n) => n.status === 'running' || n.status === 'waiting_human')?.key
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadTasks()
  await loadDetail()
})

watch(taskId, loadDetail)

async function onTick() {
  task.value = await tickProductionTask(taskId.value)
  execution.value = await getExecution(taskId.value)
}

async function onResume() {
  task.value = await resumeHumanGate(taskId.value)
  execution.value = await getExecution(taskId.value)
  notification.success({ message: '人工门禁已放行', placement: 'topRight' })
}

async function onRetry() {
  task.value = await retryProductionTask(taskId.value)
  execution.value = await getExecution(taskId.value)
  notification.success({ message: '已重试', placement: 'topRight' })
}

async function onRun() {
  task.value = await runProductionTask(taskId.value)
  execution.value = await getExecution(taskId.value)
}

function startAuto() {
  stopAuto()
  timer = setInterval(async () => {
    if (task.value?.status === 'running') await onTick()
  }, 1200)
}
function stopAuto() {
  if (timer) clearInterval(timer)
  timer = null
}
onBeforeUnmount(stopAuto)

const statusColor = {
  succeeded: '#52c41a',
  running: '#1677ff',
  waiting_human: '#faad14',
  failed: '#ff4d4f',
  pending: '#d9d9d9',
  skipped: '#bfbfbf',
}
</script>

<template>
  <div>
    <a-space style="margin-bottom: 12px" wrap>
      <a-select
        v-model:value="taskId"
        style="width: 360px"
        :options="tasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.name}` }))"
      />
      <a-button @click="onRun">启动/重启</a-button>
      <a-button type="primary" :disabled="task?.status !== 'running'" @click="onTick">推进一步</a-button>
      <a-button :disabled="task?.status !== 'waiting_human'" @click="onResume">放行人工门禁</a-button>
      <a-button danger :disabled="task?.status !== 'failed' && task?.status !== 'running'" @click="onRetry">重试</a-button>
      <a-button @click="startAuto">自动推进</a-button>
      <a-button @click="stopAuto">停止自动</a-button>
    </a-space>

    <a-spin :spinning="loading">
      <a-row :gutter="12" v-if="task">
        <a-col :span="24">
          <a-card size="small">
            <a-descriptions size="small" :column="4" bordered>
              <a-descriptions-item label="任务">{{ task.name }}</a-descriptions-item>
              <a-descriptions-item label="状态"><a-tag>{{ task.status }}</a-tag></a-descriptions-item>
              <a-descriptions-item label="进度">
                <a-progress :percent="Math.round((task.progress || 0) * 100)" style="width: 160px" />
              </a-descriptions-item>
              <a-descriptions-item label="当前节点">{{ task.currentNode || '—' }}</a-descriptions-item>
              <a-descriptions-item label="流程">{{ task.workflowId }} v{{ task.workflowVersion }}</a-descriptions-item>
              <a-descriptions-item label="数据集">{{ task.datasetId }}</a-descriptions-item>
              <a-descriptions-item label="耗时">{{ task.elapsedSec }}s</a-descriptions-item>
              <a-descriptions-item label="异常">{{ task.error || '—' }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>

        <a-col :span="14" style="margin-top: 12px">
          <a-card title="节点执行状态" size="small">
            <div class="node-rail" v-if="execution">
              <div
                v-for="n in execution.nodes"
                :key="n.key"
                class="node-chip"
                :class="{ active: currentNodeDetail?.key === n.key }"
                :style="{ borderColor: statusColor[n.status] }"
                @click="selectedNode = n.key"
              >
                <div class="dot" :style="{ background: statusColor[n.status] }" />
                <div>
                  <div class="name">{{ n.label }}</div>
                  <div class="meta">{{ n.status }} · {{ n.elapsedSec }}s · try#{{ n.attempt }}</div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <a-col :span="10" style="margin-top: 12px">
          <a-card title="节点详情" size="small" v-if="currentNodeDetail">
            <a-space wrap style="margin-bottom: 8px">
              <a-tag color="blue">{{ currentNodeDetail.type }}</a-tag>
              <a-tag>{{ currentNodeDetail.status }}</a-tag>
              <a-tag>try#{{ currentNodeDetail.attempt }}</a-tag>
              <a-tag>{{ currentNodeDetail.elapsedSec }}s</a-tag>
            </a-space>
            <a-tabs size="small">
              <a-tab-pane key="logs" tab="运行日志">
                <pre class="logs">{{ (currentNodeDetail.logs || []).join('\n') }}</pre>
              </a-tab-pane>
              <a-tab-pane key="out" tab="产出摘要">
                <pre class="logs">{{ JSON.stringify(currentNodeDetail.outputSummary, null, 2) }}</pre>
              </a-tab-pane>
              <a-tab-pane key="art" tab="伪造产物清单">
                <a-table
                  size="small"
                  :pagination="false"
                  row-key="uri"
                  :data-source="[
                    { kind: 'json', uri: `mock://runs/${taskId}/${currentNodeDetail.key}/out.json`, size: '128KB' },
                    { kind: 'log', uri: `mock://runs/${taskId}/${currentNodeDetail.key}/worker.log`, size: '24KB' },
                    { kind: 'meta', uri: `mock://runs/${taskId}/${currentNodeDetail.key}/meta.json`, size: '4KB' },
                  ]"
                  :columns="[
                    { title: '类型', dataIndex: 'kind', width: 70 },
                    { title: 'URI', dataIndex: 'uri' },
                    { title: '大小', dataIndex: 'size', width: 70 },
                  ]"
                />
              </a-tab-pane>
              <a-tab-pane key="evt" tab="事件时间线">
                <a-timeline>
                  <a-timeline-item v-for="(line, i) in (currentNodeDetail.logs || [])" :key="i">
                    {{ line }}
                  </a-timeline-item>
                </a-timeline>
              </a-tab-pane>
            </a-tabs>
          </a-card>
        </a-col>

        <a-col :span="24" style="margin-top: 12px" v-if="task">
          <a-card size="small" title="任务完成条件 / 人员配置（详情）">
            <a-descriptions size="small" :column="3" bordered>
              <a-descriptions-item label="优先级">{{ task.priority }}</a-descriptions-item>
              <a-descriptions-item label="数据类型">{{ task.dataType }}</a-descriptions-item>
              <a-descriptions-item label="数据来源">{{ task.source }}</a-descriptions-item>
              <a-descriptions-item label="执行人">{{ (task.executorIds || []).join(', ') || '—' }}</a-descriptions-item>
              <a-descriptions-item label="审核人">{{ (task.reviewerIds || []).join(', ') || '—' }}</a-descriptions-item>
              <a-descriptions-item label="完成条件">
                <code>{{ JSON.stringify(task.completeCondition || {}) }}</code>
              </a-descriptions-item>
              <a-descriptions-item label="描述" :span="3">{{ task.description || '—' }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<style scoped>
.node-rail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 420px;
  overflow: auto;
}
.node-chip {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  background: #fff;
}
.node-chip.active {
  background: #f0f5ff;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 5px;
}
.name { font-weight: 600; font-size: 13px; }
.meta { font-size: 12px; color: #64748b; }
.logs, .out pre {
  margin: 8px 0 0;
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
}
</style>
