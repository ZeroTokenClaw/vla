<script setup>
import { message } from '@/ui/discrete'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NCheckbox, NTag } from 'naive-ui'
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
const detail = ref(null)
const meta = listMeta()

const taskId = computed(() => route.params.id || taskList.value[0]?.id || '')

const visibleIssues = computed(() => {
  if (!task.value) return []
  return (task.value.issues || []).filter((i) => !i.filtered)
})

const issueTypeLabel = (key) => meta.issueTypes.find((t) => t.key === key)?.label || key
const issueTypeColor = (key) => meta.issueTypes.find((t) => t.key === key)?.color || 'info'

const frameMarks = computed(() => {
  const total = task.value?.totalFrames || 300
  return visibleIssues.value.map((i) => {
    const start = i.startFrame ?? i.frame ?? 0
    const end = i.endFrame ?? start + 10
    return {
      id: i.id,
      type: i.type,
      left: (start / total) * 100,
      width: Math.max(1.5, ((end - start) / total) * 100),
      label: issueTypeLabel(i.type),
    }
  })
})

const columns = [
  {
    title: '',
    key: 'sel',
    width: 40,
    render(row) {
      const checked = selected.value.includes(row.id)
      return h(NCheckbox, {
        checked,
        onUpdateChecked: (v) => {
          if (v) selected.value = [...selected.value, row.id]
          else selected.value = selected.value.filter((x) => x !== row.id)
        },
      })
    },
  },
  { title: '问题 ID', key: 'id', width: 110 },
  {
    title: '类型',
    key: 'type',
    width: 110,
    render(row) {
      return h(
        NTag,
        { size: 'small', type: issueTypeColor(row.type), bordered: false },
        { default: () => issueTypeLabel(row.type) },
      )
    },
  },
  {
    title: '帧区间',
    key: 'frame',
    width: 120,
    render(row) {
      const s = row.startFrame ?? row.frame ?? '—'
      const e = row.endFrame ?? s
      return `F${s}–${e}`
    },
  },
  { title: '严重度', key: 'severity', width: 80, render: (r) => r.severity || r.level || 'med' },
  { title: '说明', key: 'message', ellipsis: { tooltip: true }, render: (r) => r.message || r.desc || r.reason || '—' },
  {
    title: '不合格',
    key: 'unqualified',
    width: 80,
    render: (r) => (r.unqualified ? '是' : '否'),
  },
  {
    title: '详情',
    key: 'act',
    width: 70,
    render(row) {
      return h(
        NButton,
        { size: 'tiny', quaternary: true, type: 'primary', onClick: () => (detail.value = row) },
        { default: () => '查看' },
      )
    },
  },
]

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
      for (const i of task.value.issues || []) {
        summary.value[i.type] = (summary.value[i.type] || 0) + 1
      }
    }
    selected.value = []
    detail.value = null
  } catch (e) {
    message.error(e.message || '加载失败')
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
    message.success(`检出 ${res.issues.length} 条问题（五类质检）`)
  } catch (e) {
    message.error(e.message || '检测失败')
  } finally {
    detecting.value = false
  }
}

async function onMark() {
  if (!task.value) return
  if (!selected.value.length) return message.warning('请先勾选要标记的问题')
  try {
    await markUnqualified(task.value.id, selected.value)
    task.value = await getVlaTask(task.value.id)
    message.success(`已标记 ${selected.value.length} 条不合格`)
  } catch (e) {
    message.error(e.message || '标记失败')
  }
}

async function onToggleFilter(val) {
  if (!task.value) return
  if (!task.value.issuesDetected) {
    filterOn.value = false
    return message.warning('请先执行一键检测')
  }
  try {
    const res = await setFilterUnqualified(task.value.id, val)
    task.value = await getVlaTask(task.value.id)
    message.success(val ? `已过滤隐藏 ${res.filteredOut.length} 条不合格` : '已显示全部样本')
  } catch (e) {
    filterOn.value = !val
    message.error(e.message || '过滤失败')
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
  <div class="qg">
    <div class="toolbar">
      <n-select
        :value="taskId"
        placeholder="选择采集任务"
        style="width: 300px"
        :options="taskList.map((t) => ({ label: `${t.id} · ${t.name}`, value: t.id }))"
        @update:value="onSelectTask"
      />
      <div class="spacer" />
      <n-button type="primary" :loading="detecting" @click="onDetect">一键检测</n-button>
      <n-button type="error" :disabled="!selected.length" @click="onMark">标记不合格</n-button>
      <span class="filter-lab">过滤不合格</span>
      <n-switch :value="filterOn" @update:value="onToggleFilter" />
      <n-button @click="router.push('/vla/timeline/' + taskId)">返回时间轴</n-button>
      <n-button secondary @click="router.push(`/vla/consistency/${taskId}`)">一致性</n-button>
    </div>

    <ProgressMock :running="detecting" label="检测抖动/遮挡/模糊/缺失/不匹配" :duration="1100" />

    <n-spin :show="loading">
      <template v-if="task">
        <div class="summary">
          <n-card v-for="t in meta.issueTypes" :key="t.key" class="sum-card" size="small" :bordered="false">
            <div class="sum-label">{{ t.label }}</div>
            <div class="sum-num">{{ summary[t.key] || 0 }}</div>
          </n-card>
          <n-card class="sum-card" size="small" :bordered="false">
            <div class="sum-label">可见问题</div>
            <div class="sum-num">{{ visibleIssues.length }}</div>
          </n-card>
          <n-card class="sum-card" size="small" :bordered="false">
            <div class="sum-label">已选</div>
            <div class="sum-num">{{ selected.length }}</div>
          </n-card>
        </div>

        <n-card title="问题帧轴定位（演示）" :bordered="false" class="mb">
          <div class="track">
            <div
              v-for="m in frameMarks"
              :key="m.id"
              class="mark"
              :title="`${m.label} ${m.id}`"
              :style="{ left: m.left + '%', width: m.width + '%' }"
              @click="detail = visibleIssues.find((i) => i.id === m.id)"
            />
          </div>
          <div class="axis">F0 — F{{ task.totalFrames || '…' }} · 点击色块查看问题</div>
        </n-card>

        <n-card :bordered="false">
          <template #header>
            <div class="card-head">
              <span>质检问题列表 · {{ task.id }}</span>
              <n-tag v-if="task.issuesDetected" type="success" size="small" :bordered="false">已检测</n-tag>
              <n-tag v-else type="info" size="small" :bordered="false">未检测</n-tag>
            </div>
          </template>

          <n-alert
            v-if="!task.issuesDetected"
            title="点击「一键检测」演示五类问题检出；可勾选标记不合格并过滤。"
            type="info"
            :bordered="false"
            class="mb"
          />

          <n-data-table
            :columns="columns"
            :data="visibleIssues"
            :row-key="(r) => r.id"
            size="small"
            :bordered="false"
            :pagination="{ pageSize: 8 }"
          />
        </n-card>
      </template>
      <n-empty v-else description="请先创建采集任务" />
    </n-spin>

    <n-drawer :show="!!detail" :width="440" placement="right" @update:show="(v) => { if (!v) detail = null }">
      <n-drawer-content title="问题详情" closable>
        <template v-if="detail">
          <img v-if="detail.evidence" :src="detail.evidence" class="ev" alt="evidence" />
          <n-descriptions label-placement="left" :column="1" size="small" bordered class="mt">
            <n-descriptions-item label="ID">{{ detail.id }}</n-descriptions-item>
            <n-descriptions-item label="样本">{{ detail.sampleId || '—' }}</n-descriptions-item>
            <n-descriptions-item label="类型">{{ issueTypeLabel(detail.type) }}</n-descriptions-item>
            <n-descriptions-item label="严重度">{{ detail.severity || detail.level || '—' }}</n-descriptions-item>
            <n-descriptions-item label="帧区间">
              F{{ detail.startFrame ?? detail.frame ?? '—' }}–{{ detail.endFrame ?? detail.frame ?? '—' }}
            </n-descriptions-item>
            <n-descriptions-item label="时间戳">{{ detail.timestamp || '—' }}</n-descriptions-item>
            <n-descriptions-item label="说明">
              {{ detail.message || detail.desc || detail.reason || '—' }}
            </n-descriptions-item>
            <n-descriptions-item label="建议">{{ detail.suggestion || '—' }}</n-descriptions-item>
            <n-descriptions-item label="不合格">{{ detail.unqualified ? '是' : '否' }}</n-descriptions-item>
          </n-descriptions>

          <h4>检测指标</h4>
          <n-data-table
            size="small"
            :pagination="false"
            :data="Object.entries(detail.metric || {}).map(([k, v]) => ({ key: k, value: v }))"
            :columns="[
              { title: '指标', key: 'key' },
              { title: '值', key: 'value' },
            ]"
          />
          <n-empty v-if="!Object.keys(detail.metric || {}).length" description="无附加指标" size="small" />

          <n-space class="mt">
            <n-button type="primary" @click="router.push(`/vla/timeline/${taskId}`)">到时间轴定位</n-button>
            <n-button @click="router.push(`/vla/consistency/${taskId}`)">一致性检查</n-button>
            <n-button @click="router.push('/analytics/anomaly')">异常中心</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.spacer { flex: 1; }
.filter-lab { font-size: 13px; color: #8b8b9a; }
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.sum-card { text-align: center; background: #14141c; }
.sum-label { font-size: 12px; color: #8b8b9a; }
.sum-num { font-size: 22px; font-weight: 700; color: #63e2b7; margin-top: 4px; }
.card-head { display: flex; align-items: center; gap: 10px; }
.mb { margin-bottom: 12px; }
.mt { margin-top: 12px; }
.track {
  position: relative;
  height: 28px;
  background: #1a1a22;
  border-radius: 6px;
  overflow: hidden;
}
.mark {
  position: absolute;
  top: 4px;
  bottom: 4px;
  background: #f0a020aa;
  border-radius: 3px;
  cursor: pointer;
}
.axis { margin-top: 6px; font-size: 12px; color: #6e6e7a; }
.ev { width: 100%; border-radius: 8px; border: 1px solid #2a2a36; }
h4 { margin: 14px 0 8px; font-size: 13px; color: #c8c8d0; }
:deep(.n-card) { background: #14141c; }
</style>
