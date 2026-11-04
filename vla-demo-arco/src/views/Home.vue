<script setup>
import { useRouter } from 'vue-router'
import { copy } from '@/i18n/copy'

const router = useRouter()

const kpis = [
  { label: '算力池占用', value: '68%', tip: 'A100 × 12 / 18', color: '#00B42A' },
  { label: '运行中实验', value: '3', tip: '训练 + 预标流水线', color: '#0FC6C2' },
  { label: 'Checkpoint', value: '27', tip: '近 7 日新增 5', color: '#3491FA' },
  { label: '今日抽检通过率', value: '92%', tip: '质控实验回流', color: '#F7BA1E' },
]

const modules = [
  {
    id: 'SC-QC-CARD',
    title: copy.modules.qc,
    desc: '多模态标注 · 协作闭环 · 抽检回流',
    path: '/qc',
    metric: '12 实验工单',
    tone: 'green',
  },
  {
    id: 'SC-PRE-CARD',
    title: copy.modules.prelabel,
    desc: '文本 / OCR / YOLO 预标与验收',
    path: '/prelabel/text',
    metric: '4 流水线',
    tone: 'cyan',
  },
  {
    id: 'SC-VLA-CARD',
    title: copy.modules.vla,
    desc: '采集方案 · 关键帧 · 三格式导出',
    path: '/vla/collect',
    metric: '2 采集实验',
    tone: 'arcoblue',
  },
  {
    id: 'SC-EXP-CARD',
    title: copy.modules.train,
    desc: '算法版本 · GPU 分配 · loss/acc/mAP',
    path: '/train/config',
    metric: 'SC-EXP-20261104-17',
    tone: 'orangered',
  },
]

const gpuPool = [
  { id: 'gpu-0', name: 'A100-80G-0', util: 86, mem: '62/80G', job: 'SC-EXP-20261104-17' },
  { id: 'gpu-1', name: 'A100-80G-1', util: 74, mem: '51/80G', job: 'SC-EXP-20261104-12' },
  { id: 'gpu-2', name: 'A100-80G-2', util: 12, mem: '4/80G', job: '空闲' },
  { id: 'gpu-3', name: 'V100-32G-3', util: 0, mem: '0/32G', job: '空闲' },
]

const experiments = [
  {
    id: 'SC-EXP-20261104-17',
    name: 'VLA-Policy-v3 微调',
    status: 'running',
    epoch: '14/30',
    gpu: 'A100-80G-0',
    path: '/train/runner/SC-EXP-20261104-17',
  },
  {
    id: 'SC-EXP-20261104-12',
    name: 'YOLO 预标骨干蒸馏',
    status: 'running',
    epoch: '8/20',
    gpu: 'A100-80G-1',
    path: '/train/metrics/SC-EXP-20261104-12',
  },
  {
    id: 'SC-EXP-20261103-09',
    name: '具身动作序列基线',
    status: 'finished',
    epoch: '30/30',
    gpu: '—',
    path: '/train/metrics/SC-EXP-20261103-09',
  },
]
</script>

<template>
  <div class="home">
    <div class="hero">
      <div>
        <div class="eyebrow">COMPUTE DASHBOARD</div>
        <h2>{{ copy.home.title }}</h2>
        <p class="sub">{{ copy.home.subtitle }}</p>
      </div>
      <a-button type="primary" @click="router.push('/train/config')">新建训练实验</a-button>
    </div>

    <a-row :gutter="16" class="kpi-row">
      <a-col v-for="k in kpis" :key="k.label" :xs="12" :md="6">
        <a-card class="kpi-card" :bordered="false">
          <a-statistic :title="k.label" :value="k.value" :value-style="{ color: k.color, fontWeight: 700 }" />
          <div class="kpi-tip">{{ k.tip }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="mid">
      <a-col :xs="24" :lg="14">
        <a-card title="模块入口" :bordered="false" class="panel">
          <div class="mod-grid">
            <div
              v-for="m in modules"
              :key="m.id"
              class="mod-card"
              @click="router.push(m.path)"
            >
              <div class="mod-top">
                <a-tag :color="m.tone" size="small">{{ m.id }}</a-tag>
                <span class="mod-metric">{{ m.metric }}</span>
              </div>
              <div class="mod-title">{{ m.title }}</div>
              <div class="mod-desc">{{ m.desc }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="10">
        <a-card :bordered="false" class="panel">
          <template #title>
            <span>{{ copy.terms.pool }}</span>
          </template>
          <div v-for="g in gpuPool" :key="g.id" class="gpu-row">
            <div class="gpu-meta">
              <strong>{{ g.name }}</strong>
              <span>{{ g.job }}</span>
            </div>
            <a-progress :percent="g.util" size="small" :color="g.util > 70 ? '#00B42A' : '#0FC6C2'" />
            <div class="gpu-mem">显存 {{ g.mem }}</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false" class="panel">
      <template #title>
        <span>最近{{ copy.terms.experiment }}</span>
      </template>
      <a-empty v-if="!experiments.length" :description="copy.empty.experiments" />
      <a-table
        v-else
        :data="experiments"
        :pagination="false"
        row-key="id"
        size="small"
        :columns="[
          { title: '实验 ID', dataIndex: 'id' },
          { title: '名称', dataIndex: 'name' },
          { title: '状态', slotName: 'status', width: 100 },
          { title: 'Epoch', dataIndex: 'epoch', width: 100 },
          { title: 'GPU', dataIndex: 'gpu', width: 140 },
          { title: '操作', slotName: 'actions', width: 100 },
        ]"
      >
        <template #status="{ record }">
          <a-tag :color="record.status === 'running' ? 'green' : 'gray'" size="small">
            {{ record.status }}
          </a-tag>
        </template>
        <template #actions="{ record }">
          <a-button type="text" @click="router.push(record.path)">打开</a-button>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: #0fc6c2;
  font-weight: 700;
}
h2 {
  margin: 4px 0 0;
  font-size: 22px;
  color: #1d2129;
}
.sub {
  margin: 6px 0 0;
  color: #86909c;
  font-size: 13px;
}
.kpi-row {
  margin-bottom: 16px;
}
.kpi-card {
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid #e5e6eb;
}
.kpi-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #86909c;
}
.mid {
  margin-bottom: 16px;
}
.panel {
  border-radius: 10px;
  border: 1px solid #e5e6eb;
  margin-bottom: 12px;
}
.mod-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.mod-card {
  border: 1px solid #e5e6eb;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  background: linear-gradient(180deg, #f7fffa 0%, #fff 60%);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.mod-card:hover {
  border-color: #00b42a;
  box-shadow: 0 6px 18px #00b42a14;
}
.mod-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.mod-metric {
  font-size: 12px;
  color: #86909c;
}
.mod-title {
  font-size: 16px;
  font-weight: 700;
  color: #1d2129;
}
.mod-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #4e5969;
}
.gpu-row {
  margin-bottom: 14px;
}
.gpu-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}
.gpu-meta span {
  color: #86909c;
  font-size: 12px;
}
.gpu-mem {
  font-size: 12px;
  color: #86909c;
  margin-top: 2px;
}
@media (max-width: 720px) {
  .mod-grid {
    grid-template-columns: 1fr;
  }
}
</style>
