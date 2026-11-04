export const copy = {
  productName: 'Orion Annotate',
  productShort: 'Orion',
  vendor: 'Orion Labs',
  envBadge: 'Demo',
  modules: {
    home: 'Home 概览',
    qc: 'QC 质控',
    prelabel: 'Prelabel 预标',
    vla: 'VLA 采集',
    train: 'Train 训练',
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
  },
  home: {
    title: 'Welcome to Orion Annotate',
    subtitle: 'Tour the workspace, then open a Dataset project card to start.',
  },
  empty: {
    jobs: 'No jobs yet — Create job',
    audit: 'No activity yet',
  },
} as const

export type Copy = typeof copy
