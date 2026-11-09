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
          path: 'factory',
          component: () => import('@/views/factory/FactoryHub.vue'),
          meta: { title: 'Factory 工厂' },
          children: [
            { path: '', redirect: '/factory/dashboard' },
            {
              path: 'dashboard',
              name: 'factory-dashboard',
              component: () => import('@/views/factory/Dashboard.vue'),
              meta: { title: '数据生产驾驶舱' },
            },
            {
              path: 'tasks',
              name: 'factory-tasks',
              component: () => import('@/views/factory/TaskList.vue'),
              meta: { title: '生产任务管理' },
            },
            {
              path: 'workflows/:id?',
              name: 'factory-workflows',
              component: () => import('@/views/factory/WorkflowEditor.vue'),
              meta: { title: '自动化流程编排' },
            },
            {
              path: 'monitor',
              name: 'factory-monitor',
              component: () => import('@/views/factory/Monitor.vue'),
              meta: { title: '流程执行监控' },
            },
          ],
        },
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
              path: 'ocr/:id?',
              name: 'prelabel-ocr',
              component: () => import('@/views/prelabel/OcrCenter.vue'),
              meta: { title: 'OCR 中心' },
            },
            {
              path: 'yolo/:id?',
              name: 'prelabel-yolo',
              component: () => import('@/views/prelabel/YoloCenter.vue'),
              meta: { title: 'YOLO 中心' },
            },
            {
              path: 'accept/:id?',
              name: 'prelabel-accept',
              component: () => import('@/views/prelabel/AcceptWizard.vue'),
              meta: { title: 'Accept 验收' },
            },
            {
              path: 'jobs',
              name: 'prelabel-jobs',
              component: () => import('@/views/prelabel/PrelabelJobs.vue'),
              meta: { title: '预标任务队列' },
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
              path: 'scenes',
              name: 'vla-scenes',
              component: () => import('@/views/vla/ScenesPlans.vue'),
              meta: { title: '场景方案' },
            },
            {
              path: 'templates',
              name: 'vla-templates',
              component: () => import('@/views/vla/ActionTemplates.vue'),
              meta: { title: '动作模板' },
            },
            {
              path: 'devices',
              name: 'vla-devices',
              component: () => import('@/views/vla/Devices.vue'),
              meta: { title: '采集设备' },
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
            {
              path: 'exceptions',
              name: 'vla-exceptions',
              component: () => import('@/views/vla/Exceptions.vue'),
              meta: { title: '异常处理' },
            },
            {
              path: 'action-analysis/:id?',
              name: 'vla-action-analysis',
              component: () => import('@/views/vla/ActionAnalysis.vue'),
              meta: { title: '动作分析' },
            },
            {
              path: 'consistency/:id?',
              name: 'vla-consistency',
              component: () => import('@/views/vla/ConsistencyView.vue'),
              meta: { title: '指令一致性' },
            },
          ],
        },
        {
          path: 'analytics',
          component: () => import('@/views/analytics/AnalyticsHub.vue'),
          meta: { title: 'Analytics 分析' },
          children: [
            { path: '', redirect: '/analytics/profile' },
            {
              path: 'profile',
              name: 'analytics-profile',
              component: () => import('@/views/analytics/ProfileView.vue'),
              meta: { title: '数据画像' },
            },
            {
              path: 'quality',
              name: 'analytics-quality',
              component: () => import('@/views/analytics/QualityScore.vue'),
              meta: { title: '质量评分' },
            },
            {
              path: 'anomaly',
              name: 'analytics-anomaly',
              component: () => import('@/views/analytics/AnomalyView.vue'),
              meta: { title: '异常分析' },
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
            {
              path: 'gpus',
              name: 'train-gpus',
              component: () => import('@/views/train/GpuCenter.vue'),
              meta: { title: 'GPU 调度' },
            },
            {
              path: 'eval/:id?',
              name: 'train-eval',
              component: () => import('@/views/train/EvalCenter.vue'),
              meta: { title: '模型评测' },
            },
            {
              path: 'compare',
              name: 'train-compare',
              component: () => import('@/views/train/CompareView.vue'),
              meta: { title: '多模型对比' },
            },
            {
              path: 'lineage',
              name: 'train-lineage',
              component: () => import('@/views/train/LineageView.vue'),
              meta: { title: '数据血缘' },
            },
          ],
        },
        {
          path: 'system',
          component: () => import('@/views/system/SystemHub.vue'),
          meta: { title: 'System 系统' },
          children: [
            { path: '', redirect: '/system/models' },
            {
              path: 'models',
              name: 'system-models',
              component: () => import('@/views/system/ModelRegistry.vue'),
              meta: { title: '模型服务' },
            },
            {
              path: 'export',
              name: 'system-export',
              component: () => import('@/views/system/ExportCenter.vue'),
              meta: { title: '数据导出' },
            },
            {
              path: 'users',
              name: 'system-users',
              component: () => import('@/views/system/UsersPerm.vue'),
              meta: { title: '用户权限' },
            },
            {
              path: 'logs',
              name: 'system-logs',
              component: () => import('@/views/system/AuditLogs.vue'),
              meta: { title: '系统日志' },
            },
            {
              path: 'datasets',
              name: 'system-datasets',
              component: () => import('@/views/system/DatasetCenter.vue'),
              meta: { title: '数据集中心' },
            },
          ],
        },
      ],
    },
  ],
})

export default router
