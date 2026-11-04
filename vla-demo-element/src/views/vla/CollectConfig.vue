<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
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

const form = reactive({
  name: '',
  scene: '',
  plan: '',
  mode: '',
  actionTemplateIds: [],
  personnelIds: [],
  instruction: '',
})

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
  if (!form.name.trim()) return ElMessage.warning('请填写任务名称')
  if (!form.scene) return ElMessage.warning('请选择场景信息')
  if (!form.plan) return ElMessage.warning('请选择采集方案')
  if (!form.mode) return ElMessage.warning('请选择采集模式')
  if (!form.actionTemplateIds.length) return ElMessage.warning('请选择动作模板')
  if (!form.personnelIds.length) return ElMessage.warning('请配置采集人员')

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
    <el-row :gutter="16">
      <el-col :span="10">
        <el-card shadow="never" class="card">
          <template #header>
            <div class="card-head">
              <span>新建采集任务</span>
              <el-tag size="small" type="primary" effect="plain">配置项 2.5 分</el-tag>
            </div>
          </template>

          <el-form label-width="100px" label-position="right">
            <el-form-item label="任务名称" required>
              <el-input v-model="form.name" maxlength="40" placeholder="例如：仓拣-红盒抓取放置" />
            </el-form-item>
            <el-form-item label="场景信息" required>
              <el-select v-model="form.scene" placeholder="选择场景" style="width: 100%">
                <el-option
                  v-for="s in meta.scenes"
                  :key="s.value"
                  :label="s.label"
                  :value="s.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="采集方案" required>
              <el-select v-model="form.plan" placeholder="选择方案" style="width: 100%">
                <el-option
                  v-for="p in meta.plans"
                  :key="p.value"
                  :label="p.label"
                  :value="p.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="采集模式" required>
              <el-radio-group v-model="form.mode">
                <el-radio v-for="m in meta.modes" :key="m.value" :value="m.value">
                  {{ m.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="动作模板" required>
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
            <el-form-item label="人员配置" required>
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
              <span>采集任务列表</span>
              <el-text type="info" size="small">前缀 DL-VLA-</el-text>
            </div>
          </template>

          <el-table :data="tasks" stripe size="small" empty-text="暂无采集任务">
            <el-table-column prop="id" label="任务号" min-width="150" />
            <el-table-column prop="name" label="名称" min-width="140" show-overflow-tooltip />
            <el-table-column label="场景" width="100">
              <template #default="{ row }">{{ labelOf(meta.scenes, row.scene) }}</template>
            </el-table-column>
            <el-table-column label="模式" width="110">
              <template #default="{ row }">{{ labelOf(meta.modes, row.mode) }}</template>
            </el-table-column>
            <el-table-column prop="actionCount" label="动作数" width="70" />
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
        </el-card>
      </el-col>
    </el-row>
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
