<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import {
  listWorkflows,
  getWorkflow,
  saveWorkflow,
  publishWorkflow,
  createWorkflowDraft,
  listMeta,
} from '@/services/factory'

const route = useRoute()
const router = useRouter()
const meta = listMeta()
const loading = ref(false)
const list = ref([])
const currentId = ref('')
const wf = ref(null)
const selectedKey = ref('')
const runLogs = ref([])

const selectedNode = computed(() => wf.value?.nodes?.find((n) => n.key === selectedKey.value) || null)

const groups = computed(() => {
  const map = {}
  for (const n of meta.nodeCatalog) {
    ;(map[n.group] ||= []).push(n)
  }
  return map
})

async function loadList() {
  const res = await listWorkflows({ page: 1, pageSize: 50 })
  list.value = res.items
  if (!currentId.value) {
    currentId.value = route.params.id || list.value[0]?.id
  }
}

async function loadWf() {
  if (!currentId.value) return
  loading.value = true
  try {
    wf.value = await getWorkflow(currentId.value)
    selectedKey.value = wf.value.nodes[0]?.key || ''
    router.replace(`/factory/workflows/${currentId.value}`)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadList()
  await loadWf()
})

watch(currentId, loadWf)

function addNode(type) {
  if (!wf.value) return
  if (wf.value.status === 'published') {
    notification.warning({ message: '已发布流程请先另存草稿', placement: 'topRight' })
    return
  }
  const i = wf.value.nodes.length
  const cat = meta.nodeCatalog.find((n) => n.type === type)
  const key = `n${Date.now().toString().slice(-6)}`
  const node = {
    key,
    type,
    label: cat?.label || type,
    params: { ...(cat ? {} : {}), note: 'demo' },
    retry: { maxRetries: 2, backoffSec: 5 },
    x: 40 + (i % 4) * 200,
    y: 40 + Math.floor(i / 4) * 120,
  }
  wf.value.nodes.push(node)
  if (wf.value.nodes.length > 1) {
    const prev = wf.value.nodes[wf.value.nodes.length - 2]
    wf.value.edges.push({ from: prev.key, to: key, when: 'always' })
  }
  selectedKey.value = key
}

async function onSave() {
  try {
    await saveWorkflow(wf.value.id, {
      nodes: wf.value.nodes,
      edges: wf.value.edges,
      name: wf.value.name,
      description: wf.value.description,
    })
    notification.success({ message: '流程已保存', placement: 'topRight' })
    await loadList()
  } catch (e) {
    notification.error({ message: e.message || String(e), placement: 'topRight' })
  }
}

async function onPublish() {
  const res = await publishWorkflow(wf.value.id)
  wf.value = res
  notification.success({ message: `已发布 v${res.version}`, placement: 'topRight' })
  await loadList()
}

async function onNewDraft() {
  const types = ['import', 'parse', 'human_annotate', 'quality_check', 'export']
  const draft = await createWorkflowDraft({ name: '新生产流程草稿', nodeTypes: types })
  await loadList()
  currentId.value = draft.id
  notification.success({ message: `已创建 ${draft.id}`, placement: 'topRight' })
}

function simulateRun() {
  if (!wf.value) return
  runLogs.value = []
  const nodes = wf.value.nodes
  let i = 0
  const timer = setInterval(() => {
    if (i >= nodes.length) {
      runLogs.value.push(`[DONE] pipeline finished · ${nodes.length} nodes`)
      clearInterval(timer)
      return
    }
    const n = nodes[i]
    runLogs.value.push(`[RUN] ${n.key} ${n.type} · fake executor ok`)
    i += 1
  }, 350)
}

const paramForm = reactive({})
watch(selectedNode, (n) => {
  Object.keys(paramForm).forEach((k) => delete paramForm[k])
  if (n?.params) Object.assign(paramForm, n.params)
})

function applyParams() {
  if (!selectedNode.value) return
  selectedNode.value.params = { ...paramForm }
  notification.success({ message: '节点参数已写入内存（未持久化到后端）', placement: 'topRight' })
}

function removeSelected() {
  if (!wf.value || !selectedNode.value || wf.value.status === 'published') return
  const key = selectedNode.value.key
  wf.value.nodes = wf.value.nodes.filter((n) => n.key !== key)
  wf.value.edges = wf.value.edges.filter((e) => e.from !== key && e.to !== key)
  selectedKey.value = wf.value.nodes[0]?.key || ''
}
</script>

<template>
  <a-spin :spinning="loading">
    <a-row :gutter="12">
      <a-col :span="5">
        <a-card size="small" title="流程模板">
          <a-select
            v-model:value="currentId"
            style="width: 100%; margin-bottom: 8px"
            :options="list.map((w) => ({ value: w.id, label: `${w.name} (${w.status})` }))"
          />
          <a-space>
            <a-button size="small" @click="onNewDraft">新建草稿</a-button>
            <a-button size="small" type="primary" ghost @click="simulateRun">试运行</a-button>
          </a-space>
        </a-card>
        <a-card size="small" title="节点库" style="margin-top: 8px">
          <div v-for="(nodes, g) in groups" :key="g" class="group">
            <div class="g-title">{{ g }}</div>
            <a-space wrap>
              <a-tag
                v-for="n in nodes"
                :key="n.type"
                :color="n.color"
                style="cursor: pointer"
                @click="addNode(n.type)"
              >{{ n.label }}</a-tag>
            </a-space>
          </div>
        </a-card>
      </a-col>

      <a-col :span="13">
        <a-card size="small">
          <template #title>
            <span v-if="wf">{{ wf.name }} · v{{ wf.version }} · {{ wf.status }}</span>
          </template>
          <template #extra>
            <a-space>
              <a-button size="small" :disabled="!wf || wf.status === 'published'" @click="onSave">保存</a-button>
              <a-button size="small" type="primary" :disabled="!wf" @click="onPublish">发布版本</a-button>
            </a-space>
          </template>
          <p class="desc" v-if="wf">{{ wf.description }}</p>
          <div class="canvas" v-if="wf">
            <div
              v-for="(n, idx) in wf.nodes"
              :key="n.key"
              class="node"
              :class="{ active: n.key === selectedKey }"
              :style="{ left: `${n.x}px`, top: `${n.y}px`, borderColor: meta.nodeCatalog.find((c) => c.type === n.type)?.color }"
              @click="selectedKey = n.key"
            >
              <div class="idx">{{ idx + 1 }}</div>
              <div class="label">{{ n.label }}</div>
              <div class="type">{{ n.type }}</div>
            </div>
            <svg class="edges" v-if="wf.edges?.length">
              <line
                v-for="(e, i) in wf.edges"
                :key="i"
                :x1="(wf.nodes.find((n) => n.key === e.from)?.x || 0) + 70"
                :y1="(wf.nodes.find((n) => n.key === e.from)?.y || 0) + 36"
                :x2="(wf.nodes.find((n) => n.key === e.to)?.x || 0) + 10"
                :y2="(wf.nodes.find((n) => n.key === e.to)?.y || 0) + 36"
                stroke="#94a3b8"
                stroke-width="2"
                marker-end="url(#arrow)"
              />
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                </marker>
              </defs>
            </svg>
          </div>
          <a-card v-if="runLogs.length" size="small" title="试运行日志" style="margin-top: 8px">
            <pre class="logs">{{ runLogs.join('\n') }}</pre>
          </a-card>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card size="small" title="节点参数">
          <template v-if="selectedNode">
            <p><b>{{ selectedNode.label }}</b> <a-tag>{{ selectedNode.type }}</a-tag></p>
            <a-form layout="vertical" size="small">
              <a-form-item v-for="(v, k) in paramForm" :key="k" :label="String(k)">
                <a-input v-if="typeof v !== 'object'" v-model:value="paramForm[k]" />
                <a-textarea v-else :value="JSON.stringify(v)" :rows="2" @change="(e) => { try { paramForm[k] = JSON.parse(e.target.value) } catch (_) {} }" />
              </a-form-item>
              <a-form-item label="失败重试次数">
                <a-input-number v-model:value="selectedNode.retry.maxRetries" :min="0" :max="5" style="width: 100%" />
              </a-form-item>
            </a-form>
            <a-space>
              <a-button type="primary" size="small" @click="applyParams">应用参数</a-button>
              <a-button danger size="small" :disabled="wf?.status === 'published'" @click="removeSelected">删除节点</a-button>
            </a-space>
          </template>
          <a-empty v-else description="选择画布节点" />
        </a-card>
        <a-card size="small" title="连线" style="margin-top: 8px" v-if="wf">
          <div v-for="(e, i) in wf.edges" :key="i" class="edge-row">{{ e.from }} → {{ e.to }} · {{ e.when }}</div>
        </a-card>
      </a-col>
    </a-row>
  </a-spin>
</template>

<style scoped>
.group { margin-bottom: 10px; }
.g-title { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.desc { color: #64748b; font-size: 13px; }
.canvas {
  position: relative;
  min-height: 360px;
  background: linear-gradient(90deg, #f8fafc 1px, transparent 1px) 0 0 / 20px 20px,
    linear-gradient(#f8fafc 1px, transparent 1px) 0 0 / 20px 20px,
    #fff;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
  overflow: auto;
}
.edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.node {
  position: absolute;
  width: 140px;
  background: #fff;
  border: 2px solid #1677ff;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  box-shadow: 0 4px 12px #0f172a0d;
  z-index: 1;
}
.node.active { outline: 2px solid #69b1ff; }
.idx {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #0f172a;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.label { font-weight: 600; font-size: 13px; }
.type { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.logs {
  margin: 0;
  max-height: 140px;
  overflow: auto;
  font-size: 12px;
  background: #0f172a;
  color: #e2e8f0;
  padding: 8px;
  border-radius: 6px;
}
.edge-row { font-size: 12px; color: #475569; margin-bottom: 4px; }
</style>
