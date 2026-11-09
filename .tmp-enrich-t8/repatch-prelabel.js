const fs = require('fs')

function patch(p, isText) {
  let s = fs.readFileSync(p, 'utf8')
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

  if (!s.includes('n-pagination')) {
    const sideStart = s.indexOf('<n-card class="side">')
    const marker = '\n        </n-card>\n      </n-gi>'
    const idx = s.indexOf(marker, sideStart)
    if (idx < 0) throw new Error('marker missing in ' + p)
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
          </div>`
    s = s.slice(0, idx) + pag + s.slice(idx)
  }

  fs.writeFileSync(p, s)
  // verify side list still has doc click handlers / n-button or list items
  const side = s.slice(s.indexOf('<n-card class="side">'), s.indexOf('\n        </n-card>\n      </n-gi>', s.indexOf('<n-card class="side">')) + 40)
  console.log('====', p.split('/').pop())
  console.log('has pagination', s.includes('n-pagination'))
  console.log('has selectDoc/selectImage', /selectDoc|selectImage|onSelect|@click="select/.test(side))
  console.log('template open/close', (s.match(/<template>/g) || []).length, (s.match(/<\/template>/g) || []).length)
  console.log(side.slice(0, 500))
}

patch('E:/omp/vla/vla-demo-naive/src/views/prelabel/TextPrelabel.vue', true)
patch('E:/omp/vla/vla-demo-naive/src/views/prelabel/VisionPrelabel.vue', false)