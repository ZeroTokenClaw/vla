<script setup>
import { onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { listScenes, listPlans, createScene, updateScene, updatePlan } from '@/services/factory'

const scenes = ref([])
const plans = ref([])
const loading = ref(false)
const open = ref(false)
const detail = ref(null)
const planDetail = ref(null)
const form = reactive({
  name: '',
  category: '仓储',
  description: '',
  environment: '',
  space: '',
  tags: [],
})

async function load() {
  loading.value = true
  try {
    scenes.value = (await listScenes()).map((s, i) => ({
      ...s,
      cameraRig: s.cameraRig || ['wrist_rgb', 'overhead_rgb', 'side_depth'][i % 3] + (i % 2 ? '+imu' : ''),
      lighting: s.lighting || ['自然光', '补光条', '混合'][i % 3],
      hazards: s.hazards || ['反光', '遮挡', '动态行人'].slice(0, 1 + (i % 3)),
      checklist: s.checklist || ['标定外参', '同步时间戳', '空白跑通', '安全围栏确认'],
    }))
    plans.value = (await listPlans()).map((p, i) => ({
      ...p,
      successCriteria: p.successCriteria || ['关键节点完整', '指令对齐 ≥0.7', '无空隙 >5 帧'],
      riskNotes: p.riskNotes || ['末端虚焦', '料箱反光', '遮挡复位'][i % 3],
      dataTypes: p.dataTypes || ['rgb', 'depth', 'joint_state', 'instruction'],
    }))
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function onCreate() {
  if (!form.name.trim()) return notification.warning({ message: '请填写场景名称', placement: 'topRight' })
  await createScene({ ...form })
  open.value = false
  form.name = ''
  notification.success({ message: '场景已创建', placement: 'topRight' })
  await load()
}

async function saveScene() {
  if (!detail.value) return
  try {
    await updateScene(detail.value.id, {
      name: detail.value.name,
      category: detail.value.category,
      description: detail.value.description,
      environment: detail.value.environment,
      space: detail.value.space,
      cameraRig: detail.value.cameraRig,
      lighting: detail.value.lighting,
    })
    notification.success({ message: '场景已保存', placement: 'topRight' })
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  }
}

async function savePlan() {
  if (!planDetail.value) return
  try {
    await updatePlan(planDetail.value.id, {
      name: planDetail.value.name,
      goal: planDetail.value.goal,
      frequencyHz: Number(planDetail.value.frequencyHz) || 10,
      durationSec: Number(planDetail.value.durationSec) || 12,
      qualityReq: planDetail.value.qualityReq,
      riskNotes: planDetail.value.riskNotes,
    })
    notification.success({ message: '方案已保存', placement: 'topRight' })
    await load()
  } catch (e) {
    notification.error({ message: e.message, placement: 'topRight' })
  }
}
</script>

<template>
  <a-spin :spinning="loading">
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="场景方案库：场景卡片含相机/光照/风险；采集方案含成功准则与数据类型（演示假数据）。"
    />
    <a-space style="margin-bottom: 12px">
      <a-button type="primary" @click="open = true">新建场景</a-button>
    </a-space>
    <a-row :gutter="[12, 12]">
      <a-col :xs="24" :md="8" v-for="s in scenes" :key="s.id">
        <a-card hoverable @click="detail = s">
          <template #cover>
            <div class="cover" :style="{ backgroundImage: `url(${s.imageUrl})` }" />
          </template>
          <a-card-meta :title="s.name" :description="s.description" />
          <div class="meta">
            <a-tag>{{ s.category }}</a-tag>
            <a-tag v-for="t in s.tags" :key="t" color="blue">{{ t }}</a-tag>
          </div>
          <p class="line">环境：{{ s.environment }}</p>
          <p class="line">空间：{{ s.space }}</p>
          <p class="line">相机：{{ s.cameraRig }}</p>
        </a-card>
      </a-col>
    </a-row>

    <a-divider>采集方案</a-divider>
    <a-table
      :data-source="plans"
      row-key="id"
      :pagination="false"
      size="small"
      :custom-row="(record) => ({ onClick: () => (planDetail = record), style: { cursor: 'pointer' } })"
      :columns="[
        { title: '方案', dataIndex: 'name' },
        { title: '目标', dataIndex: 'goal' },
        { title: '频率(Hz)', dataIndex: 'frequencyHz', width: 100 },
        { title: '时长(s)', dataIndex: 'durationSec', width: 90 },
        { title: '步骤', key: 'steps' },
        { title: '质量要求', dataIndex: 'qualityReq', ellipsis: true },
      ]"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'steps'">
          <a-tag v-for="s in record.steps" :key="s">{{ s }}</a-tag>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="open" title="新建场景" @ok="onCreate">
      <a-form layout="vertical">
        <a-form-item label="场景名称"><a-input v-model:value="form.name" /></a-form-item>
        <a-form-item label="分类"><a-input v-model:value="form.category" /></a-form-item>
        <a-form-item label="描述"><a-textarea v-model:value="form.description" /></a-form-item>
        <a-form-item label="环境信息"><a-input v-model:value="form.environment" /></a-form-item>
        <a-form-item label="空间信息"><a-input v-model:value="form.space" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer :open="!!detail" width="440" :title="detail?.name || '场景详情'" @close="detail = null">
      <template v-if="detail">
        <a-form layout="vertical" size="small">
          <a-form-item label="ID"><a-input :value="detail.id" disabled /></a-form-item>
          <a-form-item label="名称"><a-input v-model:value="detail.name" /></a-form-item>
          <a-form-item label="分类"><a-input v-model:value="detail.category" /></a-form-item>
          <a-form-item label="环境"><a-input v-model:value="detail.environment" /></a-form-item>
          <a-form-item label="空间"><a-input v-model:value="detail.space" /></a-form-item>
          <a-form-item label="相机 Rig"><a-input v-model:value="detail.cameraRig" /></a-form-item>
          <a-form-item label="光照"><a-input v-model:value="detail.lighting" /></a-form-item>
          <a-form-item label="描述"><a-textarea v-model:value="detail.description" :rows="2" /></a-form-item>
        </a-form>
        <div style="margin-bottom: 8px">风险</div>
        <a-tag v-for="h in detail.hazards" :key="h" color="orange">{{ h }}</a-tag>
        <h4 style="margin: 14px 0 8px">上场 Checklist</h4>
        <a-checkbox-group :options="detail.checklist" :value="detail.checklist" style="display: flex; flex-direction: column; gap: 8px" />
        <a-button type="primary" block style="margin-top: 16px" @click="saveScene">保存场景</a-button>
      </template>
    </a-drawer>

    <a-drawer :open="!!planDetail" width="460" :title="planDetail?.name || '方案详情'" @close="planDetail = null">
      <template v-if="planDetail">
        <a-form layout="vertical" size="small">
          <a-form-item label="名称"><a-input v-model:value="planDetail.name" /></a-form-item>
          <a-form-item label="目标"><a-input v-model:value="planDetail.goal" /></a-form-item>
          <a-form-item label="频率 Hz"><a-input-number v-model:value="planDetail.frequencyHz" :min="1" style="width: 100%" /></a-form-item>
          <a-form-item label="时长 s"><a-input-number v-model:value="planDetail.durationSec" :min="1" style="width: 100%" /></a-form-item>
          <a-form-item label="质量要求"><a-textarea v-model:value="planDetail.qualityReq" :rows="2" /></a-form-item>
          <a-form-item label="风险备注"><a-input v-model:value="planDetail.riskNotes" /></a-form-item>
        </a-form>
        <a-descriptions-item label="数据类型" style="display: block; margin-bottom: 8px">
          <a-tag v-for="d in planDetail.dataTypes" :key="d" color="blue">{{ d }}</a-tag>
        </a-descriptions-item>
        <h4 style="margin: 14px 0 8px">步骤</h4>
        <a-steps direction="vertical" size="small" :current="(planDetail.steps || []).length">
          <a-step v-for="(s, i) in planDetail.steps || []" :key="i" :title="s" />
        </a-steps>
        <h4 style="margin: 14px 0 8px">成功准则</h4>
        <ul>
          <li v-for="c in planDetail.successCriteria || []" :key="c">{{ c }}</li>
        </ul>
        <a-button type="primary" block style="margin-top: 16px" @click="savePlan">保存方案</a-button>
      </template>
    </a-drawer>
  </a-spin>
</template>

<style scoped>
.cover {
  height: 120px;
  background-size: cover;
  background-position: center;
  background-color: #e2e8f0;
}
.meta { margin-top: 10px; }
.line { margin: 6px 0 0; color: #64748b; font-size: 12px; }
</style>
