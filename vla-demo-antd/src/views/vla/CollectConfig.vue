<script setup>import { notification } from 'ant-design-vue'

import { onMounted, reactive, ref } from 'vue'
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
    tasks.value = await listVlaTasks()
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

function labelOf(list, value) {
  return list.find((x) => x.value === value)?.label || value
}

onMounted(refresh)

function mapTagColor(t) {
  const m = { danger: 'error', warning: 'warning', success: 'success', info: 'default', primary: 'processing', '': 'default' }
  return m[t] || t || 'default'
}

const ornTableCols1 = [
  { title: '任务号', key: 'id', dataIndex: 'id', width: 150 },
  { title: '模式', key: '模式', width: 110 },
  { title: '动作数', key: 'actionCount', dataIndex: 'actionCount', width: 70 },
  { title: '操作', key: '操作', width: 170, fixed: 'right' }
]
</script>

<template>
  <div :loading="loading" class="collect">
    <a-row :gutter="16">
      <a-col :span="10">
        <a-card  class="card">
          <template #title>
            <div class="card-head">
              <span>新建采集任务</span>
              <a-tag size="small" type="primary">配置项 2.5 分</a-tag>
            </div>
          </template>

          <a-form ref="formRef" :model="form" :rules="formRules" :label-col="{ style: { width: '100px' } }" >
            <a-form-item label="任务名称" prop="name">
              <a-input v-model:value="form.name" maxlength="40" placeholder="例如：仓拣-红盒抓取放置" />
            </a-form-item>
            <a-form-item label="场景信息" prop="scene">
              <a-select v-model:value="form.scene" placeholder="选择场景" style="width: 100%">
                <a-select-option
                  v-for="s in meta.scenes"
                  :key="s.value"
                  :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="采集方案" prop="plan">
              <a-select v-model:value="form.plan" placeholder="选择方案" style="width: 100%">
                <a-select-option
                  v-for="p in meta.plans"
                  :key="p.value"
                  :value="p.value">{{ p.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="采集模式" prop="mode">
              <a-radio-group v-model:value="form.mode">
                <a-radio v-for="m in meta.modes" :key="m.value" :value="m.value">
                  {{ m.label }}
                </a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="动作模板" prop="actionTemplateIds">
              <a-select
                v-model:value="form.actionTemplateIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="多选动作模板"
                style="width: 100%">
                <a-select-option
                  v-for="t in meta.actionTemplates"
                  :key="t.id"
                  :value="t.id">{{ `${t.name} (${t.code})` }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="人员配置" prop="personnelIds">
              <a-select
                v-model:value="form.personnelIds"
                multiple
                collapse-tags
                placeholder="选择采集/标注人员"
                style="width: 100%">
                <a-select-option
                  v-for="u in meta.personnel"
                  :key="u.id"
                  :value="u.id">{{ `${u.name} · ${u.dept}` }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="任务指令">
              <a-textarea
                v-model:value="form.instruction"
                
                :rows="3"
                placeholder="自然语言任务指令（将与视频/图像联动展示）" />
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
        <a-card  class="card">
          <template #title>
            <div class="card-head">
              <span>采集任务列表</span>
              <span class="orn-text" type="info" size="small">prefix ORN-VLA-</span>
            </div>
          </template>

          <a-empty v-if="!tasks.length && !loading" description="暂无采集任务，请先创建" />
<a-table v-else :data-source="tasks" :columns="ornTableCols1" :pagination="false" row-key="id" size="small">
  <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'id'">
{{ labelOf(meta.scenes, record.scene) }}
      </template>
      <template v-if="column.key === '模式'">
{{ labelOf(meta.modes, record.mode) }}
      </template>
      <template v-if="column.key === 'actionCount'">
<a-tag size="small" :color="mapTagColor(record.status === 'annotating' ? 'warning' : 'info')">
                  {{ record.status }}
                </a-tag>
      </template>
      <template v-if="column.key === '操作'">
<a-button  type="" @click="goAnnotate(record.id)">标注</a-button>
                <a-button  color="warning" @click="goQuality(record.id)">质检</a-button>
      </template>
  </template>
</a-table>
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
</style>
