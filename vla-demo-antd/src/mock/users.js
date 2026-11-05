/** Demo accounts for Orion Annotate role switching. */
export const users = [
  {
    id: 'u-orn-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    team: 'Orion Ops',
  },
  {
    id: 'u-orn-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    team: 'Dataset Guild',
  },
  {
    id: 'u-orn-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    team: 'Label Desk',
  },
  {
    id: 'u-orn-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    team: 'Label Desk',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]