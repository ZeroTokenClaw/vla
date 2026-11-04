<script setup>
import { message } from '@/ui/discrete'
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
    message.error('请先完整填写必填项（红色校验提示）')
    return
  }

  saving.value = true
  try {
    const task = await createCollectTask({ ...form })
    message.success(`已创建采集任务 ${task.id}`)
    form.name = ''
    form.instruction = ''
    form.actionTemplateIds = []
    form.personnelIds = []
    await refresh()
    router.push(`/vla/timeline/${task.id}`)
  } catch (e) {
    message.error(e.message || '创建失败')
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
const lmTableCols1 = [
  
]
</script>

<template>
  <div class="collect">
    <n-grid cols="24"  x-gap="16" y-gap="16">
      <n-gi :span="10">
        <n-card class="card">
          <template #header>
            <div class="card-head">
              <span>新建采集任务</span>
              <n-tag size="small" type="primary">配置项 2.5 分</n-tag>
            </div>
          </template>

          <n-form ref="formRef" :model="form" :rules="formRules" label-position="right">
            <n-form-item label="任务名称" path="name">
              <n-input v-model="form.name" maxlength="40" placeholder="例如：仓拣-红盒抓取放置" />
            </n-form-item>
            <n-form-item label="场景信息" path="scene">
              <n-select v-model="form.scene" placeholder="选择场景" style="width: 100%" :options="meta.scenes.map(s => ({ label: s.label, value: s.value }))"></n-select>
            </n-form-item>
            <n-form-item label="采集方案" path="plan">
              <n-select v-model="form.plan" placeholder="选择方案" style="width: 100%" :options="meta.plans.map(p => ({ label: p.label, value: p.value }))"></n-select>
            </n-form-item>
            <n-form-item label="采集模式" path="mode">
              <n-radio-group v-model="form.mode">
                <n-radio v-for="m in meta.modes" :key="m.value" :value="m.value">
                  {{ m.label }}
                </n-radio>
              </n-radio-group>
            </n-form-item>
            <n-form-item label="动作模板" path="actionTemplateIds">
              <n-select
                v-model="form.actionTemplateIds"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="多选动作模板"
                style="width: 100%"
               :options="meta.actionTemplates.map(t => ({ label: `${t.name} (${t.code})`, value: t.id }))"></n-select>
            </n-form-item>
            <n-form-item label="人员配置" path="personnelIds">
              <n-select
                v-model="form.personnelIds"
                multiple
                collapse-tags
                placeholder="选择采集/标注人员"
                style="width: 100%"
               :options="meta.personnel.map(u => ({ label: `${u.name} · ${u.dept}`, value: u.id }))"></n-select>
            </n-form-item>
            <n-form-item label="任务指令">
              <n-input
                v-model="form.instruction"
                type="textarea"
                :rows="3"
                placeholder="自然语言任务指令（将与视频/图像联动展示）"
              />
            </n-form-item>
            <n-form-item>
              <n-button type="primary" :loading="saving" @click="onSubmit">创建任务</n-button>
              <n-button @click="refresh">刷新列表</n-button>
            </n-form-item>
          </n-form>

          <ProgressMock :running="saving" label="写入采集方案与人员配置" :duration="700" />
        </n-card>
      </n-gi>

      <n-gi :span="14">
        <n-card class="card">
          <template #header>
            <div class="card-head">
              <span>采集任务列表</span>
              <n-text type="info" size="small">前缀 LM-VLA-</n-text>
            </div>
          </template>

          <n-empty v-if="!tasks.length && !loading" description="暂无采集任务，请先创建" />
          <n-data-table :columns="lmTableCols1" :data="tasks" :row-key="(r) => r.id" size="small" :bordered="false" :single-line="false"></n-data-table>
        </n-card>
      </n-gi>
    </n-grid>
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
