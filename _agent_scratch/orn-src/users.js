/** Demo accounts for Orion Annotate role switching. */
export const users = [
  {
    id: 'u-orn-admin',
    name: '周明轩',
    role: 'admin',
    account: 'demo.admin',
    dept: 'Orion Ops',
  },
  {
    id: 'u-orn-reviewer',
    name: '林晓萱',
    role: 'reviewer',
    account: 'demo.reviewer',
    dept: 'Reviewer Squad',
  },
  {
    id: 'u-orn-annotator',
    name: '陈思远',
    role: 'annotator',
    account: 'demo.annotator',
    dept: 'Annotator Team',
  },
  {
    id: 'u-orn-annotator-2',
    name: '赵雨桐',
    role: 'annotator',
    account: 'zhao.yt',
    dept: 'Annotator Team',
  },
]

export const roleOptions = [
  { value: 'annotator', labelKey: 'annotator' },
  { value: 'reviewer', labelKey: 'reviewer' },
  { value: 'admin', labelKey: 'admin' },
]