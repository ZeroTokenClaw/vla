/** Demo accounts for 灵眸 VLA Studio role switching. */
export const users = [
  {
    id: 'u-lm-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    squad: '具身数据中心',
  },
  {
    id: 'u-lm-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    squad: '质检哨',
  },
  {
    id: 'u-lm-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    squad: '夜班标注舱',
  },
  {
    id: 'u-lm-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    squad: '夜班标注舱',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]
