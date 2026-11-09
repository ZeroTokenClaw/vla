const fs = require('fs')

function patch(p, isText) {
  let s = fs.readFileSync(p, 'utf8')
  // normalize to LF for easier edits, write back with LF
  s = s.replace(/\r\n/g, '\n')

  if (!s.includes('const page = ref')) {
    s = s.replace(
      /(const (?:docs|list) = ref\(\[\]\))/,
      '$1\nconst page = ref(1)\nconst pageSize = ref(10)\nconst total = ref(0)',
    )
  }

  if (isText) {
    s = s.replace(
      'docs.value = await listTextDocs()',
      `const res = await listTextDocs({ page: page.value, pageSize: pageSize.value })
  docs.value = res.items
  total.value = res.total
  page.value = res.page`,
    )
  } else {
    s = s.replace(
      'list.value = await listVisionImages()',
      `const res = await listVisionImages({ page: page.value, pageSize: pageSize.value })
  list.value = res.items
  total.value = res.total
  page.value = res.page`,
    )
  }

  // Replace empty side card body with list + pagination
  if (isText) {
    s = s.replace(
      /<n-card class="side">\s*<template #header>\s*<div class="card-h">文本样例<\/div>\s*<\/template>\s*<\/n-card>/,
      `<n-card class="side">
          <template #header>
            <div class="card-h">文本样例</div>
          </template>
          <n-empty v-if="!docs.length" description="暂无样例" size="small" />
          <div
            v-for="d in docs"
            :key="d.id"
            class="side-item"
            :class="{ active: route.params.id === d.id }"
            @click="router.push('/prelabel/text/' + d.id)"
          >
            <div class="side-id">{{ d.id }}</div>
            <div class="side-title">{{ d.title }}</div>
          </div>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <n-pagination
              v-model:page="page"
              v-model:page-size="pageSize"
              :item-count="total"
              size="small"
              :page-slot="5"
              @update:page="loadList"
              @update:page-size="() => { page.value = 1; loadList() }"
            />
          </div>
        </n-card>`,
    )
  } else {
    s = s.replace(
      /<n-card class="side">\s*<template #header>\s*<div class="card-h">图像样例<\/div>\s*<\/template>\s*<\/n-card>/,
      `<n-card class="side">
          <template #header>
            <div class="card-h">图像样例</div>
          </template>
          <n-empty v-if="!list.length" description="暂无样例" size="small" />
          <div
            v-for="d in list"
            :key="d.id"
            class="side-item"
            :class="{ active: route.params.id === d.id }"
            @click="router.push('/prelabel/vision/' + d.id)"
          >
            <div class="side-id">{{ d.id }}</div>
            <div class="side-title">{{ d.title }}</div>
          </div>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <n-pagination
              v-model:page="page"
              v-model:page-size="pageSize"
              :item-count="total"
              size="small"
              :page-slot="5"
              @update:page="loadList"
              @update:page-size="() => { page.value = 1; loadList() }"
            />
          </div>
        </n-card>`,
    )
  }

  if (!s.includes('.side-item')) {
    s = s.replace(
      '</style>',
      `.side-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  border: 1px solid transparent;
}
.side-item:hover { background: #f5f5f5; }
.side-item.active { background: #eef3ff; border-color: #c3d4ff; }
.side-id { font-size: 11px; color: #6b7280; }
.side-title { font-size: 13px; }
</style>`,
    )
  }

  fs.writeFileSync(p, s)
  console.log(
    p.split('/').pop(),
    'pag',
    s.includes('n-pagination'),
    'side-item',
    s.includes('side-item'),
    'load ok',
    s.includes('res.items'),
  )
}

patch('E:/omp/vla/vla-demo-naive/src/views/prelabel/TextPrelabel.vue', true)
patch('E:/omp/vla/vla-demo-naive/src/views/prelabel/VisionPrelabel.vue', false)
