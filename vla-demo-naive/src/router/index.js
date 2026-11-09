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

        // 数据分析
        {
          path: 'analytics/profile',
          name: 'analytics-profile',
          component: () => import('@/views/analytics/ProfileView.vue'),
          meta: { title: '多模态数据画像' },
        },
        {
          path: 'analytics/quality-score',
          name: 'analytics-quality',
          component: () => import('@/views/analytics/QualityScoreView.vue'),
          meta: { title: '数据质量评分' },
        },
        {
          path: 'analytics/anomaly',
          name: 'analytics-anomaly',
          component: () => import('@/views/analytics/AnomalyView.vue'),
          meta: { title: '样本异常分析' },
        },

        // 数据资产
        {
          path: 'datasets',
          name: 'datasets',
          component: () => import('@/views/datasets/DatasetList.vue'),
          meta: { title: '数据集管理' },
        },
        {
          path: 'datasets/:id/samples',
          name: 'dataset-samples',
          component: () => import('@/views/datasets/SampleBrowser.vue'),
          meta: { title: '样本浏览器' },
        },

        // 标注质控（保留 /qc 路径以兼容既有演示与测试）
        {
          path: 'qc',
          component: () => import('@/views/qc/QcHub.vue'),
          meta: { title: '标注质控' },
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
        // annotate 别名
        { path: 'annotate/tasks', redirect: '/qc' },
        { path: 'annotate/workbench/:id?', redirect: (to) => `/qc/annotate/${to.params.id || ''}` },
        { path: 'annotate/collab', redirect: '/qc/workflow' },
        { path: 'annotate/review/:id?', redirect: (to) => `/qc/audit/${to.params.id || ''}` },
        { path: 'annotate/spot-check', redirect: '/qc/sample-check' },
        { path: 'annotate/spec', redirect: '/qc/spec' },

        // 预标注
        {
          path: 'prelabel',
          component: () => import('@/views/prelabel/PrelabelHub.vue'),
          meta: { title: '智能预标' },
          children: [
            { path: '', redirect: '/prelabel/jobs' },
            {
              path: 'jobs',
              name: 'prelabel-jobs',
              component: () => import('@/views/prelabel/PrelabelJobs.vue'),
              meta: { title: '预标任务队列' },
            },
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

        // VLA 行为理解
        {
          path: 'vla',
          component: () => import('@/views/vla/VlaHub.vue'),
          meta: { title: '行为理解' },
          children: [
            { path: '', redirect: '/vla/collect' },
            {
              path: 'collect',
              name: 'vla-collect',
              component: () => import('@/views/vla/CollectConfig.vue'),
              meta: { title: '采集配置' },
            },
            {
              path: 'devices',
              name: 'vla-devices',
              component: () => import('@/views/vla/DeviceLedger.vue'),
              meta: { title: '设备台账' },
            },
            {
              path: 'scenes',
              name: 'vla-scenes',
              component: () => import('@/views/vla/ScenesPlans.vue'),
              meta: { title: '场景与方案' },
            },
            {
              path: 'templates',
              name: 'vla-templates',
              component: () => import('@/views/vla/ActionTemplates.vue'),
              meta: { title: '动作模板' },
            },
            {
              path: 'timeline/:id?',
              name: 'vla-timeline',
              component: () => import('@/views/vla/TimelineAnnotate.vue'),
              meta: { title: '时间轴标注' },
            },
            {
              path: 'action-analysis/:id?',
              name: 'vla-action-analysis',
              component: () => import('@/views/vla/ActionAnalysis.vue'),
              meta: { title: '动作序列分析' },
            },
            {
              path: 'consistency/:id?',
              name: 'vla-consistency',
              component: () => import('@/views/vla/ConsistencyView.vue'),
              meta: { title: '指令一致性' },
            },
            {
              path: 'quality/:id?',
              name: 'vla-quality',
              component: () => import('@/views/vla/QualityGate.vue'),
              meta: { title: '样本质检' },
            },
          ],
        },

        // 训练
        {
          path: 'train',
          component: () => import('@/views/train/TrainHub.vue'),
          meta: { title: '训练评测' },
          children: [
            { path: '', redirect: '/train/config' },
            {
              path: 'config',
              name: 'train-config',
              component: () => import('@/views/train/AlgoConfig.vue'),
              meta: { title: '训练配置' },
            },
            {
              path: 'runner/:id?',
              name: 'train-runner',
              component: () => import('@/views/train/TrainRunner.vue'),
              meta: { title: '训练运行' },
            },
            {
              path: 'metrics/:id?',
              name: 'train-metrics',
              component: () => import('@/views/train/MetricsPanel.vue'),
              meta: { title: '指标报表' },
            },
            {
              path: 'gpus',
              name: 'train-gpus',
              component: () => import('@/views/train/GpuMonitor.vue'),
              meta: { title: '算力监控' },
            },
          ],
        },

        // 评测与血缘
        {
          path: 'eval/models',
          name: 'eval-models',
          component: () => import('@/views/eval/ModelRegistry.vue'),
          meta: { title: '算法模型' },
        },
        {
          path: 'eval/compare',
          name: 'eval-compare',
          component: () => import('@/views/eval/CompareView.vue'),
          meta: { title: '多模型对比' },
        },
        {
          path: 'lineage',
          name: 'lineage',
          component: () => import('@/views/eval/LineageView.vue'),
          meta: { title: '数据模型追溯' },
        },
      ],
    },
  ],
})

export default router
