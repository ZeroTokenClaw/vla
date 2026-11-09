<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { getLineage } from '@/services/evalBiz'

const router = useRouter()
const loading = ref(false)
const rootId = ref(undefined)
const graph = ref({ nodes: [], edges: [] })
const selected = ref(null)

const typeColor = {
  dataset: '#1677ff',
  annotation: '#722ed1',
  quality: '#52c41a',
  model: '#fa8c16',
  eval: '#eb2f96',
}

const rootOpts = computed(() =>
  (graph.value.nodes || [])
    .filter((n) => n.type === 'dataset' || n.type === 'model' || n.type === 'eval')
    .map((n) => ({ label: `${n.type} · ${n.label}`, value: n.id })),
)

const lanes = computed(() => {
  const order = ['dataset', 'annotation', 'quality', 'model', 'eval']
  const labels = { dataset: '数据集', annotation: '标注', quality: '质检', model: '模型', eval: '评测' }
  return order
    .map((type) => ({
      type,
      label: labels[type],
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
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    loading.value = false
  }
}

function selectNode(node) {
  selected.value = node
}

function jump(node) {
  selectNode(node)
  if (node.type === 'dataset') router.push('/system/datasets')
  else if (node.type === 'model') router.push('/system/models')
  else if (node.type === 'eval') router.push('/train/compare')
  else notification.info({ message: `节点 ${node.id}`, description: JSON.stringify(node.meta || {}), placement: 'topRight' })
}

onMounted(load)
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="数据·模型追溯：分泳道血缘（数据集 → 标注 → 质检 → 模型 → 评测），假数据可过滤根节点。"
    />
    <a-space style="margin-bottom: 12px" wrap>
      <a-select
        v-model:value="rootId"
        allow-clear
        show-search
        placeholder="按根节点过滤"
        style="width: 300px"
        :options="rootOpts"
        @change="load"
      />
      <a-button type="primary" :loading="loading" @click="load">刷新</a-button>
    </a-space>

    <a-spin :spinning="loading">
      <div class="lanes">
        <div v-for="lane in lanes" :key="lane.type" class="lane">
          <div class="lane-title" :style="{ color: lane.color }">{{ lane.label }}</div>
          <div
            v-for="n in lane.nodes"
            :key="n.id"
            class="node"
            :class="{ active: selected?.id === n.id }"
            :style="{ borderLeftColor: lane.color }"
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

      <a-row :gutter="12" style="margin-top: 14px">
        <a-col :span="10">
          <a-card title="选中节点" size="small">
            <template v-if="selected">
              <a-descriptions :column="1" size="small" bordered>
                <a-descriptions-item label="类型">{{ selected.type }}</a-descriptions-item>
                <a-descriptions-item label="名称">{{ selected.label }}</a-descriptions-item>
                <a-descriptions-item label="ID">{{ selected.id }}</a-descriptions-item>
                <a-descriptions-item v-for="(v, k) in selected.meta || {}" :key="k" :label="String(k)">
                  {{ v }}
                </a-descriptions-item>
              </a-descriptions>
              <a-button type="primary" size="small" style="margin-top: 12px" @click="jump(selected)">跳转关联页</a-button>
            </template>
            <a-empty v-else description="单击节点查看，双击跳转" />
          </a-card>
        </a-col>
        <a-col :span="14">
          <a-card title="关联血缘边" size="small">
            <div v-for="(ed, i) in relatedEdges" :key="i" class="edge">
              <code>{{ ed.from }}</code>
              <span class="rel">— {{ ed.relation }} →</span>
              <code>{{ ed.to }}</code>
            </div>
            <a-empty v-if="!relatedEdges.length" description="无血缘边" />
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<style scoped>
.lanes {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.lane {
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 10px;
  padding: 10px;
  min-height: 220px;
}
.lane-title {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-weight: 700;
}
.node {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left-width: 3px;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.node:hover { transform: translateY(-2px); }
.node.active { box-shadow: 0 0 0 1px #1677ff; }
.label { margin: 0 0 4px; font-weight: 600; color: #0f172a; font-size: 13px; }
code { font-size: 11px; color: #64748b; }
.meta { margin-top: 6px; display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #94a3b8; }
.edge { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; font-size: 12px; }
.rel { color: #1677ff; }
@media (max-width: 1100px) {
  .lanes { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
}
</style>
