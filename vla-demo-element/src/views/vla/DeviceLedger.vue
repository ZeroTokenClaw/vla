<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
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
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function statusType(s) {
  return { online: 'success', busy: 'warning', offline: 'info' }[s] || 'info'
}
</script>

<template>
  <div v-loading="loading">
    <el-alert
      class="tip"
      type="info"
      :closable="false"
      show-icon
      title="采集设备台账（演示伪造）：展示相机/机械臂/麦克风/工控机状态与任务绑定，创建采集任务时可关联设备。"
    />

    <el-row v-if="stats" :gutter="12" class="stats">
      <el-col :span="6"><el-statistic title="设备总数" :value="stats.deviceTotal" /></el-col>
      <el-col :span="6"><el-statistic title="在线" :value="stats.deviceOnline" /></el-col>
      <el-col :span="6"><el-statistic title="采集任务数" :value="stats.taskTotal" /></el-col>
      <el-col :span="6">
        <el-statistic title="采集进度" :value="stats.progressPct" suffix="%" />
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div class="hd">
          <span>设备列表</span>
          <div class="filters">
            <el-select v-model="filters.status" clearable placeholder="状态" style="width: 120px" @change="load">
              <el-option label="online" value="online" />
              <el-option label="busy" value="busy" />
              <el-option label="offline" value="offline" />
            </el-select>
            <el-select v-model="filters.type" clearable placeholder="类型" style="width: 140px" @change="load">
              <el-option label="RGB 相机" value="rgb_camera" />
              <el-option label="手腕相机" value="wrist_camera" />
              <el-option label="深度相机" value="depth_camera" />
              <el-option label="机械臂" value="manipulator" />
              <el-option label="麦克风" value="microphone" />
              <el-option label="工控机" value="edge_pc" />
            </el-select>
            <el-input
              v-model="filters.keyword"
              clearable
              placeholder="编号/名称/SN"
              style="width: 180px"
              @keyup.enter="load"
            />
            <el-button @click="load">查询</el-button>
          </div>
        </div>
      </template>

      <el-table :data="devices" stripe>
        <el-table-column prop="id" label="设备号" width="150" />
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="typeLabel" label="类型" width="110" />
        <el-table-column prop="location" label="位置" width="120" />
        <el-table-column prop="sn" label="SN" width="140" />
        <el-table-column label="规格" width="130">
          <template #default="{ row }">
            <span v-if="row.resolution">{{ row.resolution }} @{{ row.fps }}fps</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastHeartbeat" label="最近心跳" width="170" />
        <el-table-column label="绑定任务" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="tid in row.boundTaskIds" :key="tid" size="small" class="tag" effect="plain">
              {{ tid }}
            </el-tag>
            <span v-if="!row.boundTaskIds?.length">—</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="20"
          @current-change="load"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 12px;
}
.stats {
  margin-bottom: 12px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.tag {
  margin-right: 4px;
  margin-bottom: 2px;
}
.pager {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
