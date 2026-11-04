export const copy = {
  productName: '星算训练台 StarCompute',
  productShort: '星算训练台',
  vendor: '星算云',
  envBadge: 'Console',
  modules: {
    home: '总览',
    qc: '质控实验',
    prelabel: '预标流水线',
    vla: '采集实验',
    train: '训练实验',
  },
  roles: {
    annotator: '标注员',
    reviewer: '审核员',
    admin: '管理员',
  },
  terms: {
    experiment: '实验',
    pool: '算力池',
    checkpoint: 'Checkpoint',
  },
  home: {
    title: '算力与实验总览',
    subtitle: '云厂商算法平台风仪表盘 — GPU 池、训练实验与 Checkpoint 一屏掌握',
  },
  empty: {
    experiments: '暂无训练实验',
    audit: '暂无任务进度',
  },
} as const

export type Copy = typeof copy
