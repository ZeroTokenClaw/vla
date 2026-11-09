<script setup>
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NTag } from 'naive-ui'
import * as echarts from 'echarts'
import { listVlaTasks, getVlaTask } from '@/services/vla'
import { exportJSON } from '@/utils/exportFiles'
import { message } from '@/ui/discrete'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const tasks = ref([])
const task = ref(null)
const result = ref(null)
const radarRef = ref(null)
let radarChart = null

const WEIGHTS = { coverage: 0.55, nodeCover: 0.25, stepAlign: 0.2 }

const actionRows = computed(() => {
  if (!result.value || !task.value) return []
  const tokens = (result.value.tokens || []).map((t) => t.toLowerCase())
  return (task.value.actions || []).map((a) => {
    const blob = `${a.name || ''} ${a.action || a.type || ''} ${a.actionLabel || ''} ${a.instruction || a.desc || ''}`.toLowerCase()
    const hitTokens = tokens.filter((t) => t.length > 1 && blob.includes(t))
    const code = a.action || a.type || ''
    return {
      id: a.id,
      action: a.actionLabel || a.action || a.name || a.type,
      code,
      frames: `F${a.startFrame}–${a.endFrame}`,
      instruction: a.instruction || '—',
      hit: !(result.value.mismatches || []).some((m) => m.actionId === a.id),
      hitTokens: hitTokens.join(', ') || '—',
    }
  })
})

const weightRows = computed(() => {
  if (!result.value) return []
  return [
    { dim: '动作命中率', weight: WEIGHTS.coverage, value: result.value.coverage, contrib: Number((result.value.coverage * WEIGHTS.coverage).toFixed(3)) },
    { dim: '关键节点覆盖', weight: WEIGHTS.nodeCover, value: result.value.nodeCover, contrib: Number((result.value.nodeCover * WEIGHTS.nodeCover).toFixed(3)) },
    { dim: '步骤对齐', weight: WEIGHTS.stepAlign, value: result.value.stepAlign, contrib: Number((result.value.stepAlign * WEIGHTS.stepAlign).toFixed(3)) },
  ]
})

async function loadList() {
  tasks.value = (await listVlaTasks({ page: 1, pageSize: 100 })).items || []
}

async function loadTask(id) {
  if (!id) return
  loading.value = true
  try {
    task.value = await getVlaTask(id)
    result.value = null
    analyze(false)
    await nextTick()
    renderRadar()
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function analyze(toast = true) {
  if (!task.value) return
  const instruction =
    task.value.instruction ||
    task.value.textNote ||
    task.value.actions?.find((a) => a.instruction)?.instruction ||
    ''
  const actions = task.value.actions || []
  const tokens = instruction.split(/[\s，,。；;、]+/).filter((t) => t.length > 1)
  const mismatches = []
  let hits = 0
  const actionLexicon = {
    REACH: ['接近', '伸手', '靠近'],
    GRASP: ['抓', '抓取', '拿'],
    LIFT: ['抬', '举起'],
    MOVE: ['移动', '运送', '平移'],
    PLACE: ['放', '放置', '放到'],
    RETREAT: ['回撤', '复位'],
    OPEN: ['开', '打开'],
    WIPE: ['擦', '擦拭'],
  }
  const perAction = []
  for (const a of actions) {
    const code = a.action || a.type || ''
    const blob = `${a.name || ''} ${code} ${a.actionLabel || ''} ${a.instruction || a.desc || ''}`.toLowerCase()
    const lex = actionLexicon[code] || []
    const matched =
      tokens.some((t) => blob.includes(t.toLowerCase())) ||
      lex.some((w) => instruction.includes(w))
    perAction.push({ id: a.id, code, matched, lex })
    if (matched) hits += 1
    else {
      mismatches.push({
        actionId: a.id,
        action: a.actionLabel || code,
        reason: `动作「${a.actionLabel || code}」未与指令关键词对齐`,
        suggest: lex[0] ? `指令可补充「${lex[0]}」相关表述` : '检查指令是否覆盖该动作段',
        severity: code === 'PLACE' || code === 'GRASP' ? 'high' : 'medium',
      })
    }
  }
  if (!instruction) {
    mismatches.unshift({
      actionId: '-',
      action: '-',
      reason: '缺少任务指令文本',
      suggest: '在时间轴补充 instruction',
      severity: 'high',
    })
  }
  const coverage = actions.length ? hits / actions.length : 0
  const nodes = task.value.keyNodes || task.value.nodes || actions.filter((a) => a.keyNode)
  const nodeCover = nodes.length > 0 ? Math.min(1, nodes.length / Math.max(3, actions.length * 0.4)) : 0.35
  const stepAlign = actions.length ? Math.min(1, actions.length / Math.max(3, tokens.length || 3)) : 0
  const score = Number((coverage * WEIGHTS.coverage + nodeCover * WEIGHTS.nodeCover + stepAlign * WEIGHTS.stepAlign).toFixed(3))
  const grade = score >= 0.85 ? '优秀' : score >= 0.7 ? '良好' : score >= 0.55 ? '一般' : '较差'
  result.value = {
    instruction: instruction || '（空）',
    tokens,
    score,
    grade,
    method: 'rule_v1 + lexicon',
    actionCount: actions.length,
    hits,
    nodeCount: nodes.length,
    coverage: Number(coverage.toFixed(3)),
    nodeCover: Number(nodeCover.toFixed(3)),
    stepAlign: Number(stepAlign.toFixed(3)),
    mismatches,
    perAction,
    lexiconUsed: Object.keys(actionLexicon),
  }
  if (toast) message.success(`一致性评分 ${score}（${grade}）`)
  nextTick(() => renderRadar())
}

function renderRadar() {
  if (!radarRef.value || !result.value) return
  if (!radarChart) radarChart = echarts.init(radarRef.value)
  radarChart.setOption({
    backgroundColor: 'transparent',
    radar: {
      indicator: [
        { name: '命中率', max: 1 },
        { name: '节点覆盖', max: 1 },
        { name: '步骤对齐', max: 1 },
      ],
      axisName: { color: '#a0a0aa' },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [result.value.coverage, result.value.nodeCover, result.value.stepAlign],
            name: '一致性',
            areaStyle: { color: 'rgba(99,226,183,0.25)' },
            lineStyle: { color: '#63e2b7' },
          },
        ],
      },
    ],
  })
}

function exportReport() {
  if (!task.value || !result.value) return
  exportJSON(`EIDE-consistency-${task.value.id}.json`, {
    taskId: task.value.id,
    name: task.value.name,
    result: result.value,
    weights: WEIGHTS,
    exportedAt: new Date().toISOString(),
    sourceMode: 'demo',
  })
  message.success('已导出一致性报告')
}

onMounted(async () => {
  await loadList()
  const id = route.params.id || tasks.value[0]?.id
  if (id && !route.params.id) router.replace(`/vla/consistency/${id}`)
  else if (id) await loadTask(id)
})

onUnmounted(() => radarChart?.dispose())

watch(
  () => route.params.id,
  (id) => loadTask(id),
)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>指令 · 动作一致性</h2>
        <p>关键词命中 · 动作词表 · 关键节点 · 步骤密度 · 权重贡献 · 可导出</p>
      </div>
      <n-space>
        <n-select
          :value="route.params.id"
          style="width: 280px"
          :options="tasks.map((t) => ({ label: `${t.id} · ${t.name}`, value: t.id }))"
          @update:value="(id) => router.push(`/vla/consistency/${id}`)"
        />
        <n-button :disabled="!result" @click="exportReport">导出 JSON</n-button>
        <n-button type="primary" :disabled="!task" :loading="loading" @click="() => analyze(true)">
          重新计算
        </n-button>
      </n-space>
    </div>

    <n-alert type="info" :bordered="false" class="mb">
      演示规则引擎：score = 0.55×命中 + 0.25×节点覆盖 + 0.2×步骤对齐。非神经网络语义对齐。
    </n-alert>

    <n-spin :show="loading">
      <n-card v-if="task" title="当前样本指令" :bordered="false" class="mb">
        <p class="inst">{{ result?.instruction || task.instruction || task.textNote || '（空）' }}</p>
        <n-space v-if="result?.tokens?.length" size="small" class="mt">
          <n-tag v-for="t in result.tokens" :key="t" size="small" type="info" :bordered="false">{{ t }}</n-tag>
        </n-space>
        <p class="muted mt">词表：{{ (result?.lexiconUsed || []).join(', ') }}</p>
      </n-card>

      <div v-if="result" class="score-grid">
        <n-card size="small" :bordered="false">
          <div class="k">综合分</div>
          <div class="v">{{ result.score }}</div>
          <n-tag size="small" type="success" :bordered="false">{{ result.grade }}</n-tag>
        </n-card>
        <n-card size="small" :bordered="false">
          <div class="k">动作命中率</div>
          <div class="v">{{ result.coverage }}</div>
          <div class="s">{{ result.hits }}/{{ result.actionCount }}</div>
        </n-card>
        <n-card size="small" :bordered="false">
          <div class="k">关键节点覆盖</div>
          <div class="v">{{ result.nodeCover }}</div>
          <div class="s">{{ result.nodeCount }} 节点</div>
        </n-card>
        <n-card size="small" :bordered="false">
          <div class="k">步骤对齐</div>
          <div class="v">{{ result.stepAlign }}</div>
          <div class="s">{{ result.method }}</div>
        </n-card>
      </div>

      <div v-if="result" class="mid">
        <n-card title="维度雷达" :bordered="false"><div ref="radarRef" class="radar" /></n-card>
        <n-card title="权重贡献拆解" :bordered="false">
          <n-data-table
            size="small"
            :pagination="false"
            :data="weightRows"
            :columns="[
              { title: '维度', key: 'dim' },
              { title: '权重', key: 'weight', width: 70 },
              { title: '值', key: 'value', width: 70 },
              { title: '贡献', key: 'contrib', width: 80 },
            ]"
          />
          <p class="muted mt">合计贡献 ≈ {{ result.score }}</p>
        </n-card>
      </div>

      <div v-if="result" class="grid2">
        <n-card title="动作对齐明细" :bordered="false">
          <n-data-table
            size="small"
            :data="actionRows"
            :columns="[
              { title: '动作', key: 'action', width: 100 },
              { title: '码', key: 'code', width: 80 },
              { title: '帧', key: 'frames', width: 110 },
              {
                title: '命中',
                key: 'hit',
                width: 70,
                render: (r) =>
                  h(NTag, { size: 'tiny', type: r.hit ? 'success' : 'error', bordered: false }, {
                    default: () => (r.hit ? '✓' : '✗'),
                  }),
              },
              { title: '命中词', key: 'hitTokens', ellipsis: { tooltip: true } },
            ]"
          />
        </n-card>
        <n-card title="不匹配与建议" :bordered="false">
          <n-data-table
            size="small"
            :data="result.mismatches"
            :columns="[
              { title: '动作', key: 'action', width: 90 },
              {
                title: '级别',
                key: 'severity',
                width: 70,
                render: (r) =>
                  h(NTag, {
                    size: 'tiny',
                    type: r.severity === 'high' ? 'error' : 'warning',
                    bordered: false,
                  }, { default: () => r.severity || 'medium' }),
              },
              { title: '原因', key: 'reason', ellipsis: { tooltip: true } },
              { title: '建议', key: 'suggest', ellipsis: { tooltip: true } },
            ]"
          />
          <n-empty v-if="!result.mismatches.length" description="全部对齐，无 mismatch" />
        </n-card>
      </div>

      <n-card v-if="task" title="快捷跳转" :bordered="false" class="mt">
        <n-space>
          <n-button size="small" @click="router.push(`/vla/timeline/${task.id}`)">时间轴标注</n-button>
          <n-button size="small" @click="router.push(`/vla/action-analysis/${task.id}`)">动作分析</n-button>
          <n-button size="small" @click="router.push(`/vla/quality/${task.id}`)">质检门禁</n-button>
        </n-space>
      </n-card>
    </n-spin>
  </div>
</template>

<style scoped>
.page { max-width: 1100px; }
.head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
h2 { margin: 0 0 6px; font-size: 20px; }
p { margin: 0; color: #9a9aab; }
.inst { color: #e8e8ed; font-size: 15px; line-height: 1.6; }
.mb { margin-bottom: 12px; }
.mt { margin-top: 8px; }
.muted { color: #6e6e7a; font-size: 12px; }
.score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
.k { color: #8b8b9a; font-size: 12px; }
.v { margin: 4px 0; font-size: 24px; color: #63e2b7; font-weight: 700; }
.s { font-size: 12px; color: #6e6e7a; }
.mid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 12px; margin-bottom: 12px; }
.radar { height: 240px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 900px) {
  .score-grid, .grid2, .mid { grid-template-columns: 1fr; }
}
</style>
