<script setup>
import { h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpace, NTag } from 'naive-ui'
import { message } from '@/ui/discrete'
import ProgressMock from '@/components/ProgressMock.vue'
import { listMeta, listVlaTasks, createCollectTask, getCollectStats } from '@/services/vla'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const collectStats = ref(null)
const filters = reactive({ status: null, scene: null, mode: null, keyword: '' })
const meta = reactive({
  modes: [],
  scenes: [],
  plans: [],
  actionTemplates: [],
  personnel: [],
  devices: [],
})

const dataTypeOptions = [
  { value: 'video', label: '视频' },
  { value: 'image', label: '图像' },
  { value: 'action', label: '连续动作' },
  { value: 'sync', label: '多模态同步' },
]

const formRef = ref()
const form = reactive({
  name: '',
  scene: '',
  plan: '',
  mode: '',
  actionTemplateIds: [],
  personnelIds: [],
  deviceIds: [],
  dataTypes: ['video', 'action'],
  targetCount: 20,
  qualityRequirement: '',
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

function labelOf(list, value) {
  return list.find((x) => x.value === value)?.label || value
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

const taskColumns = [
  { title: '任务号', key: 'id', width: 150 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  {
    title: '场景',
    key: 'scene',
    width: 100,
    render: (r) => labelOf(meta.scenes, r.scene),
  },
  {
    title: '模式',
    key: 'mode',
    width: 100,
    render: (r) => labelOf(meta.modes, r.mode),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (r) =>
      h(
        NTag,
        {
          size: 'small',
          bordered: false,
          type: r.status === 'done' ? 'success' : r.status === 'annotating' ? 'warning' : 'info',
        },
        { default: () => r.status },
      ),
  },
  {
    title: '动作/问题',
    key: 'counts',
    width: 100,
    render: (r) => `${r.actionCount || 0} / ${r.issueCount || 0}`,
  },
  {
    title: '进度',
    key: 'progress',
    width: 100,
    render: (r) => `${r.collectedCount || 0}/${r.targetCount || '—'}`,
  },
  {
    title: '设备',
    key: 'deviceIds',
    width: 70,
    render: (r) => (r.deviceIds || []).length,
  },
  {
    title: '操作',
    key: 'act',
    width: 200,
    render: (r) =>
      h(NSpace, { size: 4 }, {
        default: () => [
          h(NButton, { size: 'tiny', quaternary: true, type: 'primary', onClick: () => goAnnotate(r.id) }, { default: () => '标注' }),
          h(NButton, { size: 'tiny', quaternary: true, onClick: () => goQuality(r.id) }, { default: () => '质检' }),
          h(NButton, { size: 'tiny', quaternary: true, onClick: () => goAnalysis(r.id) }, { default: () => '分析' }),
        ],
      }),
  },
]

async function refresh() {
  loading.value = true
  try {
    const m = listMeta()
    Object.assign(meta, m)
    const [res, st] = await Promise.all([
      listVlaTasks({
        page: page.value,
        pageSize: pageSize.value,
        status: filters.status || undefined,
        scene: filters.scene || undefined,
        mode: filters.mode || undefined,
        keyword: filters.keyword || undefined,
      }),
      getCollectStats(),
    ])
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
    collectStats.value = st
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  refresh()
}

function onPageSize() {
  page.value = 1
  refresh()
}

async function onSubmit() {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) {
    message.error('请先完整填写必填项（红色校验提示）')
    return
  }
  saving.value = true
  try {
    const task = await createCollectTask({ ...form })
    message.success(`已创建采集任务 ${task.id}`)
    form.name = ''
    form.instruction = ''
    form.qualityRequirement = ''
    form.actionTemplateIds = []
    form.personnelIds = []
    form.deviceIds = []
    await refresh()
    router.push(`/vla/timeline/${task.id}`)
  } catch (e) {
    message.error(e.message || '创建失败')
  } finally {
    saving.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <div class="collect">
    <n-alert type="info" :bordered="false" class="mb">
      演示假数据：可配置场景/方案/模式/模板/人员/设备与质量要求；创建后进入时间轴标注。非真实采集驱动。
    </n-alert>

    <div v-if="collectStats" class="kpis mb">
      <n-card size="small" :bordered="false"><div class="k">任务总数</div><div class="v">{{ collectStats.taskTotal }}</div></n-card>
      <n-card size="small" :bordered="false">
        <div class="k">已采集/目标</div>
        <div class="v">{{ collectStats.collectedCount }} / {{ collectStats.targetCount }}</div>
      </n-card>
      <n-card size="small" :bordered="false"><div class="k">采集进度</div><div class="v">{{ collectStats.progressPct }}%</div></n-card>
      <n-card size="small" :bordered="false">
        <div class="k">在线设备</div>
        <div class="v">{{ collectStats.deviceOnline }} / {{ collectStats.deviceTotal }}</div>
      </n-card>
    </div>

    <n-grid cols="24" :x-gap="16" :y-gap="16">
      <n-gi :span="10">
        <n-card class="card" :bordered="false">
          <template #header>
            <div class="card-head">
              <span>新建采集任务</span>
              <n-tag size="small" type="primary" :bordered="false">配置项 2.5 分</n-tag>
            </div>
          </template>

          <n-form ref="formRef" :model="form" :rules="formRules" label-placement="left" label-width="90">
            <n-form-item label="任务名称" path="name">
              <n-input v-model:value="form.name" maxlength="40" placeholder="例如：仓拣-红盒抓取放置" />
            </n-form-item>
            <n-form-item label="场景信息" path="scene">
              <n-select
                v-model:value="form.scene"
                placeholder="选择场景"
                style="width: 100%"
                :options="meta.scenes.map((s) => ({ label: s.label, value: s.value }))"
              />
            </n-form-item>
            <n-form-item label="采集方案" path="plan">
              <n-select
                v-model:value="form.plan"
                placeholder="选择方案"
                style="width: 100%"
                :options="meta.plans.map((p) => ({ label: p.label, value: p.value }))"
              />
            </n-form-item>
            <n-form-item label="采集模式" path="mode">
              <n-radio-group v-model:value="form.mode">
                <n-space>
                  <n-radio v-for="m in meta.modes" :key="m.value" :value="m.value">{{ m.label }}</n-radio>
                </n-space>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="动作模板" path="actionTemplateIds">
              <n-select
                v-model:value="form.actionTemplateIds"
                multiple
                max-tag-count="3"
                placeholder="多选动作模板"
                style="width: 100%"
                :options="meta.actionTemplates.map((t) => ({ label: `${t.name} (${t.code})`, value: t.id }))"
              />
            </n-form-item>
            <n-form-item label="人员配置" path="personnelIds">
              <n-select
                v-model:value="form.personnelIds"
                multiple
                max-tag-count="3"
                placeholder="选择采集/标注人员"
                style="width: 100%"
                :options="meta.personnel.map((u) => ({ label: `${u.name} · ${u.squad || u.role}`, value: u.id }))"
              />
            </n-form-item>
            <n-form-item label="采集设备">
              <n-select
                v-model:value="form.deviceIds"
                multiple
                max-tag-count="2"
                placeholder="关联设备（可空）"
                style="width: 100%"
                :options="
                  (meta.devices || []).map((d) => ({
                    label: `${d.name} · ${d.typeLabel || d.type} · ${d.status}`,
                    value: d.id,
                  }))
                "
              />
            </n-form-item>
            <n-form-item label="数据类型">
              <n-select v-model:value="form.dataTypes" multiple style="width: 100%" :options="dataTypeOptions" />
            </n-form-item>
            <n-form-item label="目标条数">
              <n-input-number v-model:value="form.targetCount" :min="1" :max="500" />
            </n-form-item>
            <n-form-item label="质量要求">
              <n-input
                v-model:value="form.qualityRequirement"
                type="textarea"
                :rows="2"
                placeholder="例如：画面稳定、关键帧清晰、动作与指令一致"
              />
            </n-form-item>
            <n-form-item label="任务指令">
              <n-input
                v-model:value="form.instruction"
                type="textarea"
                :rows="3"
                placeholder="自然语言任务指令（将与视频/图像联动展示）"
              />
            </n-form-item>
            <n-form-item>
              <n-space>
                <n-button type="primary" :loading="saving" @click="onSubmit">创建任务</n-button>
                <n-button @click="refresh">刷新列表</n-button>
                <n-button quaternary @click="router.push('/vla/devices')">设备台账</n-button>
              </n-space>
            </n-form-item>
          </n-form>

          <ProgressMock :running="saving" label="写入采集方案与人员配置" :duration="700" />
        </n-card>
      </n-gi>

      <n-gi :span="14">
        <n-card class="card" :bordered="false">
          <template #header>
            <div class="card-head">
              <span>采集任务列表（{{ total }}）</span>
              <n-text depth="3" style="font-size: 12px">前缀 LM-VLA-</n-text>
            </div>
          </template>

          <n-space class="mb" wrap>
            <n-input v-model:value="filters.keyword" clearable placeholder="任务号/名称" style="width: 160px" />
            <n-select
              v-model:value="filters.scene"
              clearable
              placeholder="场景"
              style="width: 140px"
              :options="(meta.scenes || []).map((x) => ({ label: x.label, value: x.value }))"
            />
            <n-select
              v-model:value="filters.mode"
              clearable
              placeholder="模式"
              style="width: 130px"
              :options="(meta.modes || []).map((x) => ({ label: x.label, value: x.value }))"
            />
            <n-select
              v-model:value="filters.status"
              clearable
              placeholder="状态"
              style="width: 120px"
              :options="[
                { label: 'ready', value: 'ready' },
                { label: 'annotating', value: 'annotating' },
                { label: 'done', value: 'done' },
              ]"
            />
            <n-button type="primary" :loading="loading" @click="onSearch">查询</n-button>
          </n-space>

          <n-data-table
            :loading="loading"
            :columns="taskColumns"
            :data="tasks"
            :row-key="(r) => r.id"
            size="small"
            :bordered="false"
          />
          <div class="pager">
            <n-pagination
              v-model:page="page"
              v-model:page-size="pageSize"
              :item-count="total"
              show-size-picker
              :page-sizes="[10, 20, 50]"
              @update:page="refresh"
              @update:page-size="onPageSize"
            />
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<style scoped>
.mb { margin-bottom: 12px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.k { color: #8b8b9a; font-size: 12px; }
.v { margin-top: 4px; font-size: 20px; color: #63e2b7; font-weight: 600; }
.card { border-radius: 8px; }
.card-head { display: flex; align-items: center; justify-content: space-between; }
.pager { margin-top: 12px; display: flex; justify-content: flex-end; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 1000px) { .kpis { grid-template-columns: 1fr 1fr; } }
</style>
