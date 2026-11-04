<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
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
    ElMessage.warning('仅管理员/质检员可配置规则')
    return
  }
  await updateSampleRule(rule.id, {
    ratio: rule.ratio,
    enabled: rule.enabled,
    minSamples: rule.minSamples,
    modalities: [...rule.modalities],
  })
  ElMessage.success('规则已保存')
  await load()
}

async function runRule(ruleId) {
  running.value = true
  try {
    const res = await runSampleCheck(ruleId)
    lastRun.value = res.run
    ElMessage.success(`随机抽检完成，抽中 ${res.run.count} 条`)
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    running.value = false
  }
}

async function onPass(id) {
  await passSample(id)
  ElMessage.success('已标记合格')
  await load()
}

async function onReject(id) {
  const reason = rejectMap[id] || 'spec_violate'
  await rejectSample(id, reason)
  ElMessage.warning('已标记不合格')
  await load()
}

async function onReflux() {
  if (!canConfig.value) {
    ElMessage.warning('仅管理员/质检员可执行回流')
    return
  }
  running.value = true
  try {
    const res = await refluxPass([])
    ElMessage.success(`合格数据已写入回流库：${res.count} 条`)
    await load()
  } catch (e) {
    ElMessage.error(e.message)
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
</script>

<template>
  <div v-loading="loading">
    <el-alert
      class="tip"
      type="info"
      :closable="false"
      show-icon
      title="抽检回流：配置规则 → 随机抽检（可见进度）→ 合格通过 / 不合格驳回 → 合格数据写入回流库。"
    />

    <el-row :gutter="12" class="stats">
      <el-col :span="6"><el-statistic title="待/抽检中" :value="stats.pending" /></el-col>
      <el-col :span="6"><el-statistic title="合格" :value="stats.pass" /></el-col>
      <el-col :span="6"><el-statistic title="不合格" :value="stats.fail" /></el-col>
      <el-col :span="6"><el-statistic title="已回流" :value="stats.refluxed" /></el-col>
    </el-row>

    <ProgressMock :running="running" label="抽检 / 回流处理中" :duration="1100" />

    <el-card shadow="never" class="mb">
      <template #header>
        <div class="hd">
          <span>抽检规则配置</span>
          <el-button type="primary" :disabled="!canConfig" @click="onReflux">合格数据回流</el-button>
        </div>
      </template>
      <el-table :data="rules" stripe>
        <el-table-column prop="id" label="规则号" width="120" />
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="抽检比例" width="160">
          <template #default="{ row }">
            <el-slider
              v-model="row.ratio"
              :min="0.05"
              :max="0.5"
              :step="0.05"
              :format-tooltip="(v) => `${Math.round(v * 100)}%`"
              :disabled="!canConfig"
            />
          </template>
        </el-table-column>
        <el-table-column label="覆盖模态" min-width="200">
          <template #default="{ row }">
            <el-select
              v-model="row.modalities"
              multiple
              collapse-tags
              style="width: 100%"
              :disabled="!canConfig"
            >
              <el-option
                v-for="m in meta.modalities"
                :key="m.value"
                :label="m.short"
                :value="m.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" :disabled="!canConfig" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="!canConfig" @click="saveRule(row)">保存</el-button>
            <el-button link type="primary" :disabled="!row.enabled" @click="runRule(row.id)">
              随机抽检
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <p v-if="lastRun" class="run-tip">
        最近抽检：{{ lastRun.ruleName }} · {{ lastRun.at }} · 抽中 {{ lastRun.count }} 条（{{
          lastRun.pickedIds?.join(', ')
        }}）
      </p>
    </el-card>

    <el-card shadow="never">
      <template #header>抽检样本池</template>
      <el-table :data="pool" stripe>
        <el-table-column prop="id" label="样本号" width="130" />
        <el-table-column prop="title" label="标题" min-width="160" />
        <el-table-column label="模态" width="110">
          <template #default="{ row }">{{ getModalityMeta(row.modality)?.short }}</template>
        </el-table-column>
        <el-table-column prop="taskId" label="关联工单" width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="不合格原因" width="160">
          <template #default="{ row }">
            <el-select
              v-if="row.status === 'checking' || row.status === 'pending'"
              v-model="rejectMap[row.id]"
              placeholder="原因"
              size="small"
              style="width: 140px"
            >
              <el-option
                v-for="r in REJECT_REASONS"
                :key="r.value"
                :label="r.label"
                :value="r.value"
              />
            </el-select>
            <span v-else>{{
              row.reason
                ? REJECT_REASONS.find((r) => r.value === row.reason)?.label || row.reason
                : '—'
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="success"
              :disabled="!(row.status === 'checking' || row.status === 'pending')"
              @click="onPass(row.id)"
            >
              合格
            </el-button>
            <el-button
              link
              type="danger"
              :disabled="!(row.status === 'checking' || row.status === 'pending')"
              @click="onReject(row.id)"
            >
              不合格
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
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
