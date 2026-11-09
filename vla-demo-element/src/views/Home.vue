<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { copy } from '@/i18n/copy'
import { getDashboardStats } from '@/services/analytics'

const router = useRouter()
const loading = ref(false)
const stats = ref(null)

async function load() {
  loading.value = true
  try {
    stats.value = await getDashboardStats()
  } catch (e) {
    ElMessage.error(e.message || '加载驾驶舱失败')
  } finally {
    loading.value = false
  }
}

function openTodo(row) {
  router.push(row.path || '/')
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="home">
    <div class="home-head">
      <div>
        <h2>{{ copy.home.title }}</h2>
        <p class="sub">
          {{ copy.home.subtitle }}
          <span v-if="stats" class="gen">· 数据刷新于 {{ stats.generatedAt }}（演示聚合）</span>
        </p>
      </div>
      <div class="ops">
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" @click="router.push('/qc')">进入质控中心</el-button>
      </div>
    </div>

    <el-row v-if="stats" :gutter="12" class="kpi-row">
      <el-col v-for="k in stats.kpis" :key="k.key" :xs="12" :sm="8" :md="6" :lg="4">
        <el-card shadow="never" class="kpi-card">
          <el-statistic :title="k.label" :value="k.value" :suffix="k.unit || ''" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="hd">
              <span>待办工单 / 任务</span>
              <el-tag size="small" type="warning" effect="plain">可点击跳转</el-tag>
            </div>
          </template>
          <el-empty v-if="!stats?.todos?.length" description="暂无待办工单" />
          <el-table v-else :data="stats.todos" stripe>
            <el-table-column prop="id" label="编号" min-width="160" />
            <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="module" label="模块" width="110" />
            <el-table-column prop="priority" label="优先级" width="90">
              <template #default="{ row }">
                <el-tag :type="row.priority === '高' ? 'danger' : 'warning'" size="small">
                  {{ row.priority }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="110" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button link type="primary" @click="openTodo(row)">打开</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="quick">
          <template #header>快捷入口</template>
          <el-button class="qbtn" @click="router.push('/qc/annotate')">多模态标注工作台</el-button>
          <el-button class="qbtn" @click="router.push('/qc/sample-check')">抽检回流</el-button>
          <el-button class="qbtn" @click="router.push('/prelabel/jobs')">预标任务队列</el-button>
          <el-button class="qbtn" @click="router.push('/vla/timeline')">VLA 时间轴标注</el-button>
          <el-button class="qbtn" @click="router.push('/vla/devices')">采集设备台账</el-button>
          <el-button class="qbtn" @click="router.push('/train/gpus')">GPU 算力监控</el-button>
          <el-button class="qbtn" @click="router.push('/train/metrics')">训练指标报表</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.home-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}
h2 {
  margin: 0;
  font-size: 20px;
}
.sub {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}
.gen {
  color: #9ca3af;
}
.ops {
  display: flex;
  gap: 8px;
}
.kpi-row {
  margin-bottom: 12px;
}
.kpi-card {
  margin-bottom: 12px;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.quick .qbtn {
  display: block;
  width: 100%;
  margin: 0 0 8px;
}
</style>
