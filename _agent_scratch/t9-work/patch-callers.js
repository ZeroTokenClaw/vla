const fs = require('fs')
const path = require('path')

const root = 'E:/omp/vla/vla-demo-arco/src/views'

function patchFile(rel, fn) {
  const p = path.join(root, rel)
  let s = fs.readFileSync(p, 'utf8')
  const before = s
  s = fn(s)
  if (s !== before) {
    fs.writeFileSync(p, s)
    console.log('patched', rel)
  } else {
    console.log('nochange', rel)
  }
}

// Generic: array-returning list calls -> .items with large pageSize
const arrayCallers = [
  ['qc/AnnotateWorkbench.vue', /taskList\.value = await listQcTasks\(\)/g, "taskList.value = (await listQcTasks({ page: 1, pageSize: 200 })).items"],
  ['qc/AuditPanel.vue', /tasks\.value = await listQcTasks\(\)/g, "tasks.value = (await listQcTasks({ page: 1, pageSize: 200 })).items"],
  ['qc/SampleCheck.vue', /pool\.value = await listSamplePool\(\)/g, "pool.value = (await listSamplePool({ page: 1, pageSize: 200 })).items"],
  ['qc/WorkflowBoard.vue', /tasks\.value = await listQcTasks\(\)/g, "tasks.value = (await listQcTasks({ page: 1, pageSize: 200 })).items"],
  ['qc/WorkflowBoard.vue', /\(await listQcTasks\(\)\)\.find/g, "(await listQcTasks({ page: 1, pageSize: 200 })).items.find"],
  ['vla/QualityGate.vue', /taskList\.value = await listVlaTasks\(\)/g, "taskList.value = (await listVlaTasks({ page: 1, pageSize: 200 })).items"],
  ['vla/TimelineAnnotate.vue', /taskList\.value = await listVlaTasks\(\)/g, "taskList.value = (await listVlaTasks({ page: 1, pageSize: 200 })).items"],
  ['train/MetricsPanel.vue', /experiments\.value = await listExperiments\(\)/g, "experiments.value = (await listExperiments({ page: 1, pageSize: 200 })).items"],
  ['train/TrainRunner.vue', /experiments\.value = await listExperiments\(\)/g, "experiments.value = (await listExperiments({ page: 1, pageSize: 200 })).items"],
  ['prelabel/AcceptWizard.vue', /jobs\.value = await listAcceptJobs\(\)/g, "jobs.value = (await listAcceptJobs({ page: 1, pageSize: 200 })).items"],
]

for (const [rel, re, rep] of arrayCallers) {
  patchFile(rel, (s) => s.replace(re, rep))
}

// dept -> pool in templates
for (const rel of ['vla/CollectConfig.vue', 'qc/QcTaskList.vue']) {
  patchFile(rel, (s) => s.replace(/u\.dept/g, 'u.pool').replace(/\$\{u\.dept\}/g, '${u.pool}').replace(/（\$\{u\.dept\}）/g, '（${u.pool}）'))
}

// TrainRunner logs -> trainLog
patchFile('train/TrainRunner.vue', (s) =>
  s.replace(/exp\.logs/g, 'exp.trainLog').replace(/\(exp\.logs \|\|/g, '(exp.trainLog ||'),
)

console.log('caller patches done')
