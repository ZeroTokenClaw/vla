<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NTag, NSpace } from 'naive-ui'
import { listDatasets, createDataset, getDataset } from '@/services/datasets'
import { message } from '@/ui/discrete'

const router = useRouter()
const loading = ref(false)
const rows = ref([])
const keyword = ref('')
const modality = ref(null)
const showCreate = ref(false)
const drawer = ref(false)
const detail = ref(null)
const form = ref({ name: '', modality: 'mixed', version: 'v0.1.0', desc: '', tagsText: '' })

const modalityOpts = [
  { label: '混合', value: 'mixed' },
  { label: 'VLA', value: 'vla' },
  { label: '检测', value: 'video_det' },
  { label: 'OCR', value: 'ocr' },
  { label: '文本', value: 'text_ner' },
]

const summary = computed(() => {
  const items = rows.value
  return {
    count: items.length,
    samples: items.reduce((s, d) => s + (d.sampleCount || 0), 0),
    labeled: items.reduce((s, d) => s + (d.labeledCount || 0), 0),
    avgQ: items.length
      ? Number((items.reduce((s, d) => s + (d.qualityScore || 0), 0) / items.length).toFixed(1))
      : 0,
  }
})

const columns = [
  { title: 'ID', key: 'id', width: 160 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '模态', key: 'modality', width: 100 },
  { title: '版本', key: 'version', width: 90 },
  { title: '样本', key: 'sampleCount', width: 80 },
  { title: '已标', key: 'labeledCount', width: 80 },
  {
    title: '质量分',
    key: 'qualityScore',
    width: 90,
    render(row) {
      return h('span', { style: 'color:#63e2b7;font-weight:600' }, row.qualityScore)
    },
  },
  {
    title: '标签',
    key: 'tags',
    render(row) {
      return h(NSpace, { size: 4 }, {
        default: () => (row.tags || []).slice(0, 3).map((t) => h(NTag, { size: 'tiny', bordered: false }, { default: () => t })),
      })
    },
  },
  { title: '负责人', key: 'owner', width: 80 },
  { title: '更新', key: 'updatedAt', width: 160 },
  {
    title: '操作',
    key: 'act',
    width: 150,
    render(row) {
      return h(NSpace, { size: 4 }, {
        default: () => [
          h(NButton, { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openDetail(row.id) }, { default: () => '详情' }),
          h(NButton, { size: 'tiny', quaternary: true, onClick: () => router.push(`/datasets/${row.id}/samples`) }, { default: () => '样本' }),
        ],
      })
    },
  },
]

async function load() {
  loading.value = true
  try {
    const res = await listDatasets({
      page: 1,
      pageSize: 50,
      keyword: keyword.value || undefined,
      modality: modality.value || undefined,
    })
    rows.value = res.items
  } catch (e) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

async function openDetail(id) {
  try {
    detail.value = await getDataset(id)
    drawer.value = true
  } catch (e) {
    message.error(e.message)
  }
}

async function onCreate() {
  if (!form.value.name.trim()) {
    message.warning('请填写数据集名称')
    return
  }
  try {
    const row = await createDataset({
      ...form.value,
      tags: form.value.tagsText.split(/[,，]/).map((x) => x.trim()).filter(Boolean),
    })
    message.success(`已创建 ${row.id}`)
    showCreate.value = false
    form.value = { name: '', modality: 'mixed', version: 'v0.1.0', desc: '', tagsText: '' }
    await load()
  } catch (e) {
    message.error(e.message)
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>数据集管理</h2>
        <p>数据资产目录 · 卡片/表格 · 详情抽屉 · 创建/筛选（内存假数据可写）</p>
      </div>
      <n-button type="primary" @click="showCreate = true">新建数据集</n-button>
    </div>

    <div class="kpi">
      <n-card size="small" :bordered="false"><div class="k">数据集</div><div class="v">{{ summary.count }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">样本总量</div><div class="v">{{ summary.samples }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">已标合计</div><div class="v">{{ summary.labeled }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">均质量分</div><div class="v">{{ summary.avgQ }}</div></n-card>
    </div>

    <n-card :bordered="false" class="mb">
      <n-space>
        <n-input v-model:value="keyword" clearable placeholder="搜索" style="width: 180px" @keyup.enter="load" />
        <n-select v-model:value="modality" clearable placeholder="模态" style="width: 140px" :options="modalityOpts" />
        <n-button :loading="loading" @click="load">查询</n-button>
      </n-space>
    </n-card>

    <div class="cards">
      <n-card
        v-for="d in rows"
        :key="d.id"
        :bordered="false"
        class="ds"
        hoverable
        @click="openDetail(d.id)"
      >
        <div class="ds-top">
          <strong>{{ d.name }}</strong>
          <n-tag size="tiny" :bordered="false">{{ d.modality }}</n-tag>
        </div>
        <code>{{ d.id }}</code>
        <div class="ds-meta">
          <span>样本 {{ d.sampleCount }}</span>
          <span>已标 {{ d.labeledCount }}</span>
          <span class="q">Q {{ d.qualityScore }}</span>
        </div>
        <n-space size="small">
          <n-tag v-for="t in (d.tags || []).slice(0, 3)" :key="t" size="tiny" :bordered="false">{{ t }}</n-tag>
        </n-space>
      </n-card>
    </div>

    <n-card title="表格视图" :bordered="false" class="mt">
      <n-data-table :columns="columns" :data="rows" :loading="loading" size="small" />
    </n-card>

    <n-drawer v-model:show="drawer" :width="460" placement="right">
      <n-drawer-content :title="detail?.name || '数据集详情'" closable>
        <template v-if="detail">
          <n-descriptions label-placement="left" :column="1" size="small" bordered>
            <n-descriptions-item label="ID">{{ detail.id }}</n-descriptions-item>
            <n-descriptions-item label="版本">{{ detail.version }}</n-descriptions-item>
            <n-descriptions-item label="模态">{{ detail.modality }}</n-descriptions-item>
            <n-descriptions-item label="样本">{{ detail.sampleStats?.total ?? detail.sampleCount }}</n-descriptions-item>
            <n-descriptions-item label="已标">{{ detail.sampleStats?.labeled ?? detail.labeledCount }}</n-descriptions-item>
            <n-descriptions-item label="异常样本">{{ detail.sampleStats?.anomaly ?? 0 }}</n-descriptions-item>
            <n-descriptions-item label="质量分">{{ detail.qualityScore }}</n-descriptions-item>
            <n-descriptions-item label="负责人">{{ detail.owner }}</n-descriptions-item>
            <n-descriptions-item label="更新">{{ detail.updatedAt }}</n-descriptions-item>
          </n-descriptions>
          <p class="desc">{{ detail.desc }}</p>
          <n-space>
            <n-tag v-for="t in detail.tags || []" :key="t" size="small" :bordered="false">{{ t }}</n-tag>
          </n-space>
          <n-space class="mt">
            <n-button type="primary" @click="router.push(`/datasets/${detail.id}/samples`)">浏览样本</n-button>
            <n-button @click="router.push('/lineage')">查看血缘</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showCreate" preset="card" title="新建数据集" style="width: 480px">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="名称" required>
          <n-input v-model:value="form.name" placeholder="例如：桌面抓取增广集" />
        </n-form-item>
        <n-form-item label="模态">
          <n-select v-model:value="form.modality" :options="modalityOpts" />
        </n-form-item>
        <n-form-item label="版本">
          <n-input v-model:value="form.version" />
        </n-form-item>
        <n-form-item label="标签">
          <n-input v-model:value="form.tagsText" placeholder="逗号分隔" />
        </n-form-item>
        <n-form-item label="说明">
          <n-input v-model:value="form.desc" type="textarea" :rows="3" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreate = false">取消</n-button>
          <n-button type="primary" @click="onCreate">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.head { display: flex; justify-content: space-between; margin-bottom: 12px; }
h2 { margin: 0 0 6px; font-size: 20px; }
p { margin: 0; color: #9a9aab; }
.mb { margin-bottom: 12px; }
.mt { margin-top: 12px; }
.kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
.k { color: #8b8b9a; font-size: 12px; }
.v { margin-top: 4px; font-size: 22px; color: #63e2b7; font-weight: 600; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
.ds { cursor: pointer; }
.ds-top { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
code { font-size: 11px; color: #6e6e7a; }
.ds-meta { display: flex; gap: 12px; margin: 8px 0; font-size: 12px; color: #a0a0aa; }
.q { color: #63e2b7; }
.desc { margin: 12px 0; color: #c8c8d0; line-height: 1.5; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 900px) {
  .kpi, .cards { grid-template-columns: 1fr; }
}
</style>
