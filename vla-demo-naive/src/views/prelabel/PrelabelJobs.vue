<script setup>
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NProgress, NTag } from 'naive-ui'
import { listTextDocs, listVisionImages, listAcceptJobs } from '@/services/prelabel'
import { message } from '@/ui/discrete'

const router = useRouter()
const loading = ref(false)
const rows = ref([])
const kind = ref(null)
const keyword = ref('')

const kindOpts = [
  { label: '文本', value: 'text' },
  { label: '视觉', value: 'vision' },
  { label: '验收', value: 'accept' },
]

const columns = [
  { title: 'ID', key: 'id', width: 150 },
  {
    title: '类型',
    key: 'kind',
    width: 80,
    render: (r) =>
      h(NTag, { size: 'small', bordered: false, type: r.kind === 'text' ? 'info' : r.kind === 'vision' ? 'success' : 'warning' }, { default: () => r.kind }),
  },
  { title: '标题', key: 'title', ellipsis: { tooltip: true } },
  { title: '状态', key: 'status', width: 100 },
  {
    title: '进度',
    key: 'progress',
    width: 140,
    render: (r) =>
      h(NProgress, {
        type: 'line',
        percentage: r.progress ?? (r.status === 'done' || r.status === 'accepted' ? 100 : 40),
        showIndicator: true,
      }),
  },
  {
    title: '模式',
    key: 'sourceMode',
    width: 90,
    render: (r) => h(NTag, { size: 'small', type: 'warning', bordered: false }, { default: () => r.sourceMode }),
  },
  { title: '备注', key: 'note', width: 140, ellipsis: { tooltip: true } },
  {
    title: '打开',
    key: 'path',
    width: 90,
    render(row) {
      return h(
        NButton,
        { size: 'tiny', quaternary: true, type: 'primary', onClick: () => router.push(row.path) },
        { default: () => '进入' },
      )
    },
  },
]

const filtered = ref([])

function applyFilter() {
  let list = rows.value
  if (kind.value) list = list.filter((r) => r.kind === kind.value)
  if (keyword.value) {
    const kw = keyword.value.trim()
    list = list.filter((r) => r.id.includes(kw) || (r.title || '').includes(kw))
  }
  filtered.value = list
}

async function load() {
  loading.value = true
  try {
    const [texts, visions, accepts] = await Promise.all([
      listTextDocs({ page: 1, pageSize: 50 }),
      listVisionImages({ page: 1, pageSize: 50 }),
      listAcceptJobs({ page: 1, pageSize: 50 }),
    ])
    rows.value = [
      ...texts.items.map((t) => ({
        id: t.id,
        kind: 'text',
        title: t.title,
        status: t.status,
        progress: t.progressPct ?? 55,
        sourceMode: 'demo',
        note: t.hasCorrection ? '含人工 Diff' : '待修正',
        path: `/prelabel/text/${t.id}`,
      })),
      ...visions.items.map((v) => ({
        id: v.id,
        kind: 'vision',
        title: v.title || v.name || v.id,
        status: v.status,
        progress: v.ocrCorrected || v.yoloCorrected ? 85 : 45,
        sourceMode: 'demo',
        note: 'OCR + YOLO',
        path: `/prelabel/vision/${v.id}`,
      })),
      ...(accepts.items || []).map((a) => ({
        id: a.id,
        kind: 'accept',
        title: a.title || a.name || a.id,
        status: a.status || a.step,
        progress: typeof a.stepIndex === 'number' ? Math.min(100, (a.stepIndex + 1) * 25) : 50,
        sourceMode: 'demo',
        note: '验收向导',
        path: `/prelabel/accept/${a.id}`,
      })),
    ]
    applyFilter()
    message.info(`预标队列 ${rows.value.length} 条（演示假数据）`)
  } catch (e) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>预标注任务队列</h2>
        <p>文本 / 视觉 / 验收统一队列 · 进度与模式标识（假数据可筛选）</p>
      </div>
      <n-tag type="warning" :bordered="false">source_mode = demo</n-tag>
    </div>

    <n-card :bordered="false" class="mb">
      <n-space>
        <n-input v-model:value="keyword" clearable placeholder="搜索 ID/标题" style="width: 180px" @keyup.enter="applyFilter" />
        <n-select v-model:value="kind" clearable placeholder="类型" style="width: 120px" :options="kindOpts" @update:value="applyFilter" />
        <n-button type="primary" :loading="loading" @click="load">刷新</n-button>
        <n-button @click="applyFilter">筛选</n-button>
      </n-space>
      <div class="sum">
        合计 {{ filtered.length }} · 文本 {{ rows.filter((r) => r.kind === 'text').length }} · 视觉
        {{ rows.filter((r) => r.kind === 'vision').length }} · 验收
        {{ rows.filter((r) => r.kind === 'accept').length }}
      </div>
    </n-card>

    <n-card :bordered="false">
      <n-data-table size="small" :data="filtered" :columns="columns" :loading="loading" :pagination="{ pageSize: 10 }" />
    </n-card>
  </div>
</template>

<style scoped>
.page { max-width: 1100px; }
.head { display: flex; justify-content: space-between; margin-bottom: 14px; align-items: flex-start; }
h2 { margin: 0 0 6px; font-size: 20px; }
p { margin: 0; color: #9a9aab; }
.mb { margin-bottom: 12px; }
.sum { margin-top: 10px; font-size: 12px; color: #8b8b9a; }
:deep(.n-card) { background: #14141c; }
</style>
