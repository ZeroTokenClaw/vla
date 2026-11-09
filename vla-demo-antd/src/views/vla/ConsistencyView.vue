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
const result = ref(null)

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

const actionRows = computed(() => {
  if (!result.value || !task.value) return []
  const tokens = (result.value.tokens || []).map((t) => t.toLowerCase())
  return (task.value.actions || []).map((a) => {
    const blob = `${a.name || ''} ${a.action || a.type || ''} ${a.actionLabel || ''} ${a.instruction || a.desc || ''}`.toLowerCase()
    const hitTokens = tokens.filter((t) => t.length > 1 && blob.includes(t))
    return {
      id: a.id,
      action: a.actionLabel || a.action || a.name || a.type,
      frames: `F${a.startFrame}–${a.endFrame}`,
      instruction: a.instruction || '—',
      hit: hitTokens.length > 0,
      hitTokens: hitTokens.join(', ') || '—',
    }
  })
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
  } catch (e) {
    notification.error({ message: e.message || '加载失败', placement: 'topRight' })
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
  for (const a of actions) {
    const code = a.action || a.type || ''
    const blob = `${a.name || ''} ${code} ${a.actionLabel || ''} ${a.instruction || a.desc || ''}`.toLowerCase()
    const lex = actionLexicon[code] || []
    const matched = tokens.some((t) => blob.includes(t.toLowerCase())) || lex.some((w) => instruction.includes(w))
    if (matched) hits += 1
    else {
      mismatches.push({
        actionId: a.id,
        action: a.actionLabel || code,
        reason: `动作「${a.actionLabel || code}」未与指令关键词对齐`,
        suggest: lex[0] ? `指令可补充「${lex[0]}」相关表述` : '检查指令是否覆盖该动作段',
      })
    }
  }
  if (!instruction) {
    mismatches.unshift({ actionId: '-', action: '-', reason: '缺少任务指令文本', suggest: '在时间轴补充 instruction' })
  }
  const coverage = actions.length ? hits / actions.length : 0
  const nodes = task.value.keyNodes || task.value.nodes || actions.filter((a) => a.keyNode)
  const nodeCover = nodes.length > 0 ? Math.min(1, nodes.length / Math.max(3, actions.length * 0.4)) : 0.35
  const stepAlign = actions.length ? Math.min(1, actions.length / Math.max(3, tokens.length || 3)) : 0
  const score = Number((coverage * 0.55 + nodeCover * 0.25 + stepAlign * 0.2).toFixed(3))
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
  }
  if (toast) notification.success({ message: `一致性评分 ${score}（${grade}）`, placement: 'topRight' })
}

onMounted(async () => {
  await loadList()
  const id = route.params.id || tasks.value[0]?.id
  if (id && !route.params.id) router.replace(`/vla/consistency/${id}`)
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
      message="指令·动作一致性：关键词命中 · 动作词表对齐 · 关键节点覆盖 · 步骤密度（演示规则引擎，非 LLM）。"
    />
    <a-space style="margin-bottom: 12px" wrap>
      <a-select
        :value="route.params.id"
        style="width: 360px"
        :options="tasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.name}` }))"
        @change="(id) => router.push(`/vla/consistency/${id}`)"
      />
      <a-button type="primary" :disabled="!task" :loading="loading" @click="() => analyze(true)">重新计算</a-button>
      <a-button @click="router.push(`/vla/action-analysis/${route.params.id}`)">动作分析</a-button>
      <a-button @click="router.push(`/vla/timeline/${route.params.id}`)">时间轴</a-button>
    </a-space>

    <a-spin :spinning="loading">
      <a-card v-if="task" title="当前样本指令" size="small" style="margin-bottom: 12px">
        <p class="inst">{{ result?.instruction || task.instruction || task.textNote || '（空）' }}</p>
        <a-space v-if="result?.tokens?.length" wrap style="margin-top: 8px">
          <a-tag v-for="t in result.tokens" :key="t">{{ t }}</a-tag>
        </a-space>
      </a-card>

      <a-row v-if="result" :gutter="12" style="margin-bottom: 12px">
        <a-col :span="6">
          <a-card size="small">
            <div class="k">综合分</div>
            <div class="v">{{ result.score }}</div>
            <a-tag color="success">{{ result.grade }}</a-tag>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small">
            <div class="k">动作命中率</div>
            <div class="v">{{ result.coverage }}</div>
            <div class="s">{{ result.hits }}/{{ result.actionCount }}</div>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small">
            <div class="k">关键节点覆盖</div>
            <div class="v">{{ result.nodeCover }}</div>
            <div class="s">{{ result.nodeCount }} 节点</div>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small">
            <div class="k">步骤对齐</div>
            <div class="v">{{ result.stepAlign }}</div>
            <div class="s">{{ result.method }}</div>
          </a-card>
        </a-col>
      </a-row>

      <a-row v-if="result" :gutter="12">
        <a-col :span="12">
          <a-card title="动作对齐明细" size="small">
            <a-table
              size="small"
              row-key="id"
              :pagination="false"
              :data-source="actionRows"
              :columns="[
                { title: '动作', dataIndex: 'action', width: 100 },
                { title: '帧', dataIndex: 'frames', width: 110 },
                { title: '命中', key: 'hit', width: 70 },
                { title: '命中词', dataIndex: 'hitTokens', ellipsis: true },
              ]"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'hit'">
                  <a-tag :color="record.hit ? 'success' : 'error'">{{ record.hit ? '✓' : '✗' }}</a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="不匹配与建议" size="small">
            <a-table
              size="small"
              row-key="actionId"
              :pagination="false"
              :data-source="result.mismatches"
              :columns="[
                { title: '动作', dataIndex: 'action', width: 100 },
                { title: '原因', dataIndex: 'reason', ellipsis: true },
                { title: '建议', dataIndex: 'suggest', ellipsis: true },
              ]"
            />
            <a-empty v-if="!result.mismatches.length" description="全部对齐，无 mismatch" />
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<style scoped>
.inst { margin: 0; color: #0f172a; font-size: 15px; line-height: 1.6; }
.k { color: #8c8c8c; font-size: 12px; }
.v { margin: 4px 0; font-size: 24px; color: #1677ff; font-weight: 700; }
.s { font-size: 12px; color: #8c8c8c; }
</style>
