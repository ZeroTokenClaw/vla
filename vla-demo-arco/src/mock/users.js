/** Demo accounts for 星算训练台 StarCompute role switching. */
export const users = [
  {
    id: 'u-sc-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    pool: '算力调度中心',
  },
  {
    id: 'u-sc-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    pool: '质检池',
  },
  {
    id: 'u-sc-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    pool: '标注池-A',
  },
  {
    id: 'u-sc-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    pool: '标注池-A',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]