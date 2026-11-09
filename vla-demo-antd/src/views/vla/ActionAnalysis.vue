<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { listVlaTasks, getVlaTask } from '@/services/vla'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const tasks = ref([])
const task = ref(null)
const selectedAction = ref(null)

const actions = computed(() => task.value?.actions || [])
const keyNodes = computed(() => {
  if (!task.value) return []
  if (task.value.keyNodes?.length) return task.value.keyNodes
  return actions.value
    .filter((a) => a.keyNode)
    .map((a) => ({
      name: a.actionLabel || a.action,
      frame_idx: a.startFrame,
      type: 'key',
      labels: [a.action],
      instruction: a.instruction,
      id: a.id,
    }))
})

const stats = computed(() => {
  const list = actions.value
  const totalDur = list.reduce((s, a) => s + Math.max(0, (a.endFrame || 0) - (a.startFrame || 0)), 0)
  const byType = {}
  for (const a of list) {
    const k = a.action || a.type || a.actionLabel || 'UNK'
    byType[k] = (byType[k] || 0) + 1
  }
  const gaps = []
  const sorted = [...list].sort((a, b) => (a.startFrame || 0) - (b.startFrame || 0))
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = (sorted[i].startFrame || 0) - (sorted[i - 1].endFrame || 0)
    if (gap > 5) gaps.push({ from: sorted[i - 1].id, to: sorted[i].id, fromLabel: sorted[i - 1].actionLabel, toLabel: sorted[i].actionLabel, gap })
  }
  return {
    count: list.length,
    totalFrames: totalDur,
    avgFrames: list.length ? Math.round(totalDur / list.length) : 0,
    types: Object.keys(byType),
    byType: Object.entries(byType).map(([k, v]) => ({ type: k, count: v })),
    gaps,
    coverage: task.value?.totalFrames ? Number(((totalDur / task.value.totalFrames) * 100).toFixed(1)) : 0,
  }
})

async function loadList() {
  tasks.value = (await listVlaTasks({ page: 1, pageSize: 100 })).items || []
}

async function loadTask(id) {
  if (!id) {
    task.value = null
    selectedAction.value = null
    return
  }
  loading.value = true
  try {
    task.value = await getVlaTask(id)
    selectedAction.value = actions.value.find((a) => a.keyNode) || actions.value[0] || null
  } catch (e) {
    notification.error({ message: e.message || '加载失败', placement: 'topRight' })
  } finally {
    loading.value = false
  }
}

function onSelect(id) {
  router.push(`/vla/action-analysis/${id}`)
}

onMounted(async () => {
  await loadList()
  const id = route.params.id || tasks.value[0]?.id
  if (id && !route.params.id) router.replace(`/vla/action-analysis/${id}`)
  else if (id) await loadTask(id)
})

watch(
  () => route.params.id,
  (id) => loadTask(id),
)
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="动作序列分析：甘特覆盖 · 类型分布 · 关键节点 · 段间空隙 · 属性面板（伪造统计）。"
    />
    <a-space style="margin-bottom: 12px" wrap>
      <a-select
        :value="route.params.id"
        style="width: 360px"
        :options="tasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.name}` }))"
        @change="onSelect"
      />
      <a-button @click="router.push(`/vla/timeline/${route.params.id}`)">时间轴</a-button>
      <a-button @click="router.push(`/vla/consistency/${route.params.id}`)">一致性</a-button>
    </a-space>

    <a-spin :spinning="loading">
      <a-row :gutter="12" style="margin-bottom: 12px">
        <a-col :span="4"><a-card size="small"><div class="k">动作段</div><div class="v">{{ stats.count }}</div></a-card></a-col>
        <a-col :span="4"><a-card size="small"><div class="k">覆盖帧</div><div class="v">{{ stats.totalFrames }}</div></a-card></a-col>
        <a-col :span="4"><a-card size="small"><div class="k">平均段长</div><div class="v">{{ stats.avgFrames }}</div></a-card></a-col>
        <a-col :span="4"><a-card size="small"><div class="k">时间覆盖率</div><div class="v">{{ stats.coverage }}%</div></a-card></a-col>
        <a-col :span="4"><a-card size="small"><div class="k">类型数</div><div class="v">{{ stats.types.length }}</div></a-card></a-col>
        <a-col :span="4"><a-card size="small"><div class="k">空隙告警</div><div class="v warn">{{ stats.gaps.length }}</div></a-card></a-col>
      </a-row>

      <a-card title="动作序列甘特" size="small" style="margin-bottom: 12px">
        <div class="ruler">
          <span>F0</span>
          <span>F{{ Math.round((task?.totalFrames || 0) / 2) }}</span>
          <span>F{{ task?.totalFrames || 0 }}</span>
        </div>
        <div
          v-for="a in actions"
          :key="a.id"
          class="bar-row"
          :class="{ active: selectedAction?.id === a.id }"
          @click="selectedAction = a"
        >
          <span class="name">{{ a.actionLabel || a.action || a.id }}</span>
          <div class="track">
            <div
              class="bar"
              :class="{ key: a.keyNode }"
              :style="{
                left: ((a.startFrame || 0) / Math.max(task?.totalFrames || 1, 1)) * 100 + '%',
                width: Math.max(2, (((a.endFrame || 0) - (a.startFrame || 0)) / Math.max(task?.totalFrames || 1, 1)) * 100) + '%',
              }"
            />
          </div>
          <code>F{{ a.startFrame }}–{{ a.endFrame }}</code>
        </div>
        <a-empty v-if="!actions.length" description="无动作序列" />
      </a-card>

      <a-row :gutter="12">
        <a-col :span="8">
          <a-card title="动作类型分布" size="small">
            <div v-for="t in stats.byType" :key="t.type" class="type-row">
              <code>{{ t.type }}</code>
              <a-progress :percent="Math.round((t.count / Math.max(stats.count, 1)) * 100)" size="small" :show-info="false" />
              <span>{{ t.count }}</span>
            </div>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="关键节点时间线" size="small">
            <a-timeline>
              <a-timeline-item v-for="(n, i) in keyNodes" :key="i" color="green">
                <div class="kn" @click="selectedAction = actions.find((a) => a.id === n.id) || selectedAction">
                  <strong>{{ n.name || n.type }}</strong>
                  <div class="sub">帧 {{ n.frame_idx ?? n.frame ?? '—' }} · {{ (n.labels || []).join(', ') || '关键' }}</div>
                </div>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-if="!keyNodes.length" description="无关键节点" />
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="选中动作属性" size="small">
            <template v-if="selectedAction">
              <a-descriptions :column="1" size="small" bordered>
                <a-descriptions-item label="ID">{{ selectedAction.id }}</a-descriptions-item>
                <a-descriptions-item label="动作">{{ selectedAction.actionLabel || selectedAction.action }}</a-descriptions-item>
                <a-descriptions-item label="编码">{{ selectedAction.action }}</a-descriptions-item>
                <a-descriptions-item label="起止帧">F{{ selectedAction.startFrame }}–{{ selectedAction.endFrame }}</a-descriptions-item>
                <a-descriptions-item label="时长">{{ (selectedAction.endFrame || 0) - (selectedAction.startFrame || 0) }} 帧</a-descriptions-item>
                <a-descriptions-item label="关键节点">
                  <a-tag :color="selectedAction.keyNode ? 'orange' : 'default'">{{ selectedAction.keyNode ? '是' : '否' }}</a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="指令片段">{{ selectedAction.instruction || '—' }}</a-descriptions-item>
              </a-descriptions>
            </template>
            <a-empty v-else description="点击甘特条或关键节点查看属性" />
          </a-card>
        </a-col>
      </a-row>

      <a-card title="动作明细表" size="small" style="margin-top: 12px">
        <a-table
          size="small"
          row-key="id"
          :pagination="false"
          :data-source="actions"
          :custom-row="(record) => ({ onClick: () => (selectedAction = record), style: { cursor: 'pointer' } })"
          :columns="[
            { title: '动作', dataIndex: 'actionLabel' },
            { title: '编码', dataIndex: 'action', width: 90 },
            { title: '起止帧', key: 'frames', width: 130 },
            { title: '时长', key: 'dur', width: 70 },
            { title: '关键', key: 'key', width: 70 },
            { title: '指令片段', dataIndex: 'instruction', ellipsis: true },
          ]"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'frames'">F{{ record.startFrame }}–{{ record.endFrame }}</template>
            <template v-else-if="column.key === 'dur'">{{ (record.endFrame || 0) - (record.startFrame || 0) }}</template>
            <template v-else-if="column.key === 'key'">
              <a-tag :color="record.keyNode ? 'orange' : 'default'">{{ record.keyNode ? '是' : '否' }}</a-tag>
            </template>
          </template>
        </a-table>
      </a-card>

      <a-alert
        v-if="stats.gaps.length"
        type="warning"
        show-icon
        style="margin-top: 12px"
        :message="`检测到 ${stats.gaps.length} 处段间空隙 > 5 帧，可能存在漏标动作`"
        :description="stats.gaps.map((g) => `${g.fromLabel || g.from} → ${g.toLabel || g.to} 空隙 ${g.gap} 帧`).join('；')"
      />
    </a-spin>
  </div>
</template>

<style scoped>
.k { color: #8c8c8c; font-size: 12px; }
.v { margin-top: 4px; font-size: 22px; color: #1677ff; font-weight: 600; }
.v.warn { color: #fa8c16; }
.ruler { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-bottom: 6px; padding-left: 120px; padding-right: 100px; }
.bar-row { display: grid; grid-template-columns: 120px 1fr 100px; gap: 10px; align-items: center; margin-bottom: 8px; padding: 4px; border-radius: 6px; cursor: pointer; }
.bar-row:hover, .bar-row.active { background: #f0f5ff; }
.track { position: relative; height: 14px; background: #f1f5f9; border-radius: 4px; }
.bar { position: absolute; top: 0; bottom: 0; background: #1677ff99; border: 1px solid #1677ff; border-radius: 4px; }
.bar.key { background: #fa8c1699; border-color: #fa8c16; }
.name { font-size: 12px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.type-row { display: grid; grid-template-columns: 80px 1fr 30px; gap: 8px; align-items: center; margin-bottom: 8px; font-size: 12px; }
.kn { cursor: pointer; }
.kn .sub { font-size: 12px; color: #8c8c8c; }
</style>
