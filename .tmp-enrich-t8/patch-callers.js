const fs = require('fs')

// Fix QcTaskList page assignment
let q = fs.readFileSync('E:/omp/vla/vla-demo-naive/src/views/qc/QcTaskList.vue', 'utf8')
q = q.replace(
  `@update:page-size="() => { page = 1; load() }"`,
  `@update:page-size="() => { page.value = 1; load() }"`,
)
fs.writeFileSync('E:/omp/vla/vla-demo-naive/src/views/qc/QcTaskList.vue', q)

function patch(p, fn) {
  let s = fs.readFileSync(p, 'utf8')
  fs.writeFileSync(p, fn(s))
  console.log('ok', p.split('naive/')[1])
}

// WorkflowBoard + AnnotateWorkbench: use pageSize 200 .items
for (const rel of [
  'src/views/qc/WorkflowBoard.vue',
  'src/views/qc/AnnotateWorkbench.vue',
]) {
  patch('E:/omp/vla/vla-demo-naive/' + rel, (s) => {
    s = s.replace(/await listQcTasks\(\)/g, "await listQcTasks({ page: 1, pageSize: 200 })")
    s = s.replace(
      /tasks\.value = await listQcTasks\(\{ page: 1, pageSize: 200 \}\)/g,
      "tasks.value = (await listQcTasks({ page: 1, pageSize: 200 })).items",
    )
    s = s.replace(
      /taskList\.value = await listQcTasks\(\{ page: 1, pageSize: 200 \}\)/g,
      "taskList.value = (await listQcTasks({ page: 1, pageSize: 200 })).items",
    )
    // find patterns like (await listQcTasks(...)).find
    s = s.replace(
      /\(await listQcTasks\(\{ page: 1, pageSize: 200 \}\)\)\.find/g,
      "(await listQcTasks({ page: 1, pageSize: 200 })).items.find",
    )
    // also catch already-double .items.items
    s = s.replace(/\.items\.items/g, '.items')
    return s
  })
}

// SampleCheck if uses listSamplePool as array
const samplePath = 'E:/omp/vla/vla-demo-naive/src/views/qc/SampleCheck.vue'
if (fs.existsSync(samplePath)) {
  patch(samplePath, (s) => {
    if (s.includes('listSamplePool')) {
      s = s.replace(
        /(?:const|let)\s+(\w+)\s*=\s*await listSamplePool\(([^)]*)\)/g,
        (m, varName, args) => {
          if (m.includes('.items')) return m
          return `const __pool = await listSamplePool(${args || '{ page: 1, pageSize: 200 }'})\n  const ${varName} = __pool.items || __pool`
        },
      )
      // simpler common patterns
      s = s.replace(
        /samples\.value = await listSamplePool\(/g,
        "samples.value = (await listSamplePool(",
      )
      // This might be incomplete - check later
    }
    return s
  })
}

// TrainRunner logs -> consoleLines
patch('E:/omp/vla/vla-demo-naive/src/views/train/TrainRunner.vue', (s) => {
  return s.replace(/exp\.logs/g, 'exp.consoleLines')
})

console.log('callers patched')