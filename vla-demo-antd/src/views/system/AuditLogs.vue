<script setup>
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuditStore } from '@/stores/audit'
import { exportCSV, exportJSON } from '@/utils/exportFiles'
import { notification } from 'ant-design-vue'

const audit = useAuditStore()
const { entries } = storeToRefs(audit)
const filters = reactive({ role: undefined, keyword: '', action: undefined })
const current = ref(null)

const seed = [
  { id: 'AUD-SEED-1', at: '2026-11-09 08:01:12', actor: '周明轩', role: 'admin', action: '登录演示工作台', detail: 'ADF Demo', module: 'system', ip: '10.0.0.12' },
  { id: 'AUD-SEED-2', at: '2026-11-09 08:05:44', actor: '林晓萱', role: 'reviewer', action: '抽检回流', detail: 'DS-ADF-QC-01 +12', module: 'qc', ip: '10.0.0.21' },
  { id: 'AUD-SEED-3', at: '2026-11-09 08:12:03', actor: '陈思远', role: 'annotator', action: '保存 VLA 动作片段', detail: 'ORN-VLA-2026-001', module: 'vla', ip: '10.0.0.33' },
  { id: 'AUD-SEED-4', at: '2026-11-09 08:18:22', actor: '周明轩', role: 'admin', action: '启动生产任务', detail: 'ADF-PROD-2026-001', module: 'factory', ip: '10.0.0.12' },
  { id: 'AUD-SEED-5', at: '2026-11-09 08:26:50', actor: '林晓萱', role: 'reviewer', action: '初审驳回', detail: 'ORN-JOB-QC-88421 · label_miss', module: 'qc', ip: '10.0.0.21' },
  { id: 'AUD-SEED-6', at: '2026-11-09 08:40:11', actor: '周明轩', role: 'admin', action: '运行多模型对比', detail: 'EVAL-RPT demo', module: 'train', ip: '10.0.0.12' },
  { id: 'AUD-SEED-7', at: '2026-11-09 08:55:03', actor: '赵雨桐', role: 'annotator', action: 'OCR 修正保存', detail: 'IMG-OCR-003', module: 'prelabel', ip: '10.0.0.44' },
  { id: 'AUD-SEED-8', at: '2026-11-09 09:10:28', actor: '周明轩', role: 'admin', action: '导出数据集包', detail: 'DS-ADF-VLA-001', module: 'system', ip: '10.0.0.12' },
]

const allRows = computed(() =>
  [...entries.value.map((e, i) => ({
    id: e.id || `AUD-LIVE-${i}`,
    at: e.at || e.createdAt || '—',
    actor: e.actor || e.user || '系统',
    role: e.role || '—',
    action: e.action || '—',
    detail: e.detail || '',
    module: e.module || 'runtime',
    ip: e.ip || '127.0.0.1',
  })), ...seed],
)

const rows = computed(() => {
  let list = allRows.value
  if (filters.role) list = list.filter((r) => r.role === filters.role)
  if (filters.action) list = list.filter((r) => r.action.includes(filters.action))
  if (filters.keyword) {
    const k = filters.keyword.toLowerCase()
    list = list.filter((r) => `${r.actor}${r.action}${r.detail}${r.module}`.toLowerCase().includes(k))
  }
  return list
})

const stats = computed(() => ({
  total: allRows.value.length,
  admin: allRows.value.filter((r) => r.role === 'admin').length,
  reviewer: allRows.value.filter((r) => r.role === 'reviewer').length,
  annotator: allRows.value.filter((r) => r.role === 'annotator').length,
}))

function exportLogs(fmt) {
  if (fmt === 'csv') exportCSV('adf-audit-logs.csv', rows.value)
  else exportJSON('adf-audit-logs.json', { exportedAt: new Date().toISOString(), items: rows.value })
  notification.success({ message: `已导出 ${rows.value.length} 条审计日志（演示）`, placement: 'topRight' })
}

const cols = [
  { title: '时间', dataIndex: 'at', width: 170 },
  { title: '操作者', dataIndex: 'actor', width: 100 },
  { title: '角色', key: 'role', width: 100 },
  { title: '模块', dataIndex: 'module', width: 100 },
  { title: '动作', dataIndex: 'action', width: 180 },
  { title: '详情', dataIndex: 'detail', ellipsis: true },
  { title: '操作', key: 'op', width: 80 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="系统日志中心：聚合演示种子日志 + 会话内操作审计；可筛选导出，无真实 SIEM。"
    />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="总条数" :value="stats.total" /></a-col>
      <a-col :span="6"><a-statistic title="Admin" :value="stats.admin" /></a-col>
      <a-col :span="6"><a-statistic title="Reviewer" :value="stats.reviewer" /></a-col>
      <a-col :span="6"><a-statistic title="Annotator" :value="stats.annotator" /></a-col>
    </a-row>
    <a-space style="margin-bottom: 12px" wrap>
      <a-input v-model:value="filters.keyword" placeholder="搜索操作者/动作/详情" style="width: 220px" allow-clear />
      <a-select
        v-model:value="filters.role"
        allow-clear
        placeholder="角色"
        style="width: 130px"
        :options="['admin', 'reviewer', 'annotator'].map((v) => ({ value: v, label: v }))"
      />
      <a-input v-model:value="filters.action" placeholder="动作包含" style="width: 160px" allow-clear />
      <a-button @click="exportLogs('csv')">导出 CSV</a-button>
      <a-button type="primary" @click="exportLogs('json')">导出 JSON</a-button>
    </a-space>
    <a-table :columns="cols" :data-source="rows" row-key="id" size="small" :pagination="{ pageSize: 12 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :color="record.role === 'admin' ? 'purple' : record.role === 'reviewer' ? 'blue' : 'default'">
            {{ record.role }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="current = record">详情</a-button>
        </template>
      </template>
    </a-table>

    <a-drawer :open="!!current" title="审计详情" width="420" @close="current = null">
      <pre v-if="current" style="background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; font-size: 12px">{{
        JSON.stringify(current, null, 2)
      }}</pre>
    </a-drawer>
  </div>
</template>
