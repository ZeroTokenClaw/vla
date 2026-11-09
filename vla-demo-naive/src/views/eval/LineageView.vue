<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getLineage } from '@/services/evalBiz'
import { message } from '@/ui/discrete'

const router = useRouter()
const loading = ref(false)
const rootId = ref(null)
const graph = ref({ nodes: [], edges: [] })
const selected = ref(null)

const rootOpts = computed(() =>
  (graph.value.nodes || [])
    .filter((n) => n.type === 'dataset' || n.type === 'model' || n.type === 'eval')
    .map((n) => ({ label: `${n.type} · ${n.label}`, value: n.id })),
)

const typeColor = {
  dataset: '#70c0e8',
  annotation: '#63e2b7',
  quality: '#18a058',
  model: '#f0a020',
  eval: '#e88080',
}

const lanes = computed(() => {
  const order = ['dataset', 'annotation', 'quality', 'model', 'eval']
  return order
    .map((type) => ({
      type,
      label: { dataset: '数据集', annotation: '标注', quality: '质检', model: '模型', eval: '评测' }[type],
      color: typeColor[type],
      nodes: (graph.value.nodes || []).filter((n) => n.type === type),
    }))
    .filter((l) => l.nodes.length)
})

const relatedEdges = computed(() => {
  if (!selected.value) return graph.value.edges || []
  const id = selected.value.id
  return (graph.value.edges || []).filter((e) => e.from === id || e.to === id)
})

async function load() {
  loading.value = true
  try {
    graph.value = await getLineage(rootId.value || undefined)
    if (selected.value && !(graph.value.nodes || []).some((n) => n.id === selected.value.id)) {
      selected.value = null
    }
  } catch (e) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

function selectNode(node) {
  selected.value = node
}

function jump(node) {
  selectNode(node)
  if (node.type === 'dataset') router.push(`/datasets/${node.id}/samples`)
  else if (node.type === 'model') router.push('/eval/models')
  else if (node.type === 'eval') router.push('/eval/compare')
  else message.info(`节点 ${node.id} · ${JSON.stringify(node.meta || {})}`)
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>数据 · 模型追溯</h2>
        <p>分泳道血缘：数据集 → 标注 → 质检 → 模型 → 评测（假数据，可过滤根节点）</p>
      </div>
      <n-space>
        <n-select
          v-model:value="rootId"
          clearable
          filterable
          placeholder="按根节点过滤"
          style="width: 280px"
          :options="rootOpts"
          @update:value="load"
        />
        <n-button type="primary" :loading="loading" @click="load">刷新</n-button>
      </n-space>
    </div>

    <n-spin :show="loading">
      <div class="lanes">
        <div v-for="lane in lanes" :key="lane.type" class="lane">
          <div class="lane-title" :style="{ color: lane.color }">{{ lane.label }}</div>
          <div
            v-for="n in lane.nodes"
            :key="n.id"
            class="node"
            :class="{ active: selected?.id === n.id }"
            :style="{ borderColor: lane.color }"
            @click="selectNode(n)"
            @dblclick="jump(n)"
          >
            <div class="label">{{ n.label }}</div>
            <code>{{ n.id }}</code>
            <div v-if="n.meta" class="meta">
              <span v-for="(v, k) in n.meta" :key="k">{{ k }}={{ v }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bottom">
        <n-card title="选中节点" :bordered="false">
          <template v-if="selected">
            <n-descriptions :column="1" size="small" label-placement="left" bordered>
              <n-descriptions-item label="类型">{{ selected.type }}</n-descriptions-item>
              <n-descriptions-item label="名称">{{ selected.label }}</n-descriptions-item>
              <n-descriptions-item label="ID">{{ selected.id }}</n-descriptions-item>
              <n-descriptions-item v-for="(v, k) in selected.meta || {}" :key="k" :label="String(k)">
                {{ v }}
              </n-descriptions-item>
            </n-descriptions>
            <n-button class="mt" size="small" type="primary" @click="jump(selected)">跳转关联页</n-button>
          </template>
          <n-empty v-else description="单击节点查看，双击跳转" />
        </n-card>

        <n-card title="关联血缘边" :bordered="false">
          <div v-for="(ed, i) in relatedEdges" :key="i" class="edge">
            <code>{{ ed.from }}</code>
            <span class="rel">— {{ ed.relation }} →</span>
            <code>{{ ed.to }}</code>
          </div>
          <n-empty v-if="!relatedEdges.length" description="无血缘边" />
        </n-card>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
h2 { margin: 0 0 6px; font-size: 20px; }
p { margin: 0; color: #9a9aab; }
.lanes {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.lane {
  background: #101018;
  border: 1px solid #2a2a36;
  border-radius: 10px;
  padding: 10px;
  min-height: 220px;
}
.lane-title {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-weight: 700;
}
.node {
  background: #14141c;
  border: 1px solid #2a2a36;
  border-left-width: 3px;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.node:hover { transform: translateY(-2px); }
.node.active { box-shadow: 0 0 0 1px #63e2b7; }
.label { margin: 0 0 4px; font-weight: 600; color: #e8e8ed; font-size: 13px; }
code { font-size: 11px; color: #8b8b9a; }
.meta { margin-top: 6px; display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #6e6e7a; }
.bottom { margin-top: 14px; display: grid; grid-template-columns: 1fr 1.4fr; gap: 12px; }
.edge { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.rel { color: #63e2b7; font-size: 12px; }
.mt { margin-top: 12px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 1100px) {
  .lanes { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
  .bottom { grid-template-columns: 1fr; }
}
</style>
