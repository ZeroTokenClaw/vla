const fs = require('fs')

function patchPrelabelList(file, listFn, dataRef) {
  let s = fs.readFileSync(file, 'utf8')
  if (s.includes('pageSize')) {
    console.log('already', file)
    return
  }
  s = s.replace(
    /import \{([^}]+)\} from 'vue'/,
    (m, inner) => {
      const parts = new Set(inner.split(',').map((x) => x.trim()).filter(Boolean))
      parts.add('watch')
      parts.add('ref')
      return `import { ${[...parts].join(', ')} } from 'vue'`
    },
  )
  // insert page state after first const x = ref(
  if (!s.includes('const page = ref')) {
    s = s.replace(
      new RegExp(`const ${dataRef} = ref\\(\\[\\]\\)`),
      `const ${dataRef} = ref([])\nconst total = ref(0)\nconst page = ref(1)\nconst pageSize = ref(10)`,
    )
  }
  // replace load assignment
  const patterns = [
    [
      new RegExp(`${dataRef}\\.value = await ${listFn}\\(\\)`),
      `const res = await ${listFn}({ page: page.value, pageSize: pageSize.value })\n    ${dataRef}.value = res.items\n    total.value = res.total\n    page.value = res.page\n    pageSize.value = res.pageSize`,
    ],
    [
      new RegExp(`${dataRef}\\.value = \\(await ${listFn}\\(\\{ page: 1, pageSize: 200 \\}\\)\\)\\.items`),
      `const res = await ${listFn}({ page: page.value, pageSize: pageSize.value })\n    ${dataRef}.value = res.items\n    total.value = res.total\n    page.value = res.page\n    pageSize.value = res.pageSize`,
    ],
  ]
  for (const [re, rep] of patterns) s = s.replace(re, rep)

  if (!s.includes('watch([page, pageSize]')) {
    s = s.replace(/onMounted\((\w+)\)/, (m, fn) => `onMounted(${fn})\nwatch([page, pageSize], ${fn})`)
  }

  // add pagination UI near end of main card if not present
  if (!s.includes('a-pagination')) {
    // try append before last closing of root template content - insert after first a-table or list block
    if (s.includes('</a-table>')) {
      s = s.replace(
        '</a-table>',
        `</a-table>\n      <div class="pager">\n        <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-total show-page-size :page-size-options="[10,20,50]" />\n      </div>`,
      )
    } else if (s.includes('</a-list>')) {
      s = s.replace(
        '</a-list>',
        `</a-list>\n      <div class="pager">\n        <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-total show-page-size :page-size-options="[10,20,50]" />\n      </div>`,
      )
    } else {
      // append pager before final </div> of template - fragile; add style anyway
      s = s.replace(
        '</template>\n\n<style',
        `  <div class="pager">\n    <a-pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-total show-page-size :page-size-options="[10,20,50]" />\n  </div>\n</template>\n\n<style`,
      )
    }
  }
  if (!s.includes('.pager')) {
    s = s.replace('</style>', `.pager { display:flex; justify-content:flex-end; margin-top:12px; }\n</style>`)
  }
  fs.writeFileSync(file, s)
  console.log('patched', file, s.includes('pageSize'), s.includes('a-pagination'))
}

patchPrelabelList('E:/omp/vla/vla-demo-arco/src/views/prelabel/TextPrelabel.vue', 'listTextDocs', 'docs')
patchPrelabelList('E:/omp/vla/vla-demo-arco/src/views/prelabel/VisionPrelabel.vue', 'listVisionImages', 'list')
