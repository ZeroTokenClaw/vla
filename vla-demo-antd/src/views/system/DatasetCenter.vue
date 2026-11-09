<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { DATASETS } from '@/mock/factory'
import { exportJSON, exportCSV } from '@/utils/exportFiles'

const router = useRouter()
const filterModality = ref(undefined)
const keyword = ref('')

const rows = ref(
  DATASETS.map((d, i) => ({
    ...d,
    version: `v${1 + (i % 3)}.${i}.0`,
    source: ['annotation', 'prelabel', 'vla_reflux', 'import'][i % 4],
    qualifiedRate: Number((0.86 + (i % 5) * 0.02).toFixed(3)),
    updatedAt: `2026-11-0${(i % 8) + 1} 14:20:00`,
    owner: ['周明轩', '林晓萱', '陈思远'][i % 3],
    lineageHint: i % 2 === 0 ? 'DS-ADF-VLA-001' : 'DS-ADF-DET-001',
    tags: [
      ['仓储', '抓取'],
      ['检测', '料箱'],
      ['OCR', '工单'],
      ['分割', '掩码'],
    ][i % 4],
    storagePath: `s3://adf-demo/${d.id}/`,
    license: 'Internal-Demo',
  })),
)

const selected = ref(rows.value[0]?.id)
const current = computed(() => rows.value.find((r) => r.id === selected.value))

const filtered = computed(() => {
  let list = rows.value
  if (filterModality.value) list = list.filter((r) => r.modality === filterModality.value)
  if (keyword.value) {
    const k = keyword.value.toLowerCase()
    list = list.filter((r) => `${r.id}${r.name}${r.owner}`.toLowerCase().includes(k))
  }
  return list
})

const samples = computed(() => {
  if (!current.value) return []
  return Array.from({ length: 16 }).map((_, i) => ({
    id: `${current.value.id}-S${String(i + 1).padStart(3, '0')}`,
    modality: current.value.modality,
    status: ['raw', 'annotated', 'accepted', 'rejected', 'refluxed'][i % 5],
    uri: `mock://datasets/${current.value.id}/${i + 1}`,
    quality: Number((0.72 + (i % 8) * 0.03).toFixed(2)),
    labels: i % 3 === 0 ? 0 : 2 + (i % 5),
    updatedAt: `2026-11-08 ${10 + (i % 8)}:0${i % 6}:00`,
  }))
})

const sampleStats = computed(() => {
  const s = samples.value
  return {
    total: s.length,
    accepted: s.filter((x) => x.status === 'accepted').length,
    rejected: s.filter((x) => x.status === 'rejected').length,
    avgQ: s.length ? Number((s.reduce((a, b) => a + b.quality, 0) / s.length).toFixed(2)) : 0,
  }
})

function exportMeta() {
  if (!current.value) return
  exportJSON(`${current.value.id}-meta.json`, {
    dataset: current.value,
    samples: samples.value,
    note: 'ADF demo fake dataset package',
  })
  notification.success({ message: '已导出数据集元数据 JSON', placement: 'topRight' })
}

function exportSampleCsv() {
  exportCSV(`${current.value.id}-samples.csv`, samples.value)
  notification.success({ message: '已导出样本 CSV', placement: 'topRight' })
}

const dsCols = [
  { title: '数据集', dataIndex: 'name' },
  { title: 'ID', dataIndex: 'id', width: 140 },
  { title: '模态', dataIndex: 'modality', width: 100 },
  { title: '版本', dataIndex: 'version', width: 90 },
  { title: '样本量', dataIndex: 'samples', width: 90 },
  { title: '合格率', dataIndex: 'qualifiedRate', width: 90 },
  { title: '来源', dataIndex: 'source', width: 110 },
]

const sampleCols = [
  { title: '样本 ID', dataIndex: 'id' },
  { title: '状态', key: 'status', width: 100 },
  { title: '质量分', dataIndex: 'quality', width: 80 },
  { title: '标签数', dataIndex: 'labels', width: 80 },
  { title: 'URI', dataIndex: 'uri', ellipsis: true },
  { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="数据集中心：台账 · 样本浏览器 · 质量分布 · 血缘跳转（无真实对象存储）。"
    />
    <a-space style="margin-bottom: 12px" wrap>
      <a-input v-model:value="keyword" placeholder="搜索数据集" style="width: 180px" allow-clear />
      <a-select
        v-model:value="filterModality"
        allow-clear
        placeholder="模态"
        style="width: 140px"
        :options="[...new Set(rows.map((r) => r.modality))].map((m) => ({ value: m, label: m }))"
      />
      <a-button @click="router.push('/train/lineage')">打开血缘</a-button>
    </a-space>

    <a-row :gutter="12">
      <a-col :span="14">
        <a-card title="数据集列表" size="small">
          <a-table
            :columns="dsCols"
            :data-source="filtered"
            row-key="id"
            size="small"
            :pagination="false"
            :custom-row="(record) => ({ onClick: () => (selected = record.id), style: { cursor: 'pointer' } })"
            :row-class-name="(record) => (record.id === selected ? 'row-active' : '')"
          />
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card v-if="current" size="small" :title="current.name">
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="ID">{{ current.id }}</a-descriptions-item>
            <a-descriptions-item label="版本">{{ current.version }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{ current.owner }}</a-descriptions-item>
            <a-descriptions-item label="合格率">{{ current.qualifiedRate }}</a-descriptions-item>
            <a-descriptions-item label="存储">{{ current.storagePath }}</a-descriptions-item>
            <a-descriptions-item label="许可">{{ current.license }}</a-descriptions-item>
            <a-descriptions-item label="标签">
              <a-tag v-for="t in current.tags" :key="t" color="blue">{{ t }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="更新">{{ current.updatedAt }}</a-descriptions-item>
          </a-descriptions>
          <a-space style="margin-top: 12px" wrap>
            <a-button type="primary" @click="exportMeta">导出 JSON</a-button>
            <a-button @click="exportSampleCsv">导出样本 CSV</a-button>
            <a-button @click="router.push('/train/lineage')">血缘 {{ current.lineageHint }}</a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="12" style="margin-top: 12px">
      <a-col :span="6"><a-statistic title="样本页计数" :value="sampleStats.total" /></a-col>
      <a-col :span="6"><a-statistic title="已验收" :value="sampleStats.accepted" /></a-col>
      <a-col :span="6"><a-statistic title="已驳回" :value="sampleStats.rejected" /></a-col>
      <a-col :span="6"><a-statistic title="均质量分" :value="sampleStats.avgQ" :precision="2" /></a-col>
    </a-row>

    <a-card title="样本浏览器（伪造）" style="margin-top: 12px" size="small">
      <a-table :columns="sampleCols" :data-source="samples" row-key="id" size="small" :pagination="{ pageSize: 8 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag
              :color="
                record.status === 'accepted'
                  ? 'success'
                  : record.status === 'rejected'
                    ? 'error'
                    : record.status === 'annotated'
                      ? 'processing'
                      : 'default'
              "
            >
              {{ record.status }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
:deep(.row-active) td { background: #e6f4ff !important; }
</style>
