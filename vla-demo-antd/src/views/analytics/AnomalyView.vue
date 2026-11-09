<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { listAnomalies } from '@/services/analytics'

const router = useRouter()
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const filters = reactive({ type: undefined, status: undefined, severity: undefined, keyword: '' })
const current = ref(null)
const note = ref('')

const stats = computed(() => {
  const list = rows.value
  return {
    open: list.filter((r) => r.status === 'open').length,
    reviewing: list.filter((r) => r.status === 'reviewing').length,
    high: list.filter((r) => r.severity === 'high' || r.severity === 'critical').length,
    resolved: list.filter((r) => r.status === 'resolved').length,
    ignored: list.filter((r) => r.status === 'ignored').length,
  }
})

const typeDist = computed(() => {
  const map = {}
  for (const r of rows.value) map[r.type] = (map[r.type] || 0) + 1
  return Object.entries(map).map(([type, count]) => ({ type, count }))
})

function normalizeEvidence(raw, i, type) {
  if (!raw?.length) {
    return [
      { kind: 'frame', ref: `F${120 + i * 7}`, note: '可疑模糊/抖动帧' },
      { kind: 'rule', ref: type || 'rule', note: '质检规则触发' },
      { kind: 'metric', ref: 'ssim=0.61', note: '相对关键帧清晰度下降' },
    ]
  }
  return raw.map((e, j) => {
    if (typeof e === 'string') {
      const [kind, ...rest] = e.split('=')
      return { kind: kind || 'note', ref: rest.join('=') || e, note: e }
    }
    return e
  })
}

function enrich(r, i) {
  return {
    ...r,
    evidence: normalizeEvidence(r.evidence, i, r.type),
    checklist: r.checklist || [
      { item: '复核证据帧与时间轴', done: false },
      { item: '核对指令与动作一致性', done: r.type === 'mismatch' },
      { item: '确认是否需补采/返修', done: false },
    ],
    suggestedAction:
      r.suggestedAction ||
      (r.type === 'mismatch' ? '打开一致性检查' : r.type === 'missing' ? '回退补标' : '抽检复核'),
    owner: r.owner || r.assignee || ['周明轩', '林晓萱', '陈思远'][i % 3],
    slaHours: r.slaHours || (r.severity === 'critical' ? 4 : r.severity === 'high' ? 8 : 24),
  }
}

async function load() {
  loading.value = true
  try {
    const res = await listAnomalies({ ...filters, page: page.value, pageSize: 12 })
    rows.value = (res.items || []).map(enrich)
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function setStatus(status, toast) {
  if (!current.value) return
  current.value = {
    ...current.value,
    status,
    resolvedAt: status === 'resolved' || status === 'ignored' ? new Date().toISOString() : current.value.resolvedAt,
    resolution: note.value || current.value.resolution,
  }
  const idx = rows.value.findIndex((r) => r.id === current.value.id)
  if (idx >= 0) rows.value[idx] = current.value
  notification.success({ message: toast, placement: 'topRight' })
}

function toggleCheck(i) {
  if (!current.value?.checklist?.[i]) return
  current.value.checklist[i].done = !current.value.checklist[i].done
  current.value = { ...current.value, checklist: [...current.value.checklist] }
}

function jumpRelated(row) {
  if (!row) return
  if (String(row.targetId || '').includes('VLA') || row.source === 'vla') {
    router.push(`/vla/quality/${row.targetId}`)
  } else if (row.type === 'mismatch') {
    router.push(`/vla/consistency/${row.targetId}`)
  } else {
    router.push(`/qc/audit/${row.targetId}`)
  }
}

onMounted(load)

const cols = [
  { title: '异常号', dataIndex: 'id', width: 110 },
  { title: '类型', dataIndex: 'type', width: 100 },
  { title: '等级', key: 'severity', width: 90 },
  { title: '来源', dataIndex: 'source', width: 100 },
  { title: '对象', dataIndex: 'targetId', width: 150 },
  { title: '说明', dataIndex: 'message', ellipsis: true },
  { title: 'SLA(h)', dataIndex: 'slaHours', width: 80 },
  { title: '负责人', dataIndex: 'owner', width: 90 },
  { title: '状态', key: 'status', width: 100 },
  { title: '时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', key: 'op', width: 80 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="样本异常分析：聚合抽检与 VLA 质检异常；含证据链、检查清单、SLA 与状态流转（伪造列表）。"
    />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="5"><a-statistic title="本页 Open" :value="stats.open" /></a-col>
      <a-col :span="5"><a-statistic title="复核中" :value="stats.reviewing" /></a-col>
      <a-col :span="5"><a-statistic title="高/危等级" :value="stats.high" /></a-col>
      <a-col :span="5"><a-statistic title="已解决" :value="stats.resolved" /></a-col>
      <a-col :span="4"><a-statistic title="误报关闭" :value="stats.ignored" /></a-col>
    </a-row>

    <a-card size="small" style="margin-bottom: 12px" title="类型分布（本页）">
      <a-space wrap>
        <a-tag v-for="t in typeDist" :key="t.type" color="orange">{{ t.type }} · {{ t.count }}</a-tag>
        <a-empty v-if="!typeDist.length" description="无数据" />
      </a-space>
    </a-card>

    <a-space style="margin-bottom: 12px" wrap>
      <a-input
        v-model:value="filters.keyword"
        allow-clear
        placeholder="搜索异常号/对象"
        style="width: 180px"
        @pressEnter="load"
      />
      <a-select
        v-model:value="filters.type"
        allow-clear
        placeholder="类型"
        style="width: 140px"
        :options="['blur', 'jitter', 'missing', 'mismatch', 'occlusion'].map((v) => ({ value: v, label: v }))"
      />
      <a-select
        v-model:value="filters.status"
        allow-clear
        placeholder="状态"
        style="width: 140px"
        :options="['open', 'reviewing', 'resolved', 'ignored'].map((v) => ({ value: v, label: v }))"
      />
      <a-select
        v-model:value="filters.severity"
        allow-clear
        placeholder="等级"
        style="width: 120px"
        :options="['low', 'medium', 'high', 'critical'].map((v) => ({ value: v, label: v }))"
      />
      <a-button
        type="primary"
        @click="
          () => {
            page = 1
            load()
          }
        "
      >
        查询
      </a-button>
    </a-space>
    <a-table
      :loading="loading"
      :columns="cols"
      :data-source="rows"
      row-key="id"
      size="small"
      :pagination="{
        current: page,
        pageSize: 12,
        total,
        onChange: (p) => {
          page = p
          load()
        },
      }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'severity'">
          <a-tag
            :color="
              record.severity === 'critical' || record.severity === 'high'
                ? 'error'
                : record.severity === 'medium'
                  ? 'warning'
                  : 'default'
            "
          >
            {{ record.severity }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag
            :color="
              record.status === 'resolved'
                ? 'success'
                : record.status === 'open'
                  ? 'processing'
                  : record.status === 'ignored'
                    ? 'default'
                    : 'warning'
            "
          >
            {{ record.status }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button
            type="link"
            size="small"
            @click="
              () => {
                current = record
                note = record.resolution || ''
              }
            "
          >
            详情
          </a-button>
        </template>
      </template>
    </a-table>

    <a-drawer :open="!!current" title="异常详情" width="500" @close="current = null">
      <template v-if="current">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="异常号">{{ current.id }}</a-descriptions-item>
          <a-descriptions-item label="类型 / 等级">{{ current.type }} / {{ current.severity }}</a-descriptions-item>
          <a-descriptions-item label="来源">{{ current.source }}</a-descriptions-item>
          <a-descriptions-item label="对象">{{ current.targetId }}</a-descriptions-item>
          <a-descriptions-item label="负责人">{{ current.owner }}</a-descriptions-item>
          <a-descriptions-item label="SLA">{{ current.slaHours }} 小时</a-descriptions-item>
          <a-descriptions-item label="状态">{{ current.status }}</a-descriptions-item>
          <a-descriptions-item label="说明">{{ current.message }}</a-descriptions-item>
          <a-descriptions-item label="建议动作">{{ current.suggestedAction }}</a-descriptions-item>
        </a-descriptions>

        <h4 style="margin: 14px 0 8px">证据链</h4>
        <a-timeline>
          <a-timeline-item v-for="(e, i) in current.evidence || []" :key="i" color="red">
            <strong>{{ e.kind }}</strong> · {{ e.ref }}
            <div style="color: #64748b">{{ e.note }}</div>
          </a-timeline-item>
        </a-timeline>

        <h4 style="margin: 14px 0 8px">处理检查清单</h4>
        <div v-for="(c, i) in current.checklist || []" :key="i" style="margin-bottom: 8px">
          <a-checkbox :checked="c.done" @change="toggleCheck(i)">{{ c.item }}</a-checkbox>
        </div>

        <div style="margin: 12px 0 8px; color: #64748b; font-size: 12px">处理备注</div>
        <a-textarea v-model:value="note" :rows="2" placeholder="例如：已确认遮挡段需返修，转时间轴补标" />

        <a-space style="margin-top: 12px" wrap>
          <a-button type="primary" @click="jumpRelated(current)">跳转关联页</a-button>
          <a-button @click="setStatus('reviewing', '已进入复核')">标记复核中</a-button>
          <a-button type="primary" ghost @click="setStatus('resolved', `已标记 ${current.id} 为 resolved`)">
            标记已解决
          </a-button>
          <a-button danger ghost @click="setStatus('ignored', '已关闭为误报')">关闭误报</a-button>
        </a-space>

        <pre style="margin-top: 16px; background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; font-size: 12px">{{
          JSON.stringify(current, null, 2)
        }}</pre>
      </template>
    </a-drawer>
  </div>
</template>
