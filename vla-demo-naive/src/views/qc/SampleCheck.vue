<script setup>
import { message } from '@/ui/discrete'
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
    message.warning('仅管理员/质检员可配置规则')
    return
  }
  await updateSampleRule(rule.id, {
    ratio: rule.ratio,
    enabled: rule.enabled,
    minSamples: rule.minSamples,
    modalities: [...rule.modalities],
  })
  message.success('规则已保存')
  await load()
}

async function runRule(ruleId) {
  running.value = true
  try {
    const res = await runSampleCheck(ruleId)
    lastRun.value = res.run
    message.success(`随机抽检完成，抽中 ${res.run.count} 条`)
    await load()
  } catch (e) {
    message.error(e.message)
  } finally {
    running.value = false
  }
}

async function onPass(id) {
  await passSample(id)
  message.success('已标记合格')
  await load()
}

async function onReject(id) {
  const reason = rejectMap[id] || 'spec_violate'
  await rejectSample(id, reason)
  message.warning('已标记不合格')
  await load()
}

async function onReflux() {
  if (!canConfig.value) {
    message.warning('仅管理员/质检员可执行回流')
    return
  }
  running.value = true
  try {
    const res = await refluxPass([])
    message.success(`合格数据已写入回流库：${res.count} 条`)
    await load()
  } catch (e) {
    message.error(e.message)
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
const lmTableCols1 = [
  
]
const lmTableCols2 = [
  
]
</script>

<template>
  <div>
    <n-alert
      class="tip"
      type="info"
      :closable="false"
      show-icon
      title="抽检回流：配置规则 → 随机抽检（可见进度）→ 合格通过 / 不合格驳回 → 合格数据写入回流库。"
    />

    <n-grid cols="24"  x-gap="12" y-gap="12" class="stats">
      <n-gi :span="6"><n-statistic title="待/抽检中" :value="stats.pending" /></n-gi>
      <n-gi :span="6"><n-statistic title="合格" :value="stats.pass" /></n-gi>
      <n-gi :span="6"><n-statistic title="不合格" :value="stats.fail" /></n-gi>
      <n-gi :span="6"><n-statistic title="已回流" :value="stats.refluxed" /></n-gi>
    </n-grid>

    <ProgressMock :running="running" label="抽检 / 回流处理中" :duration="1100" />

    <n-card class="mb">
      <template #header>
        <div class="hd">
          <span>抽检规则配置</span>
          <n-button type="primary" :disabled="!canConfig" @click="onReflux">合格数据回流</n-button>
        </div>
      </template>
      <n-data-table :columns="lmTableCols1" :data="rules" :row-key="(r) => r.id" size="small" :bordered="false" :single-line="false"></n-data-table>
      <p v-if="lastRun" class="run-tip">
        最近抽检：{{ lastRun.ruleName }} · {{ lastRun.at }} · 抽中 {{ lastRun.count }} 条（{{
          lastRun.pickedIds?.join(', ')
        }}）
      </p>
    </n-card>

    <n-card>
      <template #header>抽检样本池</template>
      <n-data-table :columns="lmTableCols2" :data="pool" :row-key="(r) => r.id" size="small" :bordered="false" :single-line="false"></n-data-table>
    </n-card>
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
