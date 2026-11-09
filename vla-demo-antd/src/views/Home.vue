<script setup>
import { useRouter } from 'vue-router'
import { copy } from '@/i18n/copy'
import {
  ClusterOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
  ExperimentOutlined,
  SettingOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()

const tourSteps = [
  {
    title: 'Orchestrate Pipeline',
    description: '在 Factory 创建生产任务，拖拽 16 类节点编排流水线并监控执行。',
  },
  {
    title: 'Annotate & Review',
    description: '多模态标注、协作审核与抽检回流，保证合格数据入库。',
  },
  {
    title: 'Prelabel & VLA',
    description: 'OCR/YOLO/NLP 预标修正，VLA 动作结构化并三格式导出。',
  },
  {
    title: 'Train & Validate',
    description: '配置实验与 GPU，观察指标曲线并导出训练报表。',
  },
]

const projects = [
  {
    id: 'ADF-PROD-2026-001',
    title: 'Production Pipeline',
    module: copy.modules.factory,
    path: '/factory/dashboard',
    desc: '驾驶舱 · 生产任务 · 可执行编排 · 节点监控',
    status: 'Core',
    color: '#1677ff',
    icon: ClusterOutlined,
  },
  {
    id: 'ORN-JOB-QC-88421',
    title: 'Multimodal QC Dataset',
    module: copy.modules.qc,
    path: '/qc',
    desc: '文本 NER · 分割 · 语音切片 · 视频检测 · 点云',
    status: 'Active',
    color: '#2f54eb',
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
    desc: '场景方案 · 动作模板 · 时间轴 · 异常处理',
    status: 'In review',
    color: '#13c2c2',
    icon: VideoCameraOutlined,
  },
  {
    id: 'ORN-EXP-2026-001',
    title: 'Training Lab',
    module: copy.modules.train,
    path: '/train/compare',
    desc: '多模型对比 · 数据血缘 · GPU · 评测报表',
    status: 'Idle',
    color: '#52c41a',
    icon: ExperimentOutlined,
  },
  {
    id: 'ADF-AN-01',
    title: 'Analytics Desk',
    module: 'Analytics 分析',
    path: '/analytics/profile',
    desc: '数据画像 · 质量评分卡 · 异常分析',
    status: 'Insight',
    color: '#eb2f96',
    icon: BarChartOutlined,
  },
  {
    id: 'ADF-SYS-01',
    title: 'System Console',
    module: copy.modules.system,
    path: '/system/models',
    desc: '模型注册 · 导出中心 · 权限 · 审计日志',
    status: 'Ops',
    color: '#8c8c8c',
    icon: SettingOutlined,
  },
]
</script>

<template>
  <div class="home">
    <div class="hero">
      <div>
        <a-tag color="processing">AI Data Factory · Demo Fake Data</a-tag>
        <h1>{{ copy.home.title }}</h1>
        <p class="sub">{{ copy.home.subtitle }}</p>
      </div>
      <a-space>
        <a-button size="large" @click="router.push('/factory/tasks')">Create production task</a-button>
        <a-button type="primary" size="large" @click="router.push('/factory/dashboard')">Open cockpit</a-button>
      </a-space>
    </div>

    <a-card class="tour-card" :bordered="false">
      <template #title>
        <span>Product Tour</span>
      </template>
      <a-steps :current="0" label-placement="vertical">
        <a-step
          v-for="(s, i) in tourSteps"
          :key="s.title"
          :title="s.title"
          :description="s.description"
          :status="i === 0 ? 'process' : 'wait'"
        >
          <template v-if="i < 0" #icon><CheckCircleOutlined /></template>
        </a-step>
      </a-steps>
    </a-card>

    <div class="section-head">
      <h2>Workspace Modules</h2>
      <span class="hint">全部页面使用逼真伪造数据，便于招标演示与录屏。</span>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col v-for="p in projects" :key="p.id" :xs="24" :sm="12" :lg="8">
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
  max-width: 640px;
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
