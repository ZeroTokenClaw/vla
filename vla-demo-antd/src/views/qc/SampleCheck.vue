<script setup>import { notification } from 'ant-design-vue'

import { computed, onMounted, reactive, ref } from 'vue'
import {
  listSampleRules,
  updateSampleRule,
  runSampleCheck,
  listSamplePool,
  passSample,
  rejectSample,
  refluxPass,
  listMeta,
  getModalityMeta,
  REJECT_REASONS,
} from '@/services/qc'
import { useAuthStore } from '@/stores/auth'
import ProgressMock from '@/components/ProgressMock.vue'

const auth = useAuthStore()
const loading = ref(false)
const running = ref(false)
const rules = ref([])
const pool = ref([])
const meta = reactive({ modalities: [] })
const lastRun = ref(null)
const rejectMap = reactive({})

const canConfig = computed(() => auth.role === 'admin' || auth.role === 'reviewer')

const stats = computed(() => {
  const all = pool.value
  return {
    pending: all.filter((s) => s.status === 'pending' || s.status === 'checking').length,
    pass: all.filter((s) => s.status === 'pass').length,
    fail: all.filter((s) => s.status === 'fail').length,
    refluxed: all.filter((s) => s.status === 'refluxed').length,
  }
})

async function load() {
  loading.value = true
  try {
    Object.assign(meta, listMeta())
    rules.value = await listSampleRules()
    pool.value = await listSamplePool()
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveRule(rule) {
  if (!canConfig.value) {
    notification.warning({ message: '仅管理员/质检员可配置规则', placement: 'topRight' })
    return
  }
  await updateSampleRule(rule.id, {
    ratio: rule.ratio,
    enabled: rule.enabled,
    minSamples: rule.minSamples,
    modalities: [...rule.modalities],
  })
  notification.success({ message: '规则已保存', placement: 'topRight' })
  await load()
}

async function runRule(ruleId) {
  running.value = true
  try {
    const res = await runSampleCheck(ruleId)
    lastRun.value = res.run
    notification.success({ message: `随机抽检完成，抽中 ${res.run.count} 条`, placement: 'topRight' })
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    running.value = false
  }
}

async function onPass(id) {
  await passSample(id)
  notification.success({ message: '已标记合格', placement: 'topRight' })
  await load()
}

async function onReject(id) {
  const reason = rejectMap[id] || 'spec_violate'
  await rejectSample(id, reason)
  notification.warning({ message: '已标记不合格', placement: 'topRight' })
  await load()
}

async function onReflux() {
  if (!canConfig.value) {
    notification.warning({ message: '仅管理员/质检员可执行回流', placement: 'topRight' })
    return
  }
  running.value = true
  try {
    const res = await refluxPass([])
    notification.success({ message: `合格数据已写入回流库：${res.count} 条`, placement: 'topRight' })
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  } finally {
    running.value = false
  }
}

function statusLabel(s) {
  return (
    {
      pending: '待抽检',
      checking: '抽检中',
      pass: '合格',
      fail: '不合格',
      refluxed: '已回流',
    }[s] || s
  )
}

function statusType(s) {
  return (
    {
      pending: 'info',
      checking: 'warning',
      pass: 'success',
      fail: 'danger',
      refluxed: 'success',
    }[s] || 'info'
  )
}

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}

const ornTableCols1 = [
  { title: '规则号', key: 'id', dataIndex: 'id', width: 120 },
  { title: '覆盖模态', key: '覆盖模态', width: 200 },
  { title: '启用', key: '启用', width: 80 },
  { title: '操作', key: '操作', width: 200 }
]

const ornTableCols2 = [
  { title: '样本号', key: 'id', dataIndex: 'id', width: 130 },
  { title: '关联工单', key: 'taskId', dataIndex: 'taskId', width: 160 },
  { title: '不合格原因', key: '不合格原因', width: 160 },
  { title: '操作', key: '操作', width: 160, fixed: 'right' }
]
</script>

<template>
  <div :loading="loading">
    <a-alert
      class="tip"
      type="info"
      :closable="false"
      show-icon
      message="抽检回流：配置规则 → 随机抽检（可见进度）→ 合格通过 / 不合格驳回 → 合格数据写入回流库。" />

    <a-row :gutter="12" class="stats">
      <a-col :span="6"><a-statistic title="待/抽检中" :value="stats.pending" /></a-col>
      <a-col :span="6"><a-statistic title="合格" :value="stats.pass" /></a-col>
      <a-col :span="6"><a-statistic title="不合格" :value="stats.fail" /></a-col>
      <a-col :span="6"><a-statistic title="已回流" :value="stats.refluxed" /></a-col>
    </a-row>

    <ProgressMock :running="running" label="抽检 / 回流处理中" :duration="1100" />

    <a-card  class="mb">
      <template #title>
        <div class="hd">
          <span>抽检规则配置</span>
          <a-button type="primary" :disabled="!canConfig" @click="onReflux">合格数据回流</a-button>
        </div>
      </template>
      <a-table :data-source="rules" :columns="ornTableCols1" :pagination="false" row-key="id">
  <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'id'">
<a-slider
              v-model:value="record.ratio"
              :min="0.05"
              :max="0.5"
              :step="0.05"
              :format-tooltip="(v) => `${Math.round(v * 100)}%`"
              :disabled="!canConfig" />
      </template>
      <template v-if="column.key === '覆盖模态'">
<a-select
              v-model:value="record.modalities"
              multiple
              collapse-tags
              style="width: 100%"
              :disabled="!canConfig">
              <a-select-option
                v-for="m in meta.modalities"
                :key="m.value"
                :value="m.value">{{ m.short }}</a-select-option>
            </a-select>
      </template>
      <template v-if="column.key === '启用'">
<a-switch v-model:checked="record.enabled" :disabled="!canConfig" />
      </template>
      <template v-if="column.key === '操作'">
<a-button  type="" :disabled="!canConfig" @click="saveRule(row)">保存</a-button>
            <a-button  type="" :disabled="!record.enabled" @click="runRule(record.id)">
              随机抽检
            </a-button>
      </template>
  </template>
</a-table>
      <p v-if="lastRun" class="run-tip">
        最近抽检：{{ lastRun.ruleName }} · {{ lastRun.at }} · 抽中 {{ lastRun.count }} 条（{{
          lastRun.pickedIds?.join(', ')
        }}）
      </p>
    </a-card>

    <a-card>
      <template #title>抽检样本池</template>
      <a-table :data-source="pool" :columns="ornTableCols2" :pagination="false" row-key="id">
  <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'id'">
{{ getModalityMeta(record.modality)?.short }}
      </template>
      <template v-if="column.key === 'taskId'">
<a-tag size="small" :color="mapTagColor(statusType(record.status))">{{ statusLabel(record.status) }}</a-tag>
      </template>
      <template v-if="column.key === '不合格原因'">
<a-select
              v-if="record.status === 'checking' || record.status === 'pending'"
              v-model:value="rejectMap[record.id]"
              placeholder="原因"
              size="small"
              style="width: 140px">
              <a-select-option
                v-for="r in REJECT_REASONS"
                :key="r.value"
                :value="r.value">{{ r.label }}</a-select-option>
            </a-select>
            <span v-else>{{
              record.reason
                ? REJECT_REASONS.find((r) => r.value === record.reason)?.label || record.reason
                : '—'
            }}</span>
      </template>
      <template v-if="column.key === '操作'">
<a-button
              
              color="success"
              :disabled="!(record.status === 'checking' || record.status === 'pending')"
              @click="onPass(record.id)">
              合格
            </a-button>
            <a-button
              
              type="" danger
              :disabled="!(record.status === 'checking' || record.status === 'pending')"
              @click="onReject(record.id)">
              不合格
            </a-button>
      </template>
  </template>
</a-table>
    </a-card>
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 12px;
}
.stats {
  margin-bottom: 12px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}
.mb {
  margin-bottom: 12px;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.run-tip {
  margin: 12px 0 0;
  font-size: 12px;
  color: #6b7280;
}
</style>
