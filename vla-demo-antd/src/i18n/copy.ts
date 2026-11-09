export const copy = {
  productName: 'AI Data Factory',
  productShort: 'ADF',
  vendor: 'Orion Labs',
  envBadge: 'Demo · Fake Data',
  modules: {
    home: 'Home 概览',
    factory: 'Factory 工厂',
    qc: 'QC 质控',
    prelabel: 'Prelabel 预标',
    vla: 'VLA 采集',
    train: 'Train 训练',
    system: 'System 系统',
  },
  roles: {
    annotator: 'Annotator 标注员',
    reviewer: 'Reviewer 审核员',
    admin: 'Admin 管理员',
  },
  terms: {
    job: 'Job',
    reviewer: 'Reviewer',
    dataset: 'Dataset',
    pipeline: 'Pipeline',
  },
  home: {
    title: 'Welcome to AI Data Factory',
    subtitle:
      '以自动化数据生产流水线为核心：编排 → 预标 → 人工质控 → VLA 结构化 → 训练验证。本环境为逼真伪造数据演示，不调用真实模型服务。',
  },
  empty: {
    jobs: 'No jobs yet — Create job',
    audit: 'No activity yet',
    tasks: 'No production tasks — Create task',
  },
} as const

export type Copy = typeof copy
