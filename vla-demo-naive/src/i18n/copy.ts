export const copy = {
  productName: '灵眸 VLA Studio',
  productShort: '灵眸',
  vendor: '灵眸智造',
  envBadge: 'Studio',
  modules: {
    home: '会话',
    qc: '质控舱',
    prelabel: '预标引擎',
    vla: '采集台',
    train: '训练核',
  },
  roles: {
    annotator: '标注员',
    reviewer: '审核员',
    admin: '管理员',
  },
  terms: {
    session: '会话',
    keyframe: '关键帧',
    actionClip: '动作片段',
  },
  home: {
    title: '最近采集会话',
    subtitle: '时间轴优先的具身数据采集工作台 — 点选会话进入关键帧与动作片段',
  },
  empty: {
    sessions: '还没有采集会话',
    audit: '控制台暂无输出',
  },
} as const

export type Copy = typeof copy
