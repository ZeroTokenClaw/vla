<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NTag } from 'naive-ui'
import { getEvalModel, listEvalModels } from '@/services/evalBiz'
import { listMeta } from '@/services/train'
import { message } from '@/ui/discrete'

const router = useRouter()
const loading = ref(false)
const models = ref([])
const meta = ref({ algorithms: [], gpus: [] })
const algo = ref(null)
const drawer = ref(false)
const detail = ref(null)

const modelColumns = [
  { title: 'ID', key: 'id', width: 150, ellipsis: { tooltip: true } },
  { title: '模型', key: 'name', width: 120 },
  { title: '版本', key: 'version', ellipsis: { tooltip: true } },
  { title: '算法', key: 'algo', width: 110 },
  { title: '数据集', key: 'datasetId', width: 150 },
  { title: '参数量', key: 'params', width: 80 },
  {
    title: '主指标',
    key: 'metrics',
    width: 140,
    render(row) {
      const m = row.metrics || {}
      if (m.success != null) return `success=${m.success}`
      if (m.map50 != null) return `mAP50=${m.map50}`
      if (m.f1 != null) return `F1=${m.f1}`
      return '—'
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (r) => h(NTag, { size: 'small', type: 'success', bordered: false }, { default: () => r.status }),
  },
  {
    title: '操作',
    key: 'ops',
    width: 100,
    render: (row) =>
      h(
        NButton,
        { size: 'tiny', type: 'primary', quaternary: true, onClick: () => openDetail(row.id) },
        { default: () => '详情' },
      ),
  },
]

const algoColumns = [
  { title: '编码', key: 'value', width: 140 },
  { title: '名称', key: 'label' },
  { title: '版本', key: 'versions', render: (r) => (r.versions || []).join(', ') },
]
const gpuColumns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name' },
  { title: '显存', key: 'memoryGb', width: 70, render: (r) => `${r.memoryGb}G` },
  { title: '空闲', key: 'free', width: 70, render: (r) => (r.free ? '是' : '否') },
]

const metricEntries = computed(() => {
  const m = detail.value?.metrics || {}
  return Object.entries(m).map(([k, v]) => ({ key: k, value: v }))
})

async function load() {
  loading.value = true
  try {
    meta.value = listMeta()
    const res = await listEvalModels({ algo: algo.value || undefined })
    models.value = res.items
  } catch (e) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

async function openDetail(id) {
  try {
    detail.value = await getEvalModel(id)
    drawer.value = true
  } catch (e) {
    message.error(e.message)
  }
}

function goDataset() {
  if (detail.value?.datasetId) router.push(`/datasets/${detail.value.datasetId}/samples`)
}

function goCompare() {
  router.push('/eval/compare')
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>算法与模型版本</h2>
        <p>评测注册表 · 训练元数据 · Case 得分 · Changelog（假数据可点开详情）</p>
      </div>
      <n-space>
        <n-select
          v-model:value="algo"
          clearable
          placeholder="按算法筛选"
          style="width: 180px"
          :options="(meta.algorithms || []).map((a) => ({ label: a.label, value: a.value }))"
          @update:value="load"
        />
        <n-button type="primary" :loading="loading" @click="load">刷新</n-button>
      </n-space>
    </div>

    <n-alert type="info" :bordered="false" class="mb">
      演示说明：模型权重与指标均为登记假数据，可跳转对比页与数据集样本浏览器。
    </n-alert>

    <n-card title="已登记模型版本" :bordered="false" class="mb">
      <n-data-table size="small" :loading="loading" :data="models" :columns="modelColumns" />
    </n-card>

    <div class="grid">
      <n-card title="算法目录" :bordered="false">
        <n-data-table size="small" :bordered="false" :data="meta.algorithms || []" :columns="algoColumns" />
      </n-card>
      <n-card title="GPU 资源" :bordered="false">
        <n-data-table size="small" :bordered="false" :data="meta.gpus || []" :columns="gpuColumns" />
      </n-card>
    </div>

    <n-drawer v-model:show="drawer" :width="480" placement="right">
      <n-drawer-content v-if="detail" :title="`${detail.name} · ${detail.version}`" closable>
        <n-descriptions label-placement="left" :column="1" size="small" bordered class="mb">
          <n-descriptions-item label="ID">{{ detail.id }}</n-descriptions-item>
          <n-descriptions-item label="算法">{{ detail.algo }}</n-descriptions-item>
          <n-descriptions-item label="数据集">{{ detail.datasetId }}</n-descriptions-item>
          <n-descriptions-item label="参数量">{{ detail.params }}</n-descriptions-item>
          <n-descriptions-item label="负责人">{{ detail.owner || '—' }}</n-descriptions-item>
          <n-descriptions-item label="训练时间">{{ detail.trainedAt || '—' }}</n-descriptions-item>
          <n-descriptions-item label="状态">{{ detail.status }}</n-descriptions-item>
        </n-descriptions>

        <h4>完整指标</h4>
        <n-data-table
          size="small"
          :pagination="false"
          :data="metricEntries"
          :columns="[
            { title: '指标', key: 'key' },
            { title: '值', key: 'value' },
          ]"
        />

        <h4>Case 得分</h4>
        <n-data-table
          size="small"
          :pagination="false"
          :data="detail.caseScores || []"
          :columns="[
            { title: '用例', key: 'name' },
            { title: '分', key: 'score', width: 70 },
            { title: '备注', key: 'note', ellipsis: { tooltip: true } },
          ]"
        />

        <h4>Changelog</h4>
        <n-timeline>
          <n-timeline-item v-for="(c, i) in detail.changelog || []" :key="i" type="success" :content="c" />
        </n-timeline>
        <n-empty v-if="!(detail.changelog || []).length" description="无变更记录" />

        <template #footer>
          <n-space>
            <n-button @click="goDataset">打开数据集样本</n-button>
            <n-button type="primary" @click="goCompare">去多模型对比</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.head { display: flex; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
h2 { margin: 0 0 6px; font-size: 20px; }
h4 { margin: 14px 0 8px; font-size: 14px; color: #c8c8d0; }
p { margin: 0; color: #9a9aab; }
.mb { margin-bottom: 12px; }
.grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
</style>
