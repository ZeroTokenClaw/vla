import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'home', component: () => import('@/views/Home.vue') },
        {
          path: 'qc',
          component: () => import('@/views/qc/QcHub.vue'),
          meta: { title: 'QC 质控' },
          children: [
            { path: '', name: 'qc', component: () => import('@/views/qc/QcTaskList.vue') },
            {
              path: 'annotate/:id?',
              name: 'qc-annotate',
              component: () => import('@/views/qc/AnnotateWorkbench.vue'),
              meta: { title: 'Annotate 工作台' },
            },
            {
              path: 'workflow',
              name: 'qc-workflow',
              component: () => import('@/views/qc/WorkflowBoard.vue'),
              meta: { title: 'Workflow 协作' },
            },
            {
              path: 'audit/:id?',
              name: 'qc-audit',
              component: () => import('@/views/qc/AuditPanel.vue'),
              meta: { title: 'Review 审核' },
            },
            {
              path: 'sample-check',
              name: 'qc-sample-check',
              component: () => import('@/views/qc/SampleCheck.vue'),
              meta: { title: 'Sampling 抽检' },
            },
            {
              path: 'spec',
              name: 'qc-spec',
              component: () => import('@/views/qc/SpecDoc.vue'),
              meta: { title: 'Spec 规范' },
            },
          ],
        },
        {
          path: 'prelabel',
          component: () => import('@/views/prelabel/PrelabelHub.vue'),
          meta: { title: 'Prelabel 预标' },
          children: [
            { path: '', redirect: '/prelabel/text' },
            {
              path: 'text/:id?',
              name: 'prelabel-text',
              component: () => import('@/views/prelabel/TextPrelabel.vue'),
              meta: { title: 'Text 文本' },
            },
            {
              path: 'vision/:id?',
              name: 'prelabel-vision',
              component: () => import('@/views/prelabel/VisionPrelabel.vue'),
              meta: { title: 'Vision 视觉' },
            },
            {
              path: 'accept/:id?',
              name: 'prelabel-accept',
              component: () => import('@/views/prelabel/AcceptWizard.vue'),
              meta: { title: 'Accept 验收' },
            },
          ],
        },
        {
          path: 'vla',
          component: () => import('@/views/vla/VlaHub.vue'),
          meta: { title: 'VLA 采集' },
          children: [
            { path: '', redirect: '/vla/collect' },
            {
              path: 'collect',
              name: 'vla-collect',
              component: () => import('@/views/vla/CollectConfig.vue'),
              meta: { title: 'Collect 配置' },
            },
            {
              path: 'timeline/:id?',
              name: 'vla-timeline',
              component: () => import('@/views/vla/TimelineAnnotate.vue'),
              meta: { title: 'Timeline 标注' },
            },
            {
              path: 'quality/:id?',
              name: 'vla-quality',
              component: () => import('@/views/vla/QualityGate.vue'),
              meta: { title: 'Quality 质检' },
            },
          ],
        },
        {
          path: 'train',
          component: () => import('@/views/train/TrainHub.vue'),
          meta: { title: 'Train 训练' },
          children: [
            { path: '', redirect: '/train/config' },
            {
              path: 'config',
              name: 'train-config',
              component: () => import('@/views/train/AlgoConfig.vue'),
              meta: { title: 'Config 配置' },
            },
            {
              path: 'runner/:id?',
              name: 'train-runner',
              component: () => import('@/views/train/TrainRunner.vue'),
              meta: { title: 'Runner 运行' },
            },
            {
              path: 'metrics/:id?',
              name: 'train-metrics',
              component: () => import('@/views/train/MetricsPanel.vue'),
              meta: { title: 'Metrics 指标' },
            },
          ],
        },
      ],
    },
  ],
})

export default router
