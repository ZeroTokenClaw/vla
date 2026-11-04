<script setup>
import { useRouter } from 'vue-router'
import { copy } from '@/i18n/copy'
import {
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()

const tourSteps = [
  {
    title: 'Create a Job',
    description: '在 QC 质控中创建标注 Job，分配 Annotator / Reviewer。',
  },
  {
    title: 'Run Prelabel',
    description: '用模型预标文本与视觉 Dataset，再人工修正。',
  },
  {
    title: 'Capture VLA',
    description: '配置采集方案，在时间轴标注动作并导出 JSON / Excel / CSV。',
  },
  {
    title: 'Train & Validate',
    description: '创建训练实验，观察 loss / acc / mAP 并导出报表。',
  },
]

const projects = [
  {
    id: 'ORN-JOB-QC-88421',
    title: 'Multimodal QC Dataset',
    module: copy.modules.qc,
    path: '/qc',
    desc: '文本 NER · 分割 · 语音切片 · 视频检测 · 点云',
    status: 'Active',
    color: '#1677ff',
    icon: SafetyCertificateOutlined,
  },
  {
    id: 'ORN-JOB-PRE-22014',
    title: 'Auto Prelabel Workspace',
    module: copy.modules.prelabel,
    path: '/prelabel/text',
    desc: 'Text / OCR / YOLO 预标与验收向导',
    status: 'Ready',
    color: '#722ed1',
    icon: ThunderboltOutlined,
  },
  {
    id: 'ORN-VLA-2026-001',
    title: 'Embodied Capture Pack',
    module: copy.modules.vla,
    path: '/vla/collect',
    desc: '动作模板 · 关键帧 · 样本质检门禁',
    status: 'In review',
    color: '#13c2c2',
    icon: VideoCameraOutlined,
  },
  {
    id: 'ORN-EXP-2026-001',
    title: 'Training Lab',
    module: copy.modules.train,
    path: '/train/config',
    desc: '算法版本 · GPU 分配 · 指标曲线',
    status: 'Idle',
    color: '#52c41a',
    icon: ExperimentOutlined,
  },
]
</script>

<template>
  <div class="home">
    <div class="hero">
      <div>
        <a-tag color="processing">SaaS Workspace</a-tag>
        <h1>{{ copy.home.title }}</h1>
        <p class="sub">{{ copy.home.subtitle }}</p>
      </div>
      <a-button type="primary" size="large" @click="router.push('/qc')">Create job</a-button>
    </div>

    <a-card class="tour-card" :bordered="false">
      <template #title>
        <span>Product Tour</span>
      </template>
      <a-steps :current="1" label-placement="vertical">
        <a-step
          v-for="(s, i) in tourSteps"
          :key="s.title"
          :title="s.title"
          :description="s.description"
          :status="i < 1 ? 'finish' : i === 1 ? 'process' : 'wait'"
        >
          <template v-if="i < 1" #icon><CheckCircleOutlined /></template>
        </a-step>
      </a-steps>
    </a-card>

    <div class="section-head">
      <h2>Dataset Projects</h2>
      <span class="hint">Open a card to enter the module — bilingual empty states inside.</span>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col v-for="p in projects" :key="p.id" :xs="24" :sm="12" :lg="6">
        <a-card hoverable class="project-card" @click="router.push(p.path)">
          <div class="card-top">
            <div class="icon" :style="{ background: p.color + '22', color: p.color }">
              <component :is="p.icon" />
            </div>
            <a-tag>{{ p.status }}</a-tag>
          </div>
          <h3>{{ p.title }}</h3>
          <p>{{ p.desc }}</p>
          <div class="card-foot">
            <code>{{ p.id }}</code>
            <span>{{ p.module }}</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-empty v-if="!projects.length" :description="copy.empty.jobs" />
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}
h1 {
  margin: 10px 0 0;
  font-size: 28px;
  letter-spacing: -0.02em;
}
.sub {
  margin: 8px 0 0;
  color: #64748b;
  max-width: 560px;
}
.tour-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 8px 24px #0f172a0a;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}
.section-head h2 {
  margin: 0;
  font-size: 18px;
}
.hint {
  color: #94a3b8;
  font-size: 12px;
}
.project-card {
  border-radius: 12px;
  min-height: 190px;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
h3 {
  margin: 0 0 8px;
  font-size: 16px;
}
.project-card p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  min-height: 40px;
}
.card-foot {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}
code {
  font-size: 11px;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  color: #334155;
}
</style>
