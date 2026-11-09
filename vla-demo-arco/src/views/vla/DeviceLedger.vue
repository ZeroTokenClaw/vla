<script setup>
import { onMounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { listDevices, getCollectStats } from '@/services/vla'

const loading = ref(false)
const devices = ref([])
const total = ref(0)
const page = ref(1)
const stats = ref(null)
const filters = reactive({ status: '', type: '', keyword: '' })

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
    Message.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <a-alert type="info" banner style="margin-bottom: 12px">
      采集设备台账（演示伪造）：相机/机械臂/麦克风/工控机状态与任务绑定。
    </a-alert>
    <a-row v-if="stats" :gutter="12" style="margin-bottom: 12px">
      <a-col :span="6"><a-statistic title="设备总数" :value="stats.deviceTotal" /></a-col>
      <a-col :span="6"><a-statistic title="在线" :value="stats.deviceOnline" /></a-col>
      <a-col :span="6"><a-statistic title="采集任务" :value="stats.taskTotal" /></a-col>
      <a-col :span="6"><a-statistic title="采集进度" :value="stats.progressPct" suffix="%" /></a-col>
    </a-row>
    <a-card title="设备列表" :bordered="false">
      <a-space style="margin-bottom: 12px">
        <a-select v-model="filters.status" allow-clear placeholder="状态" style="width: 120px" @change="load">
          <a-option value="online">online</a-option>
          <a-option value="busy">busy</a-option>
          <a-option value="offline">offline</a-option>
        </a-select>
        <a-input v-model="filters.keyword" allow-clear placeholder="编号/名称/SN" style="width: 180px" @press-enter="load" />
        <a-button @click="load">查询</a-button>
      </a-space>
      <a-table :data="devices" :loading="loading" :pagination="{ total, current: page, pageSize: 20 }" row-key="id" @page-change="(p) => { page = p; load() }">
        <a-table-column title="设备号" data-index="id" :width="150" />
        <a-table-column title="名称" data-index="name" />
        <a-table-column title="类型" data-index="typeLabel" :width="110" />
        <a-table-column title="位置" data-index="location" :width="120" />
        <a-table-column title="状态" :width="100">
          <template #cell="{ record }">
            <a-tag :color="record.status === 'online' ? 'green' : record.status === 'busy' ? 'orangered' : 'gray'">
              {{ record.status }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="心跳" data-index="lastHeartbeat" :width="170" />
        <a-table-column title="绑定任务">
          <template #cell="{ record }">
            <a-tag v-for="tid in record.boundTaskIds" :key="tid" size="small" style="margin-right: 4px">{{ tid }}</a-tag>
            <span v-if="!record.boundTaskIds?.length">—</span>
          </template>
        </a-table-column>
      </a-table>
    </a-card>
  </div>
</template>
