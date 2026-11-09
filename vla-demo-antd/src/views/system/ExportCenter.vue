<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { listExports } from '@/services/factory'
import { exportJSON, exportCSV } from '@/utils/exportFiles'

const rows = ref([])
const loading = ref(false)
const filters = reactive({ status: undefined, format: undefined, keyword: '' })
const drawer = ref(false)
const current = ref(null)

const filtered = computed(() => {
  let list = rows.value
  if (filters.status) list = list.filter((r) => r.status === filters.status)
  if (filters.format) list = list.filter((r) => r.format === filters.format)
  if (filters.keyword) {
    const k = filters.keyword.toLowerCase()
    list = list.filter((r) => `${r.id}${r.name}${r.sourceId}`.toLowerCase().includes(k))
  }
  return list
})

const stats = computed(() => ({
  total: rows.value.length,
  ready: rows.value.filter((r) => r.status === 'ready').length,
  pending: rows.value.filter((r) => r.status !== 'ready').length,
  sizeMB: Number(rows.value.reduce((s, r) => s + (r.sizeMB || 0), 0).toFixed(1)),
}))

onMounted(async () => {
  loading.value = true
  try {
    const res = await listExports({ page: 1, pageSize: 50 })
    rows.value = res.items.map((r, i) => ({
      ...r,
      checksum: `sha256:${String(1000 + i).padStart(8, '0')}…${String(i * 17).padStart(4, '0')}`,
      schema: r.format === 'csv' ? 'flat_samples_v1' : 'adf_package_v2',
      includeMedia: i % 2 === 0,
      includeLabels: true,
      expiresAt: `2026-12-${String((i % 20) + 1).padStart(2, '0')} 23:59:59`,
      manifest: [
        { path: 'meta.json', bytes: 2048 + i * 120 },
        { path: 'samples/index.jsonl', bytes: 48000 + i * 900 },
        { path: 'labels/coco.json', bytes: r.format === 'json' ? 92000 + i * 400 : 0 },
        { path: 'README.md', bytes: 1200 },
      ].filter((f) => f.bytes > 0),
    }))
  } finally {
    loading.value = false
  }
})

function openDetail(row) {
  current.value = row
  drawer.value = true
}

async function download(row) {
  if (row.status !== 'ready') {
    notification.warning({ message: '任务未就绪', placement: 'topRight' })
    return
  }
  const payload = {
    exportId: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    schema: row.schema,
    checksum: row.checksum,
    generatedAt: new Date().toISOString(),
    note: 'ADF demo fake export package',
    records: Array.from({ length: 5 }).map((_, i) => ({ idx: i + 1, sample: `${row.sourceId}-${i}` })),
    manifest: row.manifest,
  }
  if (row.format === 'csv') {
    exportCSV(`${row.fileName.replace(/\.\w+$/, '')}.csv`, payload.records)
  } else {
    exportJSON(row.fileName.replace(/\.\w+$/, '') + '.json', payload)
  }
  notification.success({ message: `已下载 ${row.id}`, placement: 'topRight' })
}

const cols = [
  { title: '导出 ID', dataIndex: 'id', width: 130 },
  { title: '名称', dataIndex: 'name' },
  { title: '格式', dataIndex: 'format', width: 80 },
  { title: '来源', key: 'source', width: 200 },
  { title: 'Schema', dataIndex: 'schema', width: 140 },
  { title: '大小(MB)', dataIndex: 'sizeMB', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', key: 'op', width: 140 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="导出中心：伪造包清单 / checksum / schema / 过期时间；下载生成本地假 JSON/CSV，无真实对象存储。"
    />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="导出任务" :value="stats.total" /></a-col>
      <a-col :span="6"><a-statistic title="就绪" :value="stats.ready" /></a-col>
      <a-col :span="6"><a-statistic title="进行中" :value="stats.pending" /></a-col>
      <a-col :span="6"><a-statistic title="总量 MB" :value="stats.sizeMB" :precision="1" /></a-col>
    </a-row>
    <a-space style="margin-bottom: 12px" wrap>
      <a-input v-model:value="filters.keyword" placeholder="搜索 ID/名称" style="width: 180px" allow-clear />
      <a-select
        v-model:value="filters.status"
        allow-clear
        placeholder="状态"
        style="width: 120px"
        :options="['ready', 'packing', 'failed', 'expired'].map((s) => ({ value: s, label: s }))"
      />
      <a-select
        v-model:value="filters.format"
        allow-clear
        placeholder="格式"
        style="width: 100px"
        :options="['json', 'csv', 'coco', 'parquet'].map((s) => ({ value: s, label: s }))"
      />
    </a-space>
    <a-table :loading="loading" :columns="cols" :data-source="filtered" row-key="id" size="small">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'source'">{{ record.sourceType }} / {{ record.sourceId }}</template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 'ready' ? 'success' : record.status === 'failed' ? 'error' : 'processing'">
            {{ record.status }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
          <a-button type="link" size="small" @click="download(record)">下载</a-button>
        </template>
      </template>
    </a-table>

    <a-drawer v-model:open="drawer" width="480" :title="current?.name || '导出详情'">
      <template v-if="current">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="ID">{{ current.id }}</a-descriptions-item>
          <a-descriptions-item label="格式 / Schema">{{ current.format }} / {{ current.schema }}</a-descriptions-item>
          <a-descriptions-item label="来源">{{ current.sourceType }} / {{ current.sourceId }}</a-descriptions-item>
          <a-descriptions-item label="Checksum">{{ current.checksum }}</a-descriptions-item>
          <a-descriptions-item label="含媒体">{{ current.includeMedia ? '是' : '否' }}</a-descriptions-item>
          <a-descriptions-item label="含标签">{{ current.includeLabels ? '是' : '否' }}</a-descriptions-item>
          <a-descriptions-item label="过期">{{ current.expiresAt }}</a-descriptions-item>
          <a-descriptions-item label="大小">{{ current.sizeMB }} MB</a-descriptions-item>
        </a-descriptions>
        <h4 style="margin: 14px 0 8px">包内清单（伪造）</h4>
        <a-table
          size="small"
          :pagination="false"
          row-key="path"
          :data-source="current.manifest"
          :columns="[
            { title: '路径', dataIndex: 'path' },
            { title: 'Bytes', dataIndex: 'bytes', width: 100 },
          ]"
        />
        <a-button type="primary" style="margin-top: 16px" @click="download(current)">下载演示包</a-button>
      </template>
    </a-drawer>
  </div>
</template>
