<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NTag, NSpace } from 'naive-ui'
import { listAnomalies, resolveAnomaly } from '@/services/analytics'
import { message } from '@/ui/discrete'

const router = useRouter()
const loading = ref(false)
const acting = ref(false)
const issueType = ref(null)
const status = ref(null)
const severity = ref(null)
const keyword = ref('')
const rows = ref([])
const summary = ref({ open: 0, confirmed: 0, fixed: 0, dismissed: 0, high: 0 })
const typeDist = ref([])
const meta = ref({ issueTypes: [], statuses: [] })
const drawer = ref(false)
const current = ref(null)
const note = ref('')

const severityOpts = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
]

const typeLabel = computed(() => {
  const m = {}
  for (const x of meta.value.issueTypes || []) m[x.key] = x.label
  return m
})

const columns = [
  { title: '工单', key: 'id', width: 140 },
  { title: '样本', key: 'sampleName', ellipsis: { tooltip: true } },
  {
    title: '类型',
    key: 'issueType',
    width: 90,
    render(row) {
      return typeLabel.value[row.issueType] || row.issueType
    },
  },
  {
    title: '严重度',
    key: 'severity',
    width: 80,
    render(row) {
      const type = row.severity === 'high' ? 'error' : row.severity === 'medium' ? 'warning' : 'info'
      return h(NTag, { size: 'small', type, bordered: false }, { default: () => row.severity })
    },
  },
  {
    title: '定位',
    key: 'location',
    width: 150,
    render(row) {
      const loc = row.location || {}
      if (loc.timestamp) return loc.timestamp
      return `F${loc.startFrame ?? '-'}–${loc.endFrame ?? '-'}`
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return meta.value.statuses.find((s) => s.value === row.status)?.label || row.status
    },
  },
  {
    title: '操作',
    key: 'act',
    width: 160,
    render(row) {
      return h(NSpace, { size: 4 }, {
        default: () => [
          h(NButton, { size: 'tiny', quaternary: true, type: 'primary', onClick: () => open(row) }, { default: () => '处理' }),
          h(
            NButton,
            {
              size: 'tiny',
              quaternary: true,
              disabled: !row.vlaTaskId,
              onClick: () => row.vlaTaskId && router.push(`/vla/quality/${row.vlaTaskId}`),
            },
            { default: () => '质检页' },
          ),
        ],
      })
    },
  },
]

async function load() {
  loading.value = true
  try {
    const res = await listAnomalies({
      issueType: issueType.value || undefined,
      status: status.value || undefined,
      severity: severity.value || undefined,
      keyword: keyword.value || undefined,
    })
    rows.value = res.items
    summary.value = res.summary || summary.value
    typeDist.value = res.typeDist || []
    meta.value = { issueTypes: res.issueTypes, statuses: res.statuses }
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function open(row) {
  current.value = { ...row }
  note.value = row.resolution || ''
  drawer.value = true
}

async function act(action) {
  if (!current.value) return
  acting.value = true
  try {
    const updated = await resolveAnomaly(current.value.id, { action, note: note.value })
    current.value = { ...current.value, ...updated }
    message.success(`已${action === 'confirm' ? '确认' : action === 'fix' ? '标记修复' : '关闭误报'}`)
    await load()
  } catch (e) {
    message.error(e.message)
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>样本异常分析</h2>
        <p>抖动 / 遮挡 / 模糊 / 缺失 / 不匹配 · 工单闭环 · 时间线 · 检查清单</p>
      </div>
    </div>

    <div class="kpi">
      <n-card size="small" :bordered="false"><div class="k">待处理</div><div class="v warn">{{ summary.open }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">已确认</div><div class="v">{{ summary.confirmed }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">已修复</div><div class="v ok">{{ summary.fixed }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">误报关闭</div><div class="v">{{ summary.dismissed }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">高严重度</div><div class="v err">{{ summary.high }}</div></n-card>
    </div>

    <n-card title="当前筛选 · 类型分布" :bordered="false" class="mb">
      <n-space>
        <n-tag v-for="t in typeDist" :key="t.type" :bordered="false">
          {{ typeLabel[t.type] || t.type }} · {{ t.count }}
        </n-tag>
        <n-empty v-if="!typeDist.length" description="无数据" />
      </n-space>
    </n-card>

    <n-card :bordered="false" class="mb">
      <n-space wrap>
        <n-input v-model:value="keyword" clearable placeholder="搜索工单/样本" style="width: 180px" @keyup.enter="load" />
        <n-select
          v-model:value="issueType"
          clearable
          placeholder="异常类型"
          style="width: 140px"
          :options="(meta.issueTypes || []).map((x) => ({ label: x.label, value: x.key }))"
        />
        <n-select
          v-model:value="status"
          clearable
          placeholder="状态"
          style="width: 120px"
          :options="meta.statuses || []"
        />
        <n-select v-model:value="severity" clearable placeholder="严重度" style="width: 110px" :options="severityOpts" />
        <n-button type="primary" :loading="loading" @click="load">查询</n-button>
      </n-space>
    </n-card>

    <n-card :bordered="false">
      <n-data-table :columns="columns" :data="rows" :loading="loading" size="small" :pagination="{ pageSize: 8 }" />
    </n-card>

    <n-drawer v-model:show="drawer" :width="500" placement="right">
      <n-drawer-content title="异常处理详情" closable>
        <template v-if="current">
          <n-descriptions label-placement="left" :column="1" size="small" bordered>
            <n-descriptions-item label="工单">{{ current.id }}</n-descriptions-item>
            <n-descriptions-item label="样本">{{ current.sampleName }} ({{ current.sampleId }})</n-descriptions-item>
            <n-descriptions-item label="类型">{{ typeLabel[current.issueType] || current.issueType }}</n-descriptions-item>
            <n-descriptions-item label="严重度">{{ current.severity }}</n-descriptions-item>
            <n-descriptions-item label="定位">{{ current.location?.timestamp || '—' }}</n-descriptions-item>
            <n-descriptions-item label="帧区间">
              F{{ current.location?.startFrame ?? '—' }}–{{ current.location?.endFrame ?? '—' }}
            </n-descriptions-item>
            <n-descriptions-item label="说明">{{ current.message }}</n-descriptions-item>
            <n-descriptions-item label="状态">{{ current.status }}</n-descriptions-item>
            <n-descriptions-item label="负责人">{{ current.assignee }}</n-descriptions-item>
            <n-descriptions-item v-if="current.resolvedBy" label="处理人">{{ current.resolvedBy }}</n-descriptions-item>
            <n-descriptions-item v-if="current.resolvedAt" label="处理时间">{{ current.resolvedAt }}</n-descriptions-item>
          </n-descriptions>

          <img v-if="current.evidence" :src="current.evidence" class="ev" alt="evidence" />
          <n-empty v-else class="mt" description="无证据截帧" />

          <h4>处理检查清单</h4>
          <n-space vertical>
            <div v-for="(c, i) in current.checklist || []" :key="i" class="check">
              <n-tag size="small" :type="c.done ? 'success' : 'warning'" :bordered="false">{{ c.done ? '已完成' : '待办' }}</n-tag>
              <span>{{ c.item }}</span>
            </div>
          </n-space>

          <h4>工单时间线</h4>
          <n-timeline>
            <n-timeline-item
              v-for="(ev, i) in current.timeline || []"
              :key="i"
              :type="i === 0 ? 'info' : 'success'"
              :title="ev.event"
              :content="`${ev.at} · ${ev.by}`"
            />
          </n-timeline>

          <n-input
            v-model:value="note"
            type="textarea"
            placeholder="处理备注 / 修复说明"
            :rows="3"
            class="mt"
          />
          <n-space class="mt">
            <n-button :loading="acting" @click="act('confirm')">确认问题</n-button>
            <n-button type="primary" :loading="acting" @click="act('fix')">标记已修复</n-button>
            <n-button :loading="acting" @click="act('dismiss')">误报关闭</n-button>
            <n-button
              v-if="current.vlaTaskId"
              quaternary
              type="info"
              @click="router.push(`/vla/quality/${current.vlaTaskId}`)"
            >
              打开质检
            </n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; }
.head { margin-bottom: 12px; }
h2 { margin: 0 0 6px; font-size: 20px; }
h4 { margin: 14px 0 8px; font-size: 13px; color: #c8c8d0; }
p { margin: 0; color: #9a9aab; }
.mb { margin-bottom: 12px; }
.mt { margin-top: 12px; }
.kpi { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 12px; }
.k { color: #8b8b9a; font-size: 12px; }
.v { margin-top: 4px; font-size: 22px; color: #c8c8d0; font-weight: 600; }
.v.warn { color: #f0a020; }
.v.ok { color: #63e2b7; }
.v.err { color: #e88080; }
.ev { width: 100%; margin-top: 12px; border-radius: 8px; border: 1px solid #2a2a36; }
.check { display: flex; gap: 8px; align-items: center; color: #c8c8d0; font-size: 13px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 900px) { .kpi { grid-template-columns: repeat(2, 1fr); } }
</style>
