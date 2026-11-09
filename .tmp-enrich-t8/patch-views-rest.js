const fs = require('fs')

function patch(p, fn) {
  let s = fs.readFileSync(p, 'utf8')
  fs.writeFileSync(p, fn(s))
  console.log('patched', p.split('naive/')[1])
}

patch('E:/omp/vla/vla-demo-naive/src/views/qc/SampleCheck.vue', (s) => {
  return s.replace(
    'pool.value = await listSamplePool()',
    "pool.value = (await listSamplePool({ page: 1, pageSize: 200 })).items",
  )
})

// CollectConfig - add paging + scene filter + squad
patch('E:/omp/vla/vla-demo-naive/src/views/vla/CollectConfig.vue', (s) => {
  s = s.replace(
    /u\.dept/g,
    'u.squad',
  )
  // Add page refs after tasks ref
  if (!s.includes('const page = ref')) {
    s = s.replace(
      /const tasks = ref\(\[\]\)/,
      `const tasks = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filters = reactive({ status: null, scene: null, keyword: '' })`,
    )
  }
  // ensure reactive import
  if (!s.includes('reactive') && s.includes('filters = reactive')) {
    s = s.replace(
      /import \{([^}]+)\} from 'vue'/,
      (m, inner) => {
        if (inner.includes('reactive')) return m
        return `import {${inner}, reactive} from 'vue'`
      },
    )
  }
  s = s.replace(
    'tasks.value = await listVlaTasks()',
    `const res = await listVlaTasks({ ...filters, page: page.value, pageSize: pageSize.value })
    tasks.value = res.items
    total.value = res.total
    page.value = res.page`,
  )
  // Add filter UI + pagination near table — insert before n-data-table card if possible
  if (!s.includes('n-pagination')) {
    s = s.replace(
      /<n-data-table :columns="lmTableCols1" :data="tasks"/,
      `<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
            <n-input v-model:value="filters.keyword" clearable placeholder="任务号/名称" style="width:180px" />
            <n-select v-model:value="filters.scene" clearable placeholder="场景" style="width:140px"
              :options="(meta.scenes||[]).map(x=>({label:x.label,value:x.value}))" />
            <n-select v-model:value="filters.status" clearable placeholder="状态" style="width:120px"
              :options="[{label:'ready',value:'ready'},{label:'annotating',value:'annotating'},{label:'done',value:'done'}]" />
            <n-button type="primary" @click="() => { page.value = 1; load() }">查询</n-button>
          </div>
          <n-data-table :columns="lmTableCols1" :data="tasks"`,
    )
    s = s.replace(
      /<\/n-data-table>/,
      `</n-data-table>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="total"
              show-size-picker :page-sizes="[10,20,50]"
              @update:page="load" @update:page-size="() => { page.value = 1; load() }" />
          </div>`,
    )
  }
  // ensure load function name - CollectConfig uses load or similar
  if (!s.includes('async function load')) {
    // might be onMounted inline - check
  }
  return s
})

patch('E:/omp/vla/vla-demo-naive/src/views/train/AlgoConfig.vue', (s) => {
  if (!s.includes('const page = ref')) {
    s = s.replace(
      /const experiments = ref\(\[\]\)/,
      `const experiments = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const listFilters = reactive({ status: null, algorithm: null, keyword: '' })`,
    )
  }
  if (!s.includes('reactive') && s.includes('listFilters')) {
    s = s.replace(/import \{([^}]+)\} from 'vue'/, (m, inner) =>
      inner.includes('reactive') ? m : `import {${inner}, reactive} from 'vue'`,
    )
  }
  s = s.replace(
    'experiments.value = await listExperiments()',
    `const res = await listExperiments({ ...listFilters, page: page.value, pageSize: pageSize.value })
    experiments.value = res.items
    total.value = res.total
    page.value = res.page`,
  )
  if (!s.includes('n-pagination')) {
    s = s.replace(
      /<n-data-table :columns="lmTableCols1" :data="experiments"/,
      `<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
            <n-input v-model:value="listFilters.keyword" clearable placeholder="实验号/名称" style="width:180px" />
            <n-select v-model:value="listFilters.status" clearable placeholder="状态" style="width:130px"
              :options="[{label:'draft',value:'draft'},{label:'ready',value:'ready'},{label:'running',value:'running'},{label:'finished',value:'finished'}]" />
            <n-button type="primary" @click="() => { page.value = 1; load() }">查询</n-button>
          </div>
          <n-data-table :columns="lmTableCols1" :data="experiments"`,
    )
    s = s.replace(
      /<\/n-data-table>/,
      `</n-data-table>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="total"
              show-size-picker :page-sizes="[10,20,50]"
              @update:page="load" @update:page-size="() => { page.value = 1; load() }" />
          </div>`,
    )
  }
  return s
})

function patchPrelabelList(p, listCall, assignExpr) {
  patch(p, (s) => {
    if (!s.includes('const page = ref')) {
      s = s.replace(
        /(const (?:docs|list) = ref\(\[\]\))/,
        `$1
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)`,
      )
    }
    s = s.replace(
      assignExpr,
      `const res = await ${listCall}({ page: page.value, pageSize: pageSize.value })
  docsOrList.value = res.items
  total.value = res.total
  page.value = res.page`.replace('docsOrList', assignExpr.includes('docs.value') ? 'docs' : 'list'),
    )
    if (!s.includes('n-pagination')) {
      // append pagination after first n-data-table or near list UI - add at end of template root before style
      s = s.replace(
        '</template>',
        `  <div style="margin-top:12px;display:flex;justify-content:flex-end">
    <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="total"
      show-size-picker :page-sizes="[10,20,50]"
      @update:page="loadList" @update:page-size="() => { page.value = 1; loadList() }" />
  </div>
</template>`,
      )
    }
    return s
  })
}

patchPrelabelList(
  'E:/omp/vla/vla-demo-naive/src/views/prelabel/TextPrelabel.vue',
  'listTextDocs',
  'docs.value = await listTextDocs()',
)
patchPrelabelList(
  'E:/omp/vla/vla-demo-naive/src/views/prelabel/VisionPrelabel.vue',
  'listVisionImages',
  'list.value = await listVisionImages()',
)

// Fix CollectConfig / AlgoConfig load function names
for (const rel of ['src/views/vla/CollectConfig.vue', 'src/views/train/AlgoConfig.vue']) {
  const p = 'E:/omp/vla/vla-demo-naive/' + rel
  let s = fs.readFileSync(p, 'utf8')
  // If they use a differently named loader, alias
  if (s.includes('@update:page="load"') && !s.includes('async function load')) {
    // find the async function that loads list
    const m = s.match(/async function (\w+)\(\) \{\s*(?:loading[\s\S]*?)?(?:const res = await list)/)
    if (m && m[1] !== 'load') {
      s = s.replace(/@update:page="load"/g, `@update:page="${m[1]}"`)
      s = s.replace(/@update:page-size="\(\) => \{ page\.value = 1; load\(\) \}"/g, `@update:page-size="() => { page.value = 1; ${m[1]}() }"`)
      s = s.replace(/page\.value = 1; load\(\)/g, `page.value = 1; ${m[1]}()`)
      fs.writeFileSync(p, s)
      console.log('aliased load ->', m[1], rel)
    } else {
      console.log('load fn check', rel, !!m, m && m[1])
    }
  }
}