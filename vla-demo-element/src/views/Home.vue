<script setup>
import { useRouter } from 'vue-router'
import { copy } from '@/i18n/copy'

const router = useRouter()
const modulePath = {
  [copy.modules.qc]: '/qc',
  [copy.modules.prelabel]: '/prelabel',
  [copy.modules.vla]: '/vla',
  [copy.modules.train]: '/train',
}
function openTicket(row) {
  router.push(modulePath[row.module] || '/')
}

const tickets = [
  {
    id: 'DL-QC-20261104-001',
    title: '语音切片抽检返修',
    module: copy.modules.qc,
    priority: '高',
    status: '待处理',
    assignee: copy.roles.annotator,
  },
  {
    id: 'DL-PRE-20261104-014',
    title: 'OCR 预标注人工确认',
    module: copy.modules.prelabel,
    priority: '中',
    status: '进行中',
    assignee: copy.roles.reviewer,
  },
  {
    id: 'DL-VLA-20261104-008',
    title: '具身采集关键帧标注',
    module: copy.modules.vla,
    priority: '高',
    status: '待审核',
    assignee: copy.roles.admin,
  },
]
</script>

<template>
  <div class="home">
    <div class="home-head">
      <div>
        <h2>{{ copy.home.title }}</h2>
        <p class="sub">{{ copy.home.subtitle }}</p>
      </div>
      <el-button type="primary">新建工单</el-button>
    </div>
    <el-card shadow="never">
      <el-empty v-if="!tickets.length" description="暂无待办工单" />
      <el-table v-else :data="tickets" stripe style="width: 100%">
        <el-table-column prop="id" label="工单号" min-width="180" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="module" label="所属模块" width="140" />
        <el-table-column prop="priority" label="优先级" width="90">
          <template #default="{ row }">
            <el-tag :type="row.priority === '高' ? 'danger' : 'warning'" size="small">
              {{ row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column prop="assignee" label="处理人" width="100" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openTicket(row)">打开</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.home-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}
h2 {
  margin: 0;
  font-size: 20px;
  color: #111827;
}
.sub {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}
</style>
