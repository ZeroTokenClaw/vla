const fs = require('fs')

const patches = [
  ['src/views/prelabel/AcceptWizard.vue', 'jobs.value = await listAcceptJobs()', "jobs.value = (await listAcceptJobs({ page: 1, pageSize: 200 })).items"],
  ['src/views/qc/AuditPanel.vue', 'tasks.value = await listQcTasks()', "tasks.value = (await listQcTasks({ page: 1, pageSize: 200 })).items"],
  ['src/views/train/MetricsPanel.vue', 'experiments.value = await listExperiments()', "experiments.value = (await listExperiments({ page: 1, pageSize: 200 })).items"],
  ['src/views/train/TrainRunner.vue', 'experiments.value = await listExperiments()', "experiments.value = (await listExperiments({ page: 1, pageSize: 200 })).items"],
  ['src/views/vla/QualityGate.vue', 'taskList.value = await listVlaTasks()', "taskList.value = (await listVlaTasks({ page: 1, pageSize: 200 })).items"],
  ['src/views/vla/TimelineAnnotate.vue', 'taskList.value = await listVlaTasks()', "taskList.value = (await listVlaTasks({ page: 1, pageSize: 200 })).items"],
]

for (const [rel, from, to] of patches) {
  const p = 'E:/omp/vla/vla-demo-naive/' + rel
  let s = fs.readFileSync(p, 'utf8')
  if (!s.includes(from)) {
    console.log('MISS', rel, from)
    // show nearby
    s.split('\n').forEach((l,i)=>{ if(/listAccept|listQc|listExp|listVla/.test(l)) console.log(' ', i+1, l.trim()) })
    continue
  }
  s = s.replace(from, to)
  fs.writeFileSync(p, s)
  console.log('fixed', rel)
}