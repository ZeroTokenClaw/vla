/** Demo accounts for 星算训练台 StarCompute role switching. */
export const users = [
  {
    id: 'u-sc-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    dept: '算力调度中心',
  },
  {
    id: 'u-sc-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    dept: '质检算力组',
  },
  {
    id: 'u-sc-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    dept: '标注实验组',
  },
  {
    id: 'u-sc-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    dept: '标注实验组',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]