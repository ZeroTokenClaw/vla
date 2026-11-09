<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ProgressMock from '@/components/ProgressMock.vue'
import {
  listMeta,
  listVlaTasks,
  createCollectTask,
  getCollectStats,
} from '@/services/vla'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const collectStats = ref(null)
const filters = reactive({
  scene: '',
  mode: '',
  status: '',
  keyword: '',
})
const meta = reactive({
  modes: [],
  scenes: [],
  plans: [],
  actionTemplates: [],
  personnel: [],
  devices: [],
})
const statusOptions = [
  { value: 'ready', label: 'ready' },
  { value: 'annotating', label: 'annotating' },
  { value: 'done', label: 'done' },
]
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

async function refresh() {
  loading.value = true
  try {
    const m = listMeta()
    Object.assign(meta, m)
    const [res, st] = await Promise.all([
      listVlaTasks({
        page: page.value,
        pageSize: pageSize.value,
        scene: filters.scene || undefined,
        mode: filters.mode || undefined,
        status: filters.status || undefined,
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

async function onSearch() {
  page.value = 1
  await refresh()
}

async function onSubmit() {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) {
    ElMessage.error('请先完整填写必填项（红色校验提示）')
    return
  }

  saving.value = true
  try {
    const task = await createCollectTask({ ...form })
    ElMessage.success(`已创建采集任务 ${task.id}`)
    form.name = ''
    form.instruction = ''
    form.actionTemplateIds = []
    form.personnelIds = []
    await refresh()
    router.push(`/vla/timeline/${task.id}`)
  } catch (e) {
    ElMessage.error(e.message || '创建失败')
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

function labelOf(list, value) {
  return list.find((x) => x.value === value)?.label || value
}

onMounted(refresh)
</script>

<template>
  <div v-loading="loading" class="collect">
    <el-row v-if="collectStats" :gutter="12" class="stats">
      <el-col :span="6"><el-statistic title="任务总数" :value="collectStats.taskTotal" /></el-col>
      <el-col :span="6">
        <el-statistic title="已采集/目标" :value="collectStats.collectedCount" :suffix="` / ${collectStats.targetCount}`" />
      </el-col>
      <el-col :span="6"><el-statistic title="采集进度" :value="collectStats.progressPct" suffix="%" /></el-col>
      <el-col :span="6">
        <el-statistic title="在线设备" :value="collectStats.deviceOnline" :suffix="` / ${collectStats.deviceTotal}`" />
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="10">
        <el-card shadow="never" class="card">
          <template #header>
            <div class="card-head">
              <span>新建采集任务</span>
              <el-tag size="small" type="primary" effect="plain">配置项 2.5 分</el-tag>
            </div>
          </template>

          <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px" label-position="right">
            <el-form-item label="任务名称" prop="name">
              <el-input v-model="form.name" maxlength="40" placeholder="例如：仓拣-红盒抓取放置" />
            </el-form-item>
            <el-form-item label="场景信息" prop="scene">
              <el-select v-model="form.scene" placeholder="选择场景" style="width: 100%">
                <el-option
                  v-for="s in meta.scenes"
                  :key="s.value"
                  :label="s.label"
                  :value="s.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="采集方案" prop="plan">
              <el-select v-model="form.plan" placeholder="选择方案" style="width: 100%">
                <el-option
                  v-for="p in meta.plans"
                  :key="p.value"
                  :label="p.label"
                  :value="p.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="采集模式" prop="mode">
              <el-radio-group v-model="form.mode">
                <el-radio v-for="m in meta.modes" :key="m.value" :value="m.value">
                  {{ m.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="动作模板" prop="actionTemplateIds">
              <el-select
                v-model="form.actionTemplateIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="多选动作模板"
                style="width: 100%"
              >
                <el-option
                  v-for="t in meta.actionTemplates"
                  :key="t.id"
                  :label="`${t.name} (${t.code})`"
                  :value="t.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="人员配置" prop="personnelIds">
              <el-select
                v-model="form.personnelIds"
                multiple
                collapse-tags
                placeholder="选择采集/标注人员"
                style="width: 100%"
              >
                <el-option
                  v-for="u in meta.personnel"
                  :key="u.id"
                  :label="`${u.name} · ${u.dept}`"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="采集设备">
              <el-select
                v-model="form.deviceIds"
                multiple
                collapse-tags
                placeholder="关联设备（可空）"
                style="width: 100%"
              >
                <el-option
                  v-for="d in meta.devices"
                  :key="d.id"
                  :label="`${d.name} · ${d.typeLabel} · ${d.status}`"
                  :value="d.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="数据类型">
              <el-select v-model="form.dataTypes" multiple collapse-tags style="width: 100%">
                <el-option v-for="d in dataTypeOptions" :key="d.value" :label="d.label" :value="d.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="目标条数">
              <el-input-number v-model="form.targetCount" :min="1" :max="500" />
            </el-form-item>
            <el-form-item label="质量要求">
              <el-input
                v-model="form.qualityRequirement"
                type="textarea"
                :rows="2"
                placeholder="例如：画面稳定、关键帧清晰、动作与指令一致"
              />
            </el-form-item>
            <el-form-item label="任务指令">
              <el-input
                v-model="form.instruction"
                type="textarea"
                :rows="3"
                placeholder="自然语言任务指令（将与视频/图像联动展示）"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="onSubmit">创建任务</el-button>
              <el-button @click="refresh">刷新列表</el-button>
            </el-form-item>
          </el-form>

          <ProgressMock :running="saving" label="写入采集方案与人员配置" :duration="700" />
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card shadow="never" class="card">
          <template #header>
            <div class="card-head">
              <span>采集任务列表（{{ total }}）</span>
              <el-text type="info" size="small">前缀 DL-VLA-</el-text>
            </div>
          </template>

                    <el-form :inline="true" class="list-filters" @submit.prevent>
            <el-form-item label="关键词">
              <el-input v-model="filters.keyword" clearable placeholder="任务号/名称" style="width: 160px" />
            </el-form-item>
            <el-form-item label="场景">
              <el-select v-model="filters.scene" clearable placeholder="全部" style="width: 140px">
                <el-option v-for="s in meta.scenes" :key="s.value" :label="s.label" :value="s.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="模式">
              <el-select v-model="filters.mode" clearable placeholder="全部" style="width: 140px">
                <el-option v-for="mo in meta.modes" :key="mo.value" :label="mo.label" :value="mo.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px">
                <el-option v-for="st in statusOptions" :key="st.value" :label="st.label" :value="st.value" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
            </el-form-item>
          </el-form>

          <el-empty v-if="!tasks.length && !loading" description="暂无采集任务，请先创建" :image-size="72" />
          <el-table v-else :data="tasks" stripe size="small" empty-text="暂无采集任务">
            <el-table-column prop="id" label="任务号" min-width="150" />
            <el-table-column prop="name" label="名称" min-width="140" show-overflow-tooltip />
            <el-table-column label="场景" width="100">
              <template #default="{ row }">{{ labelOf(meta.scenes, row.scene) }}</template>
            </el-table-column>
            <el-table-column label="模式" width="110">
              <template #default="{ row }">{{ labelOf(meta.modes, row.mode) }}</template>
            </el-table-column>
            <el-table-column prop="actionCount" label="动作数" width="70" />
            <el-table-column label="采集量" width="100">
              <template #default="{ row }">{{ row.collectedCount || 0 }}/{{ row.targetCount || 0 }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 'annotating' ? 'warning' : 'info'">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="goAnnotate(row.id)">标注</el-button>
                <el-button link type="warning" @click="goQuality(row.id)">质检</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pager">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next, sizes"
              :page-sizes="[10, 20, 50]"
              @current-change="refresh"
              @size-change="() => { page = 1; refresh() }"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.stats {
  margin-bottom: 12px;
  background: #fff;
  padding: 14px 12px;
  border-radius: 8px;
}
.card {
  border-radius: 8px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
:deep(.el-radio) {
  margin-right: 12px;
  margin-bottom: 6px;
}
.list-filters {
  margin-bottom: 8px;
}
.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
