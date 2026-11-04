/** Demo accounts for 灵眸 VLA Studio role switching. */
export const users = [
  {
    id: 'u-lm-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    dept: '具身数据中心',
  },
  {
    id: 'u-lm-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    dept: '会话质检组',
  },
  {
    id: 'u-lm-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    dept: '关键帧标注组',
  },
  {
    id: 'u-lm-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    dept: '关键帧标注组',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]