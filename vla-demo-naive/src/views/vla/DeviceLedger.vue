<script setup>
import { h, onMounted, reactive, ref } from 'vue'
import { NTag } from 'naive-ui'
import { listDevices, getCollectStats } from '@/services/vla'
import { message } from '@/ui/discrete'

const loading = ref(false)
const devices = ref([])
const total = ref(0)
const page = ref(1)
const stats = ref(null)
const filters = reactive({ status: '', type: '', keyword: '' })

function onPage(p) {
  page.value = p
  load()
}

async function load() {
  loading.value = true
  try {
    const [list, st] = await Promise.all([
      listDevices({
        page: page.value,
        pageSize: 20,
        status: filters.status || undefined,
        type: filters.type || undefined,
        keyword: filters.keyword || undefined,
      }),
      getCollectStats(),
    ])
    devices.value = list.items
    total.value = list.total
    stats.value = st
  } catch (e) {
    message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const columns = [
  { title: 'ID', key: 'id', width: 140 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '类型', key: 'typeLabel', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (r) =>
      h(
        NTag,
        {
          size: 'small',
          bordered: false,
          type: r.status === 'online' ? 'success' : r.status === 'busy' ? 'warning' : 'default',
        },
        { default: () => r.status },
      ),
  },
  { title: '位置', key: 'location', width: 120 },
  { title: 'SN', key: 'sn', width: 130 },
  {
    title: '分辨率/FPS',
    key: 'res',
    width: 130,
    render: (r) => (r.resolution ? `${r.resolution} · ${r.fps || '—'}fps` : '—'),
  },
  {
    title: '绑定任务',
    key: 'bound',
    render: (r) => (r.boundTaskIds?.length ? r.boundTaskIds.join(', ') : '—'),
  },
  { title: '心跳', key: 'lastHeartbeat', width: 160 },
]
</script>

<template>
  <div class="page">
    <n-alert type="info" :bordered="false" class="mb">
      采集设备台账（演示伪造）：相机 / 机械臂 / 麦克风 / 工控机状态与任务绑定，创建采集时可关联。
    </n-alert>

    <div v-if="stats" class="kpis mb">
      <n-card size="small" :bordered="false"><div class="k">设备总数</div><div class="v">{{ stats.deviceTotal }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">在线</div><div class="v">{{ stats.deviceOnline }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">采集任务</div><div class="v">{{ stats.taskTotal }}</div></n-card>
      <n-card size="small" :bordered="false"><div class="k">采集进度</div><div class="v">{{ stats.progressPct }}%</div></n-card>
    </div>

    <n-card title="设备列表" :bordered="false">
      <n-space class="mb">
        <n-select
          v-model:value="filters.status"
          clearable
          placeholder="状态"
          style="width: 120px"
          :options="[
            { label: 'online', value: 'online' },
            { label: 'busy', value: 'busy' },
            { label: 'offline', value: 'offline' },
          ]"
          @update:value="load"
        />
        <n-select
          v-model:value="filters.type"
          clearable
          placeholder="类型"
          style="width: 150px"
          :options="[
            { label: 'RGB 相机', value: 'rgb_camera' },
            { label: '手腕相机', value: 'wrist_camera' },
            { label: '深度相机', value: 'depth_camera' },
            { label: '机械臂', value: 'manipulator' },
            { label: '麦克风', value: 'microphone' },
            { label: '工控机', value: 'edge_pc' },
          ]"
          @update:value="load"
        />
        <n-input
          v-model:value="filters.keyword"
          clearable
          placeholder="名称 / SN / ID"
          style="width: 200px"
          @keyup.enter="load"
        />
        <n-button @click="load">查询</n-button>
      </n-space>
      <n-data-table
        size="small"
        :loading="loading"
        :data="devices"
        :columns="columns"
        :pagination="{
          page: page,
          pageSize: 20,
          itemCount: total,
          onUpdatePage: onPage,
        }"
      />
    </n-card>
  </div>
</template>

<style scoped>
.page { max-width: 1180px; }
.mb { margin-bottom: 12px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.k { color: #8b8b9a; font-size: 12px; }
.v { margin-top: 4px; font-size: 22px; color: #63e2b7; font-weight: 600; }
:deep(.n-card) { background: #14141c; }
</style>
