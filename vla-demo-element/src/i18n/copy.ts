export const copy = {
  productName: '数联标注云 DataLink Label',
  productShort: '数联标注云',
  vendor: '数联科技',
  envBadge: '演示',
  modules: {
    home: '工作台',
    qc: '质控中心',
    prelabel: '智能预标',
    vla: '具身采集标注',
    train: '算法工场',
  },
  roles: {
    annotator: '标注员',
    reviewer: '审核员',
    admin: '管理员',
  },
  home: {
    title: '待办工单',
    subtitle: '按优先级处理当前分配给您的工单',
  },
} as const

export type Copy = typeof copy
