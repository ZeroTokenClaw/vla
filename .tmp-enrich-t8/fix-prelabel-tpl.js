const fs = require('fs')

function fix(p, title) {
  let s = fs.readFileSync(p, 'utf8')
  // Remove broken insertion: pagination wrongly closed template#header
  s = s.replace(
    new RegExp(
      '<template #header>\\s*<div class="card-h">' +
        title +
        '</div>\\s*<div style="margin-top:12px;display:flex;justify-content:flex-end">[\\s\\S]*?</n-pagination>\\s*</div>\\s*</template>',
      'm',
    ),
    `<template #header>
            <div class="card-h">${title}</div>
          </template>`,
  )

  // If pagination still missing, insert before side card close
  if (!s.includes('n-pagination')) {
    const sideIdx = s.indexOf('<n-card class="side">')
    if (sideIdx < 0) throw new Error('no side card ' + p)
    const closeIdx = s.indexOf('</n-card>', sideIdx)
    const pag = `
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <n-pagination
              v-model:page="page"
              v-model:page-size="pageSize"
              :item-count="total"
              show-size-picker
              :page-sizes="[10, 20, 50]"
              @update:page="loadList"
              @update:page-size="() => { page.value = 1; loadList() }"
            />
          </div>
`
    s = s.slice(0, closeIdx) + pag + s.slice(closeIdx)
  }

  fs.writeFileSync(p, s)
  console.log(
    p.split('naive/')[1],
    'open',
    (s.match(/<template>/g) || []).length,
    'close',
    (s.match(/<\/template>/g) || []).length,
    'slots',
    (s.match(/<template #/g) || []).length,
    'pag',
    (s.match(/n-pagination/g) || []).length,
  )
  // show header area
  const i = s.indexOf('<n-card class="side">')
  console.log(s.slice(i, i + 700))
}

fix('E:/omp/vla/vla-demo-naive/src/views/prelabel/TextPrelabel.vue', '文本样例')
fix('E:/omp/vla/vla-demo-naive/src/views/prelabel/VisionPrelabel.vue', '图像样例')