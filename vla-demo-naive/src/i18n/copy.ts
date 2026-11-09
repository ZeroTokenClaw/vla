export const copy = {
  productName: 'EIDE 数据智能分析台',
  productShort: 'EIDE',
  vendor: '具身智能数据与评测',
  envBadge: 'Analysis',
  modules: {
    home: '驾驶舱',
    analytics: '数据分析',
    datasets: '数据资产',
    annotate: '标注质控',
    prelabel: '智能预标',
    vla: '行为理解',
    train: '训练评测',
    // 兼容旧键
    qc: '标注质控',
  },
  roles: {
    annotator: '标注员',
    reviewer: '审核员',
    admin: '管理员',
  },
  terms: {
    session: '样本会话',
    keyframe: '关键动作节点',
    actionClip: '动作序列段',
  },
  home: {
    title: '数据智能驾驶舱',
    subtitle: '画像 · 质量评分 · VLA 行为理解 · 多模型评测与数据-模型追溯',
  },
  empty: {
    sessions: '暂无分析对象，请先导入数据集或创建采集任务',
    audit: '控制台暂无输出',
  },
} as const

export type Copy = typeof copy
