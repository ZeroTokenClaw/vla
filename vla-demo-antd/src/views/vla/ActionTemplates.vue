<script setup>
import { computed, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { ACTION_TEMPLATES } from '@/mock/vla'

const rows = ref(
  ACTION_TEMPLATES.map((t, i) => ({
    ...t,
    category: ['reach', 'grasp', 'transport', 'place'][i % 4],
    description: `${t.name} 标准动作模板（演示）`,
    steps: t.steps || ['开始条件满足', '执行核心动作', '结束条件检测'],
    startCondition: t.startCond || t.startCondition || '目标可见且距离 < 0.4m',
    endCondition: t.endCond || t.endCondition || '末端稳定 200ms',
    keyNodes: t.keyNodes || ['approach', 'contact', 'release'].slice(0, 1 + (i % 3)),
    avgDurationFrames: 18 + (i % 7) * 4,
    usedByTasks: 2 + (i % 5),
    version: `tpl-v1.${i}`,
  })),
)

const open = ref(false)
const detail = ref(null)
const filterCat = ref(undefined)
const form = reactive({
  name: '',
  code: '',
  category: 'grasp',
  description: '',
  startCondition: '',
  endCondition: '',
})

const filtered = computed(() => {
  if (!filterCat.value) return rows.value
  return rows.value.filter((r) => r.category === filterCat.value)
})

function onCreate() {
  if (!form.name.trim()) return notification.warning({ message: '请填写动作名称', placement: 'topRight' })
  const row = {
    id: `tpl-custom-${Date.now()}`,
    name: form.name,
    code: form.code || form.name.toUpperCase(),
    category: form.category,
    description: form.description || `${form.name} 自定义模板`,
    steps: ['开始', '执行', '结束'],
    startCondition: form.startCondition || '—',
    endCondition: form.endCondition || '—',
    keyNodes: ['custom'],
    avgDurationFrames: 20,
    usedByTasks: 0,
    version: 'tpl-v1.custom',
  }
  rows.value.unshift(row)
  open.value = false
  form.name = ''
  notification.success({ message: '模板已加入本地列表', placement: 'topRight' })
}

function saveDetail() {
  if (!detail.value) return
  const idx = rows.value.findIndex((r) => r.id === detail.value.id)
  if (idx >= 0) rows.value[idx] = { ...detail.value }
  notification.success({ message: '模板已保存到本地列表（演示）', placement: 'topRight' })
}

const cols = [
  { title: '名称', dataIndex: 'name', width: 120 },
  { title: '编码', dataIndex: 'code', width: 100 },
  { title: '类别', dataIndex: 'category', width: 100 },
  { title: '版本', dataIndex: 'version', width: 110 },
  { title: '均时长帧', dataIndex: 'avgDurationFrames', width: 90 },
  { title: '引用任务', dataIndex: 'usedByTasks', width: 90 },
  { title: '关键节点', key: 'keyNodes', width: 200 },
  { title: '操作', key: 'op', width: 80 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="动作模板库：含起止条件、步骤、关键节点与引用统计（本地伪造列表，可新建）。"
    />
    <a-space style="margin-bottom: 12px" wrap>
      <a-button type="primary" @click="open = true">创建动作模板</a-button>
      <a-select
        v-model:value="filterCat"
        allow-clear
        placeholder="按类别筛选"
        style="width: 160px"
        :options="['reach', 'grasp', 'transport', 'place'].map((v) => ({ value: v, label: v }))"
      />
      <a-tag>{{ filtered.length }} 条模板</a-tag>
    </a-space>
    <a-table :columns="cols" :data-source="filtered" row-key="id" :pagination="false" size="small">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'keyNodes'">
          <a-tag v-for="k in record.keyNodes" :key="k" color="cyan">{{ k }}</a-tag>
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="detail = record">详情</a-button>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="open" title="动作模板" @ok="onCreate">
      <a-form layout="vertical">
        <a-form-item label="动作名称"><a-input v-model:value="form.name" /></a-form-item>
        <a-form-item label="编码"><a-input v-model:value="form.code" /></a-form-item>
        <a-form-item label="类别"><a-input v-model:value="form.category" /></a-form-item>
        <a-form-item label="描述"><a-textarea v-model:value="form.description" /></a-form-item>
        <a-form-item label="开始条件"><a-input v-model:value="form.startCondition" /></a-form-item>
        <a-form-item label="结束条件"><a-input v-model:value="form.endCondition" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer :open="!!detail" width="440" :title="detail?.name || '模板详情'" @close="detail = null">
      <template v-if="detail">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="编码">{{ detail.code }}</a-descriptions-item>
          <a-descriptions-item label="类别">{{ detail.category }}</a-descriptions-item>
          <a-descriptions-item label="版本">{{ detail.version }}</a-descriptions-item>
          <a-descriptions-item label="描述">{{ detail.description }}</a-descriptions-item>
          <a-descriptions-item label="开始条件">{{ detail.startCondition }}</a-descriptions-item>
          <a-descriptions-item label="结束条件">{{ detail.endCondition }}</a-descriptions-item>
          <a-descriptions-item label="均时长">{{ detail.avgDurationFrames }} 帧</a-descriptions-item>
          <a-descriptions-item label="引用任务">{{ detail.usedByTasks }}</a-descriptions-item>
        </a-descriptions>
        <h4 style="margin: 14px 0 8px">步骤</h4>
        <a-steps direction="vertical" size="small" :current="(detail.steps || []).length">
          <a-step v-for="(s, i) in detail.steps || []" :key="i" :title="s" />
        </a-steps>
        <h4 style="margin: 14px 0 8px">关键节点</h4>
        <a-tag v-for="k in detail.keyNodes || []" :key="k" color="orange">{{ k }}</a-tag>
        <a-divider />
        <a-form layout="vertical" size="small">
          <a-form-item label="描述"><a-textarea v-model:value="detail.description" :rows="2" /></a-form-item>
          <a-form-item label="开始条件"><a-input v-model:value="detail.startCondition" /></a-form-item>
          <a-form-item label="结束条件"><a-input v-model:value="detail.endCondition" /></a-form-item>
          <a-form-item label="均时长帧"><a-input-number v-model:value="detail.avgDurationFrames" :min="1" style="width: 100%" /></a-form-item>
        </a-form>
        <a-button type="primary" block @click="saveDetail">保存模板</a-button>
      </template>
    </a-drawer>
  </div>
</template>
