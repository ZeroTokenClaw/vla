/** Demo accounts for DataLink Label role switching. */
export const users = [
  {
    id: 'u-dl-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    dept: '标注运营中心',
  },
  {
    id: 'u-dl-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    dept: '质检一组',
  },
  {
    id: 'u-dl-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    dept: '标注二组',
  },
  {
    id: 'u-dl-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    dept: '视觉标注组',
  },
  {
    id: 'u-dl-reviewer-2',
    name: '韩清扬',
    role: 'reviewer',
    account: 'han.qy',
    dept: '质检二组',
  },
  {
    id: 'u-dl-annotator-3',
    name: '许岚',
    role: 'annotator',
    account: 'xu.lan',
    dept: '语音标注组',
  },
  {
    id: 'u-dl-annotator-4',
    name: '丁一鸣',
    role: 'annotator',
    account: 'ding.ym',
    dept: '点云专项组',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]
