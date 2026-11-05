<script setup>
import { Message } from '@/ui/discrete'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ProgressMock from '@/components/ProgressMock.vue'
import {
  listMeta,
  listVlaTasks,
  createCollectTask,
} from '@/services/vla'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const tasks = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', status: '', scene: '' })
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
    const res = await listVlaTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
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
    Message.error('请先完整填写必填项（红色校验提示）')
    return
  }

  saving.value = true
  try {
    const task = await createCollectTask({ ...form })
    Message.success(`已创建采集任务 ${task.id}`)
    form.name = ''
    form.instruction = ''
    form.actionTemplateIds = []
    form.personnelIds = []
    await refresh()
    router.push(`/vla/timeline/${task.id}`)
  } catch (e) {
    Message.error(e.message || '创建失败')
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
watch([page, pageSize], refresh)
const scTableCols1 = [
  { title: '任务号', dataIndex: 'id', width: 160 },
  { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '场景', slotName: 'scene', width: 120 },
  { title: '方案', dataIndex: 'plan', width: 120 },
  { title: '模式', dataIndex: 'mode', width: 100 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '操作', slotName: 'ops', width: 180 },
]
</script>

<template>
  <div class="collect">
    <a-row :gutter="16">
      <a-col :span="10">
        <a-card class="card">
          <template #title>
            <div class="card-head">
              <span>新建采集任务</span>
              <a-tag size="small" color="arcoblue">配置项 2.5 分</a-tag>
            </div>
          </template>

          <a-form ref="formRef" :model="form" :rules="formRules" label-position="right">
            <a-form-item label="任务名称" prop="name">
              <a-input v-model="form.name" maxlength="40" placeholder="例如：仓拣-红盒抓取放置" />
            </a-form-item>
            <a-form-item label="场景信息" prop="scene">
              <a-select v-model="form.scene" placeholder="选择场景" style="width: 100%">
                <a-option
                  v-for="s in meta.scenes"
                  :key="s.value"
                  :label="s.label"
                  :value="s.value"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="采集方案" prop="plan">
              <a-select v-model="form.plan" placeholder="选择方案" style="width: 100%">
                <a-option
                  v-for="p in meta.plans"
                  :key="p.value"
                  :label="p.label"
                  :value="p.value"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="采集模式" prop="mode">
              <a-radio-group v-model="form.mode">
                <a-radio v-for="m in meta.modes" :key="m.value" :value="m.value">
                  {{ m.label }}
                </a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="动作模板" prop="actionTemplateIds">
              <a-select
                v-model="form.actionTemplateIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="多选动作模板"
                style="width: 100%"
              >
                <a-option
                  v-for="t in meta.actionTemplates"
                  :key="t.id"
                  :label="`${t.name} (${t.code})`"
                  :value="t.id"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="人员配置" prop="personnelIds">
              <a-select
                v-model="form.personnelIds"
                multiple
                collapse-tags
                placeholder="选择采集/标注人员"
                style="width: 100%"
              >
                <a-option
                  v-for="u in meta.personnel"
                  :key="u.id"
                  :label="`${u.name} · ${u.pool}`"
                  :value="u.id"
                />
              </a-select>
            </a-form-item>
            <a-form-item label="任务指令">
              <a-textarea
                v-model="form.instruction"
                
                :rows="3"
                placeholder="自然语言任务指令（将与视频/图像联动展示）"
              />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" :loading="saving" @click="onSubmit">创建任务</a-button>
              <a-button @click="refresh">刷新列表</a-button>
            </a-form-item>
          </a-form>

          <ProgressMock :running="saving" label="写入采集方案与人员配置" :duration="700" />
        </a-card>
      </a-col>

      <a-col :span="14">
        <a-card class="card">
          <template #title>
            <div class="card-head">
              <span>采集任务列表</span>
              <span type="info" size="small">前缀 SC-VLA-</span>
            </div>
          </template>

          <a-empty v-if="!tasks.length && !loading" description="暂无采集任务，请先创建" />
          <div class="list-filters">
            <a-input v-model="filters.keyword" allow-clear placeholder="关键字" style="width: 140px; margin-right: 8px" />
            <a-select v-model="filters.scene" allow-clear placeholder="场景" style="width: 140px; margin-right: 8px">
              <a-option v-for="s in meta.scenes" :key="s.value" :label="s.label" :value="s.value" />
            </a-select>
            <a-select v-model="filters.status" allow-clear placeholder="状态" style="width: 120px; margin-right: 8px">
              <a-option value="ready" label="ready" />
              <a-option value="annotating" label="annotating" />
              <a-option value="done" label="done" />
            </a-select>
            <a-button type="primary" size="small" @click="onSearch">查询</a-button>
          </div>
          <a-table :columns="scTableCols1" :data="tasks" row-key="id" :pagination="false" size="small">
            <template #scene="{ record }">{{ labelOf(meta.scenes, record.scene) }}</template>
            <template #ops="{ record }">
              <a-space>
                <a-button size="mini" @click="goAnnotate(record.id)">标注</a-button>
                <a-button size="mini" @click="goQuality(record.id)">质检</a-button>
              </a-space>
            </template>
          </a-table>
          <div class="pager">
            <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-total show-page-size :page-size-options="[10,20,50]" />
          </div>
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
:deep(.el-radio) {
  margin-right: 12px;
  margin-bottom: 6px;
}
.list-filters { margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
