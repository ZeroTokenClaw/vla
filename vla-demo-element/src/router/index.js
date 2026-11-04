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
          meta: { title: '质控中心' },
          children: [
            { path: '', name: 'qc', component: () => import('@/views/qc/QcTaskList.vue') },
            {
              path: 'annotate/:id?',
              name: 'qc-annotate',
              component: () => import('@/views/qc/AnnotateWorkbench.vue'),
              meta: { title: '标注工作台' },
            },
            {
              path: 'workflow',
              name: 'qc-workflow',
              component: () => import('@/views/qc/WorkflowBoard.vue'),
              meta: { title: '协作看板' },
            },
            {
              path: 'audit/:id?',
              name: 'qc-audit',
              component: () => import('@/views/qc/AuditPanel.vue'),
              meta: { title: '多级审核' },
            },
            {
              path: 'sample-check',
              name: 'qc-sample-check',
              component: () => import('@/views/qc/SampleCheck.vue'),
              meta: { title: '抽检回流' },
            },
            {
              path: 'spec',
              name: 'qc-spec',
              component: () => import('@/views/qc/SpecDoc.vue'),
              meta: { title: '标注规范' },
            },
          ],
        },
        {
          path: 'prelabel',
          component: () => import('@/views/prelabel/PrelabelHub.vue'),
          meta: { title: '智能预标' },
          children: [
            { path: '', redirect: '/prelabel/text' },
            {
              path: 'text/:id?',
              name: 'prelabel-text',
              component: () => import('@/views/prelabel/TextPrelabel.vue'),
              meta: { title: '文本预标' },
            },
            {
              path: 'vision/:id?',
              name: 'prelabel-vision',
              component: () => import('@/views/prelabel/VisionPrelabel.vue'),
              meta: { title: '视觉预标' },
            },
            {
              path: 'accept/:id?',
              name: 'prelabel-accept',
              component: () => import('@/views/prelabel/AcceptWizard.vue'),
              meta: { title: '验收向导' },
            },
          ],
        },
        {
          path: 'vla',
          component: () => import('@/views/vla/VlaHub.vue'),
          meta: { title: '具身采集标注' },
          children: [
            { path: '', redirect: '/vla/collect' },
            {
              path: 'collect',
              name: 'vla-collect',
              component: () => import('@/views/vla/CollectConfig.vue'),
              meta: { title: '采集配置' },
            },
            {
              path: 'timeline/:id?',
              name: 'vla-timeline',
              component: () => import('@/views/vla/TimelineAnnotate.vue'),
              meta: { title: '时间轴标注' },
            },
            {
              path: 'quality/:id?',
              name: 'vla-quality',
              component: () => import('@/views/vla/QualityGate.vue'),
              meta: { title: '样本质检' },
            },
          ],
        },
        {
          path: 'train',
          name: 'train',
          component: () => import('@/views/Placeholder.vue'),
          meta: { title: '算法工场' },
        },
      ],
    },
  ],
})

export default router
