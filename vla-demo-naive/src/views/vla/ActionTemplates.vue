<script setup>
import { h, onMounted, ref } from 'vue'
import { NButton } from 'naive-ui'
import { listTemplates, updateTemplate, createTemplate } from '@/services/evalBiz'
import { message } from '@/ui/discrete'

const loading = ref(false)
const rows = ref([])
const showEdit = ref(false)
const showCreate = ref(false)
const form = ref(null)
const createForm = ref({ name: '', code: '', startCond: '', endCond: '', stepsText: '步骤1\n步骤2' })

const columns = [
  { title: 'ID', key: 'id', width: 120 },
  { title: '名称', key: 'name', width: 120 },
  { title: '编码', key: 'code', width: 100 },
  { title: '开始条件', key: 'startCond', ellipsis: { tooltip: true } },
  { title: '结束条件', key: 'endCond', ellipsis: { tooltip: true } },
  {
    title: '步骤数',
    key: 'steps',
    width: 80,
    render: (r) => (r.steps || []).length,
  },
  {
    title: '操作',
    key: 'act',
    width: 80,
    render(row) {
      return h(
        NButton,
        { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openEdit(row) },
        { default: () => '编辑' },
      )
    },
  },
]

async function load() {
  loading.value = true
  try {
    rows.value = (await listTemplates()).items
  } catch (e) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

function openEdit(row) {
  form.value = {
    ...row,
    stepsText: (row.steps || []).join('\n'),
  }
  showEdit.value = true
}

async function saveEdit() {
  const f = form.value
  try {
    await updateTemplate(f.id, {
      name: f.name,
      code: f.code,
      startCond: f.startCond,
      endCond: f.endCond,
      steps: f.stepsText.split('\n').map((x) => x.trim()).filter(Boolean),
    })
    message.success('模板已保存')
    showEdit.value = false
    await load()
  } catch (e) {
    message.error(e.message)
  }
}

async function onCreate() {
  if (!createForm.value.name.trim()) {
    message.warning('请填写名称')
    return
  }
  try {
    await createTemplate({
      ...createForm.value,
      steps: createForm.value.stepsText.split('\n').map((x) => x.trim()).filter(Boolean),
    })
    message.success('已创建模板')
    showCreate.value = false
    createForm.value = { name: '', code: '', startCond: '', endCond: '', stepsText: '步骤1\n步骤2' }
    await load()
  } catch (e) {
    message.error(e.message)
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>动作模板库</h2>
        <p>标准化动作原子 · 可新建/编辑（内存假数据）</p>
      </div>
      <n-space>
        <n-button :loading="loading" @click="load">刷新</n-button>
        <n-button type="primary" @click="showCreate = true">新建模板</n-button>
      </n-space>
    </div>

    <div class="tpl-grid">
      <n-card
        v-for="r in rows"
        :key="r.id"
        :bordered="false"
        class="tpl"
        hoverable
        @click="openEdit(r)"
      >
        <div class="tpl-head">
          <strong>{{ r.name }}</strong>
          <n-tag size="small" type="success" :bordered="false">{{ r.code }}</n-tag>
        </div>
        <p class="cond">起：{{ r.startCond }}</p>
        <p class="cond">止：{{ r.endCond }}</p>
        <n-space size="small" class="steps">
          <n-tag v-for="(st, i) in (r.steps || []).slice(0, 4)" :key="i" size="tiny" :bordered="false">{{ st }}</n-tag>
          <n-tag v-if="(r.steps || []).length > 4" size="tiny" :bordered="false">+{{ r.steps.length - 4 }}</n-tag>
        </n-space>
      </n-card>
    </div>

    <n-card title="表格视图" :bordered="false" class="mt">
      <n-data-table size="small" :data="rows" :columns="columns" :loading="loading" />
    </n-card>

    <n-drawer v-model:show="showEdit" :width="440">
      <n-drawer-content title="编辑动作模板" closable>
        <n-form v-if="form" label-placement="top">
          <n-form-item label="名称"><n-input v-model:value="form.name" /></n-form-item>
          <n-form-item label="编码"><n-input v-model:value="form.code" /></n-form-item>
          <n-form-item label="开始条件"><n-input v-model:value="form.startCond" /></n-form-item>
          <n-form-item label="结束条件"><n-input v-model:value="form.endCond" /></n-form-item>
          <n-form-item label="步骤（每行）">
            <n-input v-model:value="form.stepsText" type="textarea" :rows="5" />
          </n-form-item>
          <h4>步骤时间线</h4>
          <n-timeline>
            <n-timeline-item
              v-for="(st, i) in (form.stepsText || '').split('\n').filter((x) => x.trim())"
              :key="i"
              type="success"
              :content="st.trim()"
            />
          </n-timeline>
          <n-button type="primary" @click="saveEdit">保存</n-button>
        </n-form>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="showCreate" preset="card" title="新建动作模板" style="width: 460px">
      <n-form label-placement="top">
        <n-form-item label="名称" required><n-input v-model:value="createForm.name" /></n-form-item>
        <n-form-item label="编码"><n-input v-model:value="createForm.code" placeholder="如 CUSTOM" /></n-form-item>
        <n-form-item label="开始条件"><n-input v-model:value="createForm.startCond" /></n-form-item>
        <n-form-item label="结束条件"><n-input v-model:value="createForm.endCond" /></n-form-item>
        <n-form-item label="步骤"><n-input v-model:value="createForm.stepsText" type="textarea" :rows="4" /></n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreate = false">取消</n-button>
          <n-button type="primary" @click="onCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.page { max-width: 1100px; }
.head { display: flex; justify-content: space-between; margin-bottom: 12px; }
h2 { margin: 0 0 6px; font-size: 20px; }
h4 { margin: 8px 0; font-size: 13px; color: #c8c8d0; }
p { margin: 0; color: #9a9aab; }
.mt { margin-top: 12px; }
.tpl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tpl { cursor: pointer; }
.tpl-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.cond { font-size: 12px; color: #8b8b9a; margin-bottom: 4px; line-height: 1.4; }
.steps { margin-top: 8px; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 900px) { .tpl-grid { grid-template-columns: 1fr; } }
</style>
