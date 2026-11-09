<script setup>
import { notification } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProgressMock from '@/components/ProgressMock.vue'
import {
  listMeta,
  listVlaTasks,
  createCollectTask,
} from '@/services/vla'
import { listDevices } from '@/services/factory'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const devices = ref([])
const filters = reactive({ status: undefined, scene: undefined, keyword: '' })
const meta = reactive({
  modes: [],
  scenes: [],
  plans: [],
  actionTemplates: [],
  personnel: [],
})

const formRef = ref()
const form = reactive({
  name: '',
  scene: '',
  plan: '',
  mode: '',
  actionTemplateIds: [],
  personnelIds: [],
  reviewerIds: [],
  deviceIds: [],
  robotModel: 'UR5e-Orion',
  frequencyHz: 10,
  durationPlanSec: 12,
  qualityReq: '无严重抖动/遮挡，指令与关键节点完整',
  instruction: '',
})

const formRules = {
  name: [{ required: true, message: '请填写任务名称', trigger: 'blur' }],
  scene: [{ required: true, message: '请选择场景信息', trigger: 'change' }],
  plan: [{ required: true, message: '请选择采集方案', trigger: 'change' }],
  mode: [{ required: true, message: '请选择采集模式', trigger: 'change' }],
  actionTemplateIds: [{ type: 'array', required: true, min: 1, message: '请选择动作模板', trigger: 'change' }],
  personnelIds: [{ type: 'array', required: true, min: 1, message: '请配置采集人员', trigger: 'change' }],
}

const selectedPlan = computed(() => meta.plans.find((p) => p.value === form.plan))
const selectedScene = computed(() => meta.scenes.find((s) => s.value === form.scene))
const onlineDevices = computed(() => devices.value.filter((d) => d.status === 'online' || d.status === 'busy' || !d.status))

const statusStats = computed(() => {
  const map = {}
  for (const t of tasks.value) map[t.status] = (map[t.status] || 0) + 1
  return map
})

async function refresh() {
  loading.value = true
  try {
    const m = listMeta()
    Object.assign(meta, m)
    devices.value = await listDevices()
    const res = await listVlaTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) {
    notification.error({ message: '请先完整填写必填项（红色校验提示）', placement: 'topRight' })
    return
  }

  saving.value = true
  try {
    const task = await createCollectTask({ ...form })
    notification.success({ message: `已创建采集任务 ${task.id}`, placement: 'topRight' })
    form.name = ''
    form.instruction = ''
    form.actionTemplateIds = []
    form.personnelIds = []
    await refresh()
    router.push(`/vla/timeline/${task.id}`)
  } catch (e) {
    notification.error({ message: e.message || '创建失败', placement: 'topRight' })
  } finally {
    saving.value = false
  }
}

function goAnnotate(id) {
  router.push(`/vla/timeline/${id}`)
}

function goQuality(id) {
  router.push(`/vla/quality/${id}`)
}

function goAnalysis(id) {
  router.push(`/vla/action-analysis/${id}`)
}

function labelOf(list, value) {
  return list.find((x) => x.value === value)?.label || value
}

function applyPlanPreset() {
  const p = selectedPlan.value
  if (!p) return
  if (p.frequencyHz) form.frequencyHz = p.frequencyHz
  if (p.durationSec) form.durationPlanSec = p.durationSec
  if (p.qualityReq) form.qualityReq = p.qualityReq
  notification.info({ message: '已套用方案频率/时长/质量要求', placement: 'topRight' })
}

onMounted(refresh)

function mapStatusColor(s) {
  const m = {
    annotating: 'processing',
    ready: 'success',
    collecting: 'cyan',
    reviewing: 'warning',
    done: 'default',
    failed: 'error',
  }
  return m[s] || 'default'
}

const cols = [
  { title: '任务号', dataIndex: 'id', width: 150 },
  { title: '名称', dataIndex: 'name', ellipsis: true },
  { title: '场景', key: 'scene', width: 120 },
  { title: '模式', key: 'mode', width: 100 },
  { title: '动作数', dataIndex: 'actionCount', width: 70 },
  { title: '状态', key: 'status', width: 100 },
  { title: '设备', key: 'devices', width: 90 },
  { title: '操作', key: 'ops', width: 210, fixed: 'right' },
]
</script>

<template>
  <div class="collect">
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="采集配置：场景/方案/模式/动作模板/人员/设备一站创建；列表可筛选并跳转时间轴、质检与动作分析（演示假数据）。"
    />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="本页任务" :value="tasks.length" /></a-col>
      <a-col :span="6"><a-statistic title="标注中" :value="statusStats.annotating || 0" /></a-col>
      <a-col :span="6"><a-statistic title="在线设备" :value="onlineDevices.length" /></a-col>
      <a-col :span="6"><a-statistic title="动作模板" :value="meta.actionTemplates.length" /></a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :span="10">
        <a-card class="card">
          <template #title>
            <div class="card-head">
              <span>新建采集任务</span>
              <a-tag color="blue">配置项 2.5 分</a-tag>
            </div>
          </template>

          <a-form ref="formRef" :model="form" :rules="formRules" :label-col="{ style: { width: '108px' } }">
            <a-form-item label="任务名称" name="name">
              <a-input v-model:value="form.name" maxlength="40" placeholder="例如：仓拣-红盒抓取放置" />
            </a-form-item>
            <a-form-item label="场景信息" name="scene">
              <a-select v-model:value="form.scene" placeholder="选择场景" style="width: 100%" :options="meta.scenes" />
            </a-form-item>
            <a-form-item label="采集方案" name="plan">
              <a-space style="width: 100%" :size="8">
                <a-select v-model:value="form.plan" placeholder="选择方案" style="flex: 1; min-width: 180px" :options="meta.plans" />
                <a-button @click="applyPlanPreset">套用预设</a-button>
              </a-space>
            </a-form-item>
            <a-form-item label="采集模式" name="mode">
              <a-radio-group v-model:value="form.mode">
                <a-radio v-for="m in meta.modes" :key="m.value" :value="m.value">{{ m.label }}</a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="动作模板" name="actionTemplateIds">
              <a-select
                v-model:value="form.actionTemplateIds"
                mode="multiple"
                placeholder="多选动作模板"
                style="width: 100%"
                :options="meta.actionTemplates.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))"
              />
            </a-form-item>
            <a-form-item label="人员配置" name="personnelIds">
              <a-select
                v-model:value="form.personnelIds"
                mode="multiple"
                placeholder="选择采集/标注人员"
                style="width: 100%"
                :options="meta.personnel.map((u) => ({ value: u.id, label: `${u.name} · ${u.dept}` }))"
              />
            </a-form-item>
            <a-form-item label="审核人员">
              <a-select
                v-model:value="form.reviewerIds"
                mode="multiple"
                placeholder="数据审核人员"
                style="width: 100%"
                :options="meta.personnel.map((u) => ({ value: u.id, label: u.name }))"
              />
            </a-form-item>
            <a-form-item label="采集设备">
              <a-select
                v-model:value="form.deviceIds"
                mode="multiple"
                placeholder="相机/麦克风/机械臂/工控机"
                style="width: 100%"
                :options="devices.map((d) => ({ value: d.id, label: `${d.name}（${d.type}${d.status ? ' · ' + d.status : ''}）` }))"
              />
            </a-form-item>
            <a-form-item label="机器人型号">
              <a-input v-model:value="form.robotModel" placeholder="例如 UR5e-Orion" />
            </a-form-item>
            <a-form-item label="采集频率(Hz)">
              <a-input-number v-model:value="form.frequencyHz" :min="1" :max="60" style="width: 100%" />
            </a-form-item>
            <a-form-item label="采集时长(s)">
              <a-input-number v-model:value="form.durationPlanSec" :min="1" :max="300" style="width: 100%" />
            </a-form-item>
            <a-form-item label="质量要求">
              <a-textarea v-model:value="form.qualityReq" :rows="2" />
            </a-form-item>
            <a-form-item label="任务指令">
              <a-textarea
                v-model:value="form.instruction"
                :rows="3"
                placeholder="自然语言任务指令（将与视频/图像联动展示）"
              />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" :loading="saving" @click="onSubmit">创建任务</a-button>
                <a-button @click="refresh">刷新列表</a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <a-descriptions v-if="selectedScene || selectedPlan" size="small" bordered :column="1" style="margin-top: 8px">
            <a-descriptions-item v-if="selectedScene" label="场景摘要">{{ selectedScene.label }}</a-descriptions-item>
            <a-descriptions-item v-if="selectedPlan" label="方案摘要">{{ selectedPlan.label }}</a-descriptions-item>
          </a-descriptions>

          <ProgressMock :running="saving" label="写入采集方案与人员配置" :duration="700" />
        </a-card>
      </a-col>

      <a-col :span="14">
        <a-card class="card">
          <template #title>
            <div class="card-head">
              <span>采集任务列表</span>
              <a-tag>prefix ORN-VLA-</a-tag>
            </div>
          </template>

          <a-space style="margin-bottom: 12px" wrap>
            <a-input v-model:value="filters.keyword" placeholder="搜索任务号/名称" style="width: 180px" allow-clear />
            <a-select
              v-model:value="filters.scene"
              allow-clear
              placeholder="场景"
              style="width: 140px"
              :options="meta.scenes"
            />
            <a-select
              v-model:value="filters.status"
              allow-clear
              placeholder="状态"
              style="width: 130px"
              :options="['annotating', 'ready', 'collecting', 'reviewing', 'done'].map((v) => ({ value: v, label: v }))"
            />
            <a-button type="primary" @click="() => { page = 1; refresh() }">查询</a-button>
          </a-space>

          <a-spin :spinning="loading">
            <a-empty v-if="!tasks.length && !loading" description="暂无采集任务，请先创建" />
            <a-table v-else :data-source="tasks" :columns="cols" :pagination="false" row-key="id" size="small">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'scene'">{{ labelOf(meta.scenes, record.scene) }}</template>
                <template v-else-if="column.key === 'mode'">{{ labelOf(meta.modes, record.mode) }}</template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="mapStatusColor(record.status)">{{ record.status }}</a-tag>
                </template>
                <template v-else-if="column.key === 'devices'">
                  {{ (record.deviceIds || []).length || 0 }} 台
                </template>
                <template v-else-if="column.key === 'ops'">
                  <a-button type="link" size="small" @click="goAnnotate(record.id)">标注</a-button>
                  <a-button type="link" size="small" @click="goQuality(record.id)">质检</a-button>
                  <a-button type="link" size="small" @click="goAnalysis(record.id)">分析</a-button>
                </template>
              </template>
            </a-table>
            <div style="margin-top: 12px; text-align: right">
              <a-pagination
                v-model:current="page"
                v-model:page-size="pageSize"
                :total="total"
                show-size-changer
                @change="refresh"
              />
            </div>
          </a-spin>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.card {
  border-radius: 8px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
