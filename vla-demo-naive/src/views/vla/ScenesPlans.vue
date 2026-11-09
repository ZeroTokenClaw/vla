<script setup>
import { h, onMounted, ref } from 'vue'
import { NButton } from 'naive-ui'
import { listScenes, listPlans, updateScene, updatePlan } from '@/services/evalBiz'
import { message } from '@/ui/discrete'

const loading = ref(false)
const scenes = ref([])
const plans = ref([])
const sceneDrawer = ref(false)
const planDrawer = ref(false)
const editingScene = ref(null)
const editingPlan = ref(null)

const planColumns = [
  { title: 'ID', key: 'id', width: 120 },
  { title: '名称', key: 'name' },
  { title: '帧率', key: 'frequencyHz', width: 70 },
  { title: '时长s', key: 'durationSec', width: 70 },
  { title: '步骤数', key: 'steps', width: 80, render: (r) => (r.steps || []).length },
  {
    title: '操作',
    key: 'act',
    width: 80,
    render(row) {
      return h(
        NButton,
        { size: 'tiny', quaternary: true, type: 'primary', onClick: () => openPlan(row) },
        { default: () => '编辑' },
      )
    },
  },
]

async function load() {
  loading.value = true
  try {
    const [s, p] = await Promise.all([listScenes(), listPlans()])
    scenes.value = s.items
    plans.value = p.items
  } catch (e) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

function openScene(s) {
  editingScene.value = {
    ...s,
    constraintsText: (s.constraints || []).join('\n'),
    tagsText: (s.tags || []).join(', '),
  }
  sceneDrawer.value = true
}

function openPlan(p) {
  editingPlan.value = {
    ...p,
    stepsText: (p.steps || []).join('\n'),
    dataTypesText: (p.dataTypes || []).join(', '),
  }
  planDrawer.value = true
}

async function saveScene() {
  const s = editingScene.value
  try {
    await updateScene(s.id, {
      name: s.name,
      category: s.category,
      constraints: s.constraintsText.split('\n').map((x) => x.trim()).filter(Boolean),
      tags: s.tagsText.split(/[,，]/).map((x) => x.trim()).filter(Boolean),
    })
    message.success('场景已保存')
    sceneDrawer.value = false
    await load()
  } catch (e) {
    message.error(e.message)
  }
}

async function savePlan() {
  const p = editingPlan.value
  try {
    await updatePlan(p.id, {
      name: p.name,
      frequencyHz: Number(p.frequencyHz) || 30,
      durationSec: Number(p.durationSec) || 10,
      qualityReq: p.qualityReq,
      steps: p.stepsText.split('\n').map((x) => x.trim()).filter(Boolean),
      dataTypes: p.dataTypesText.split(/[,，]/).map((x) => x.trim()).filter(Boolean),
    })
    message.success('方案已保存')
    planDrawer.value = false
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
        <h2>场景与采集方案</h2>
        <p>可编辑场景约束与方案步骤（演示可写假数据）</p>
      </div>
      <n-button :loading="loading" @click="load">刷新</n-button>
    </div>

    <h3>场景库</h3>
    <div class="cards">
      <n-card v-for="s in scenes" :key="s.id" :bordered="false" class="card" hoverable @click="openScene(s)">
        <img v-if="s.image" :src="s.image" class="cover" alt="" />
        <div class="title">{{ s.name }}</div>
        <div class="meta"><code>{{ s.code }}</code> · {{ s.category }}</div>
        <n-space size="small" class="tags">
          <n-tag v-for="t in s.tags" :key="t" size="tiny" :bordered="false">{{ t }}</n-tag>
        </n-space>
      </n-card>
    </div>

    <h3>采集方案</h3>
    <n-card :bordered="false">
      <n-data-table size="small" :data="plans" :columns="planColumns" />
    </n-card>

    <n-drawer v-model:show="sceneDrawer" :width="460">
      <n-drawer-content title="编辑场景" closable>
        <n-form v-if="editingScene" label-placement="top">
          <img v-if="editingScene.image" :src="editingScene.image" class="drawer-cover" alt="" />
          <n-descriptions size="small" :column="1" label-placement="left" bordered class="mb">
            <n-descriptions-item label="编码">{{ editingScene.code }}</n-descriptions-item>
            <n-descriptions-item label="关联方案">{{ (editingScene.planIds || []).join(', ') || '—' }}</n-descriptions-item>
          </n-descriptions>
          <n-form-item label="名称"><n-input v-model:value="editingScene.name" /></n-form-item>
          <n-form-item label="类别"><n-input v-model:value="editingScene.category" /></n-form-item>
          <n-form-item label="标签（逗号分隔）"><n-input v-model:value="editingScene.tagsText" /></n-form-item>
          <n-form-item label="约束（每行一条）">
            <n-input v-model:value="editingScene.constraintsText" type="textarea" :rows="5" />
          </n-form-item>
          <n-button type="primary" @click="saveScene">保存</n-button>
        </n-form>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="planDrawer" :width="460">
      <n-drawer-content title="编辑方案" closable>
        <n-form v-if="editingPlan" label-placement="top">
          <n-descriptions size="small" :column="1" label-placement="left" bordered class="mb">
            <n-descriptions-item label="编码">{{ editingPlan.code }}</n-descriptions-item>
          </n-descriptions>
          <n-form-item label="名称"><n-input v-model:value="editingPlan.name" /></n-form-item>
          <n-form-item label="帧率 Hz"><n-input-number v-model:value="editingPlan.frequencyHz" :min="1" /></n-form-item>
          <n-form-item label="时长秒"><n-input-number v-model:value="editingPlan.durationSec" :min="1" /></n-form-item>
          <n-form-item label="数据类型"><n-input v-model:value="editingPlan.dataTypesText" /></n-form-item>
          <n-form-item label="步骤（每行）">
            <n-input v-model:value="editingPlan.stepsText" type="textarea" :rows="5" />
          </n-form-item>
          <h4>步骤预览</h4>
          <n-timeline>
            <n-timeline-item
              v-for="(st, i) in (editingPlan.stepsText || '').split('\n').filter((x) => x.trim())"
              :key="i"
              type="info"
              :content="`${i + 1}. ${st.trim()}`"
            />
          </n-timeline>
          <n-form-item label="质量要求">
            <n-input v-model:value="editingPlan.qualityReq" type="textarea" :rows="2" />
          </n-form-item>
          <n-button type="primary" @click="savePlan">保存</n-button>
        </n-form>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.page { max-width: 1100px; }
.head { display: flex; justify-content: space-between; margin-bottom: 12px; }
h2 { margin: 0 0 6px; font-size: 20px; }
h3 { margin: 16px 0 10px; font-size: 15px; color: #c8c8d0; }
p { margin: 0; color: #9a9aab; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; }
.card { cursor: pointer; }
.cover { width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-bottom: 8px; }
.title { font-weight: 600; }
.meta { color: #8b8b9a; font-size: 12px; margin: 4px 0; }
.tags { margin-top: 6px; }
.drawer-cover { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
.mb { margin-bottom: 12px; }
h4 { margin: 8px 0; font-size: 13px; color: #c8c8d0; }
:deep(.n-card) { background: #14141c; }
@media (max-width: 1000px) { .cards { grid-template-columns: 1fr 1fr; } }
</style>
