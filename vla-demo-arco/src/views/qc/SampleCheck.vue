<script setup>
import { Message } from '@/ui/discrete'
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
    pool.value = (await listSamplePool({ page: 1, pageSize: 200 })).items
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveRule(rule) {
  if (!canConfig.value) {
    Message.warning('仅管理员/质检员可配置规则')
    return
  }
  await updateSampleRule(rule.id, {
    ratio: rule.ratio,
    enabled: rule.enabled,
    minSamples: rule.minSamples,
    modalities: [...rule.modalities],
  })
  Message.success('规则已保存')
  await load()
}

async function runRule(ruleId) {
  running.value = true
  try {
    const res = await runSampleCheck(ruleId)
    lastRun.value = res.run
    Message.success(`随机抽检完成，抽中 ${res.run.count} 条`)
    await load()
  } catch (e) {
    Message.error(e.message)
  } finally {
    running.value = false
  }
}

async function onPass(id) {
  await passSample(id)
  Message.success('已标记合格')
  await load()
}

async function onReject(id) {
  const reason = rejectMap[id] || 'spec_violate'
  await rejectSample(id, reason)
  Message.warning('已标记不合格')
  await load()
}

async function onReflux() {
  if (!canConfig.value) {
    Message.warning('仅管理员/质检员可执行回流')
    return
  }
  running.value = true
  try {
    const res = await refluxPass([])
    Message.success(`合格数据已写入回流库：${res.count} 条`)
    await load()
  } catch (e) {
    Message.error(e.message)
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
const scTableCols1 = [
  { title: '规则号', dataIndex: 'id', width: 120 },
  { title: '名称', dataIndex: 'name', width: 160 },
  { title: '抽检比例', slotName: 'ratio', width: 180 },
  { title: '覆盖模态', slotName: 'modalities', width: 200 },
  { title: '启用', slotName: 'enabled', width: 80 },
  { title: '操作', slotName: 'ops', width: 200 },
]
const scTableCols2 = [
  { title: '样本号', dataIndex: 'id', width: 130 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '工单', dataIndex: 'taskId', width: 160 },
  { title: '模态', slotName: 'modality', width: 100 },
  { title: '状态', slotName: 'status', width: 100 },
  { title: '驳回原因', slotName: 'reason', width: 160 },
  { title: '判定', slotName: 'ops', width: 260 },
]
</script>

<template>
  <div>
    <a-alert
      class="tip"
      type="info"
      :closable="false"
      show-icon
      title="抽检回流：配置规则 → 随机抽检（可见进度）→ 合格通过 / 不合格驳回 → 合格数据写入回流库。"
    />

    <a-row :gutter="12" class="stats">
      <a-col :span="6"><a-statistic title="待/抽检中" :value="stats.pending" /></a-col>
      <a-col :span="6"><a-statistic title="合格" :value="stats.pass" /></a-col>
      <a-col :span="6"><a-statistic title="不合格" :value="stats.fail" /></a-col>
      <a-col :span="6"><a-statistic title="已回流" :value="stats.refluxed" /></a-col>
    </a-row>

    <ProgressMock :running="running" label="抽检 / 回流处理中" :duration="1100" />

    <a-card class="mb">
      <template #title>
        <div class="hd">
          <span>抽检规则配置</span>
          <a-button type="primary" :disabled="!canConfig" @click="onReflux">合格数据回流</a-button>
        </div>
      </template>
      <a-table :columns="scTableCols1" :data="rules" row-key="id" :pagination="false" size="small">
        <template #ratio="{ record }">
          <a-slider
            v-model="record.ratio"
            :min="0.05"
            :max="0.5"
            :step="0.05"
            :format-tooltip="(v) => `${Math.round(v * 100)}%`"
            :disabled="!canConfig"
          />
        </template>
        <template #modalities="{ record }">
          <a-space wrap>
            <a-tag v-for="m in record.modalities" :key="m" size="small">{{ getModalityMeta(m)?.short || m }}</a-tag>
          </a-space>
        </template>
        <template #enabled="{ record }">
          <a-switch v-model="record.enabled" :disabled="!canConfig" />
        </template>
        <template #ops="{ record }">
          <a-space>
            <a-button size="mini" :disabled="!canConfig" @click="saveRule(record)">保存</a-button>
            <a-button size="mini" type="primary" :disabled="!record.enabled" @click="runRule(record.id)">随机抽检</a-button>
          </a-space>
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
      <a-table :columns="scTableCols2" :data="pool" row-key="id" :pagination="false" size="small">
        <template #modality="{ record }">{{ getModalityMeta(record.modality)?.short || record.modality }}</template>
        <template #status="{ record }">
          <a-tag size="small" :color="statusType(record.status) === 'success' ? 'green' : statusType(record.status) === 'danger' ? 'red' : 'arcoblue'">
            {{ statusLabel(record.status) }}
          </a-tag>
        </template>
        <template #reason="{ record }">
          <a-select
            v-if="record.status === 'checking' || record.status === 'pending'"
            v-model="rejectMap[record.id]"
            placeholder="驳回原因"
            size="mini"
            allow-clear
            style="width: 140px"
          >
            <a-option v-for="r in REJECT_REASONS" :key="r.value" :value="r.value" :label="r.label" />
          </a-select>
          <span v-else>{{ record.reason || '—' }}</span>
        </template>
        <template #ops="{ record }">
          <a-space>
            <a-button
              size="mini"
              status="success"
              :disabled="!['pending', 'checking'].includes(record.status)"
              @click="onPass(record.id)"
            >
              合格
            </a-button>
            <a-button
              size="mini"
              status="danger"
              :disabled="!['pending', 'checking'].includes(record.status)"
              @click="onReject(record.id)"
            >
              不合格
            </a-button>
          </a-space>
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
