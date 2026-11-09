<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listDevices } from '@/services/factory'
import { listVlaTasks } from '@/services/vla'

const router = useRouter()
const loading = ref(false)
const rows = ref([])
const filters = reactive({ status: undefined, type: undefined, keyword: '' })
const detail = ref(null)
const vlaCount = ref(0)

const filtered = computed(() => {
  let list = rows.value
  if (filters.status) list = list.filter((r) => r.status === filters.status)
  if (filters.type) list = list.filter((r) => r.type === filters.type)
  if (filters.keyword) {
    const k = filters.keyword.toLowerCase()
    list = list.filter((r) => `${r.id}${r.name}${r.sn || ''}`.toLowerCase().includes(k))
  }
  return list
})

const stats = computed(() => ({
  total: rows.value.length,
  online: rows.value.filter((r) => r.status === 'online').length,
  busy: rows.value.filter((r) => r.status === 'busy').length,
  offline: rows.value.filter((r) => r.status === 'offline' || r.status === 'idle').length,
  vlaTasks: vlaCount.value,
}))

onMounted(async () => {
  loading.value = true
  try {
    rows.value = await listDevices()
    vlaCount.value = (await listVlaTasks({ page: 1, pageSize: 1 })).total || 0
  } finally {
    loading.value = false
  }
})

const cols = [
  { title: '设备编号', dataIndex: 'id', width: 120 },
  { title: '名称', dataIndex: 'name' },
  { title: '类型', dataIndex: 'typeLabel', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '位置', dataIndex: 'location', width: 120 },
  { title: 'SN', dataIndex: 'sn', width: 130 },
  { title: '分辨率/FPS', key: 'res', width: 140 },
  { title: '绑定任务', key: 'bound', ellipsis: true },
  { title: '心跳', dataIndex: 'lastHeartbeat', width: 160 },
  { title: '操作', key: 'op', width: 80 },
]
</script>

<template>
  <div>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      message="采集设备台账：相机 / 机械臂 / 麦克风 / 工控机状态与任务绑定（伪造）。创建采集时可关联。"
    />
    <a-row :gutter="12" style="margin-bottom: 12px">
      <a-col :span="5"><a-statistic title="设备总数" :value="stats.total" /></a-col>
      <a-col :span="5"><a-statistic title="在线" :value="stats.online" /></a-col>
      <a-col :span="5"><a-statistic title="忙碌" :value="stats.busy" /></a-col>
      <a-col :span="5"><a-statistic title="空闲/离线" :value="stats.offline" /></a-col>
      <a-col :span="4"><a-statistic title="采集任务" :value="stats.vlaTasks" /></a-col>
    </a-row>
    <a-space style="margin-bottom: 12px" wrap>
      <a-select
        v-model:value="filters.status"
        allow-clear
        placeholder="状态"
        style="width: 120px"
        :options="['online', 'busy', 'idle', 'offline'].map((v) => ({ value: v, label: v }))"
      />
      <a-select
        v-model:value="filters.type"
        allow-clear
        placeholder="类型"
        style="width: 150px"
        :options="[
          { value: 'rgb_camera', label: 'RGB 相机' },
          { value: 'wrist_camera', label: '手腕相机' },
          { value: 'depth_camera', label: '深度相机' },
          { value: 'manipulator', label: '机械臂' },
          { value: 'microphone', label: '麦克风' },
          { value: 'edge_pc', label: '工控机' },
        ]"
      />
      <a-input v-model:value="filters.keyword" allow-clear placeholder="名称 / SN / ID" style="width: 200px" />
      <a-button @click="router.push('/vla/collect')">去采集配置</a-button>
    </a-space>
    <a-table :loading="loading" :columns="cols" :data-source="filtered" row-key="id" size="small" :pagination="{ pageSize: 10 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 'online' ? 'success' : record.status === 'busy' ? 'warning' : 'default'">
            {{ record.status }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'res'">
          {{ record.resolution ? `${record.resolution} · ${record.fps || '—'}fps` : '—' }}
        </template>
        <template v-else-if="column.key === 'bound'">
          {{ (record.boundTaskIds || []).join(', ') || '—' }}
        </template>
        <template v-else-if="column.key === 'op'">
          <a-button type="link" size="small" @click="detail = record">详情</a-button>
        </template>
      </template>
    </a-table>

    <a-drawer :open="!!detail" width="440" :title="detail?.name || '设备详情'" @close="detail = null">
      <template v-if="detail">
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="ID">{{ detail.id }}</a-descriptions-item>
          <a-descriptions-item label="类型">{{ detail.typeLabel || detail.type }}</a-descriptions-item>
          <a-descriptions-item label="机器人">{{ detail.robot }}</a-descriptions-item>
          <a-descriptions-item label="位置">{{ detail.location }}</a-descriptions-item>
          <a-descriptions-item label="SN">{{ detail.sn }}</a-descriptions-item>
          <a-descriptions-item label="固件">{{ detail.firmware || '—' }}</a-descriptions-item>
          <a-descriptions-item label="分辨率">{{ detail.resolution || '—' }}</a-descriptions-item>
          <a-descriptions-item label="FPS">{{ detail.fps ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="关联任务数">{{ detail.tasks }}</a-descriptions-item>
          <a-descriptions-item label="心跳">{{ detail.lastHeartbeat }}</a-descriptions-item>
          <a-descriptions-item label="绑定任务">
            <a-tag v-for="t in detail.boundTaskIds || []" :key="t" color="blue" style="margin-bottom: 4px">{{ t }}</a-tag>
            <span v-if="!(detail.boundTaskIds || []).length">—</span>
          </a-descriptions-item>
        </a-descriptions>
        <a-button type="primary" style="margin-top: 16px" @click="router.push('/vla/collect')">关联到采集任务</a-button>
      </template>
    </a-drawer>
  </div>
</template>
