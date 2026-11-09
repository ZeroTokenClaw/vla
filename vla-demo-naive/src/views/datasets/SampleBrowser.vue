<script setup>
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NTag, NImage } from 'naive-ui'
import { getDataset, getSample, listSamples } from '@/services/datasets'
import { message } from '@/ui/discrete'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const dataset = ref(null)
const rows = ref([])
const status = ref(null)
const keyword = ref('')
const drawer = ref(false)
const detail = ref(null)
const detailLoading = ref(false)

const datasetId = computed(() => route.params.id)

const statusOpts = [
  { label: '已标注', value: 'labeled' },
  { label: '异常', value: 'anomaly' },
  { label: '审核中', value: 'reviewing' },
  { label: '已通过', value: 'passed' },
  { label: '标注中', value: 'annotating' },
]

const columns = [
  {
    title: '预览',
    key: 'thumb',
    width: 72,
    render(row) {
      if (!row.thumb) return '—'
      return h(NImage, { src: row.thumb, width: 48, height: 36, objectFit: 'cover', style: 'border-radius:4px' })
    },
  },
  { title: '样本 ID', key: 'id', width: 130 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '模态', key: 'modality', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      const type = row.status === 'anomaly' ? 'error' : row.status === 'passed' ? 'success' : 'default'
      return h(NTag, { size: 'small', type, bordered: false }, { default: () => row.status })
    },
  },
  {
    title: '质量分',
    key: 'qualityScore',
    width: 80,
    render(row) {
      return h('span', { style: 'color:#63e2b7' }, row.qualityScore)
    },
  },
  {
    title: '异常',
    key: 'issues',
    width: 140,
    render(row) {
      return (row.issues || []).join(', ') || '—'
    },
  },
  {
    title: '操作',
    key: 'ops',
    width: 140,
    render(row) {
      return h('div', { style: 'display:flex;gap:4px' }, [
        h(
          NButton,
          { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openDetail(row.id) },
          { default: () => '详情' },
        ),
        h(
          NButton,
          { size: 'tiny', quaternary: true, onClick: () => router.push(row.path || '/qc') },
          { default: () => '进入' },
        ),
      ])
    },
  },
]

const statusDist = computed(() => {
  const map = {}
  for (const r of rows.value) map[r.status] = (map[r.status] || 0) + 1
  return Object.entries(map).map(([status, count]) => ({ status, count }))
})

async function load() {
  loading.value = true
  try {
    dataset.value = await getDataset(datasetId.value)
    const res = await listSamples(datasetId.value, {
      page: 1,
      pageSize: 100,
      status: status.value || undefined,
      keyword: keyword.value || undefined,
    })
    rows.value = res.items
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(id) {
  detailLoading.value = true
  drawer.value = true
  try {
    detail.value = await getSample(id)
  } catch (e) {
    message.error(e.message)
    drawer.value = false
  } finally {
    detailLoading.value = false
  }
}

watch(datasetId, load)
onMounted(load)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>样本浏览器</h2>
        <p>
          <code>{{ datasetId }}</code>
          · {{ dataset?.name || '…' }}
          · 质量分 {{ dataset?.qualityScore ?? '—' }}
          · {{ dataset?.owner }} · {{ dataset?.updatedAt }}
        </p>
      </div>
      <n-button @click="router.push('/datasets')">返回数据集</n-button>
    </div>

    <n-card v-if="dataset" :bordered="false" class="mb">
      <n-space>
        <n-tag :bordered="false">样本 {{ dataset.sampleStats?.total ?? dataset.sampleCount }}</n-tag>
        <n-tag type="success" :bordered="false">已标 {{ dataset.sampleStats?.labeled ?? dataset.labeledCount }}</n-tag>
        <n-tag type="error" :bordered="false">异常 {{ dataset.sampleStats?.anomaly ?? 0 }}</n-tag>
        <n-tag :bordered="false">{{ dataset.version }}</n-tag>
        <n-tag v-for="t in dataset.tags || []" :key="t" type="info" :bordered="false" size="small">{{ t }}</n-tag>
      </n-space>
      <p class="desc">{{ dataset.desc }}</p>
      <n-space v-if="statusDist.length" class="mt" size="small">
        <span class="muted">当前页状态：</span>
        <n-tag v-for="s in statusDist" :key="s.status" size="small" :bordered="false">{{ s.status }} · {{ s.count }}</n-tag>
      </n-space>
    </n-card>

    <n-card :bordered="false" class="mb">
      <n-space>
        <n-input v-model:value="keyword" clearable placeholder="搜索样本" style="width: 180px" @keyup.enter="load" />
        <n-select v-model:value="status" clearable placeholder="状态" style="width: 140px" :options="statusOpts" />
        <n-button :loading="loading" type="primary" @click="load">查询</n-button>
      </n-space>
    </n-card>

    <n-card :bordered="false">
      <n-data-table :columns="columns" :data="rows" :loading="loading" size="small" />
    </n-card>

    <n-drawer v-model:show="drawer" :width="480" placement="right">
      <n-drawer-content :title="detail?.name || '样本详情'" closable>
        <n-spin :show="detailLoading">
          <template v-if="detail">
            <img v-if="detail.thumb" :src="detail.thumb" class="preview" alt="thumb" />
            <n-descriptions label-placement="left" :column="1" size="small" bordered class="mt">
              <n-descriptions-item label="ID">{{ detail.id }}</n-descriptions-item>
              <n-descriptions-item label="数据集">{{ detail.datasetName }} ({{ detail.datasetVersion }})</n-descriptions-item>
              <n-descriptions-item label="模态">{{ detail.modality }}</n-descriptions-item>
              <n-descriptions-item label="状态">{{ detail.status }}</n-descriptions-item>
              <n-descriptions-item label="质量分">{{ detail.qualityScore }}</n-descriptions-item>
              <n-descriptions-item label="时长">{{ detail.durationSec || 0 }}s</n-descriptions-item>
              <n-descriptions-item label="帧率 / 帧数">{{ detail.fps ?? '—' }} / {{ detail.frames ?? '—' }}</n-descriptions-item>
              <n-descriptions-item label="场景 / 方案">{{ detail.scene || '—' }} / {{ detail.plan || '—' }}</n-descriptions-item>
              <n-descriptions-item label="标注员">{{ detail.annotator || '—' }}</n-descriptions-item>
              <n-descriptions-item label="标注时间">{{ detail.labeledAt || '—' }}</n-descriptions-item>
              <n-descriptions-item label="动作段数">{{ detail.actionCount ?? 0 }}</n-descriptions-item>
            </n-descriptions>

            <h4 v-if="detail.instruction">指令</h4>
            <p v-if="detail.instruction" class="inst">{{ detail.instruction }}</p>

            <h4>关键节点</h4>
            <n-space v-if="(detail.keyNodes || []).length">
              <n-tag v-for="k in detail.keyNodes" :key="k" size="small" type="warning" :bordered="false">{{ k }}</n-tag>
            </n-space>
            <n-empty v-else description="无关键节点" size="small" />

            <h4>异常明细</h4>
            <n-data-table
              v-if="(detail.issueDetail || []).length"
              size="small"
              :pagination="false"
              :data="detail.issueDetail"
              :columns="[
                { title: '类型', key: 'type', width: 90 },
                { title: '帧', key: 'frames', width: 100 },
                { title: '说明', key: 'note', ellipsis: { tooltip: true } },
              ]"
            />
            <n-empty v-else description="无异常" size="small" />

            <h4>元数据</h4>
            <n-descriptions label-placement="left" :column="1" size="small" bordered>
              <n-descriptions-item v-for="(v, k) in detail.meta || {}" :key="k" :label="String(k)">
                {{ Array.isArray(v) ? v.join(', ') : v }}
              </n-descriptions-item>
            </n-descriptions>

            <n-space class="mt">
              <n-button type="primary" @click="router.push(detail.path || '/qc')">打开关联工作台</n-button>
            </n-space>
          </template>
        </n-spin>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.head { display: flex; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
h2 { margin: 0 0 6px; font-size: 20px; }
h4 { margin: 14px 0 8px; font-size: 13px; color: #c8c8d0; }
p { margin: 0; color: #9a9aab; }
.desc { margin-top: 10px; color: #a0a0aa; font-size: 13px; }
.inst { color: #e8e8ed; line-height: 1.5; font-size: 14px; }
.muted { color: #6e6e7a; font-size: 12px; }
.mb { margin-bottom: 12px; }
.mt { margin-top: 10px; }
.preview { width: 100%; border-radius: 8px; border: 1px solid #2a2a36; }
:deep(.n-card) { background: #14141c; }
</style>
