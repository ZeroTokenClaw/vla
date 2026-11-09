const fs = require('fs')
const path = require('path')
const src = 'E:/omp/vla/vla-demo-antd/src/mock/seed'
const dst = 'E:/omp/vla/vla-demo-naive/src/mock/seed'

function xform(s) {
  return s
    .replace(/0x02A10D01/g, '0x11A10E01')
    .replace(/Orion/g, 'LingMou')
    .replace(/u-orn-/g, 'u-lm-')
    .replace(/ORN-JOB-/g, 'LM-')
    .replace(/ORN-TXT-/g, 'LM-TXT-')
    .replace(/ORN-IMG-/g, 'LM-IMG-')
    .replace(/ORN-ACC-/g, 'LM-ACC-')
    .replace(/ORN-VLA-/g, 'LM-VLA-')
    .replace(/ORN-EXP-/g, 'LM-EXP-')
    .replace(/ORN-ORD-/g, 'LM-ORD-')
    .replace(/SPL-ORN-/g, 'SPL-LM-')
    .replace(/CAT-ORN-/g, 'CAT-LM-')
    .replace(/SEVERITIES/g, 'URGENCIES')
    .replace(/WORKSPACES/g, 'LANES')
    .replace(/\['P0', 'P1', 'P2'\]/g, "['urgent', 'normal', 'backlog']")
    .replace(/\['ws-sg', 'ws-eu', 'ws-us'\]/g, "['lane-alpha', 'lane-beta', 'lane-gamma']")
    .replace(/severity/g, 'urgency')
    .replace(/workspace/g, 'lane')
    .replace(/rejectionTrail/g, 'bounceLog')
    .replace(/reviewerId/g, 'by')
    .replace(/aisle_pick/g, 'stove_top')
    .replace(/cold_lab/g, 'clean_bench')
    .replace(/mezzanine/g, 'tote_wall')
    .replace(/lobby_desk/g, 'dual_monitor')
    .replace(/warehouse_bin/g, 'tote_wall')
    .replace(/kitchen_counter/g, 'stove_top')
    .replace(/lab_bench/g, 'clean_bench')
    .replace(/office_desk/g, 'dual_monitor')
    .replace(/\btelem\b/g, 'signal')
    .replace(/\bqpos\b/g, 'dof')
    .replace(/\bgrip\b/g, 'claw')
    .replace(/\btsMs\b/g, 't')
    .replace(/makeTelem/g, 'makeSignal')
    .replace(/\bcatalog\b/g, 'corpora')
    .replace(/\bfold\b/g, 'part')
    .replace(/\brev\b/g, 'tag')
    .replace(/\bckptList\b/g, 'snapshots')
    .replace(/\bevalGrid\b/g, 'scoreSheet')
    .replace(/\bcmMatrix\b/g, 'mixMatrix')
    .replace(/\brunLog\b/g, 'consoleLines')
    .replace(/longRunLog/g, 'longConsoleLines')
}

for (const f of ['qc.js', 'prelabel.js', 'vla.js', 'train.js']) {
  let s = fs.readFileSync(path.join(src, f), 'utf8')
  s = xform(s)
  if (f === 'qc.js') {
    s = s.replace(
      /code: 'label_miss'\s*\}/,
      "code: 'label_wrong', note: '边界漂移' }",
    )
    s = s.replace(
      /code: t\.rejectReason \|\| 'label_miss' \}/,
      "code: t.rejectReason || 'label_miss', note: '边界漂移' }",
    )
    s = s.replace(
      /`LM-2026-\$\{String\(seq\)\.padStart\(3, '0'\)\}`/g,
      "`LM-2026-${String(seq).padStart(4, '0')}`",
    )
  }
  if (f === 'train.js') {
    // After rename, enrichExperiment may still need to strip legacy keys from hand rows
    s = s.replace(
      /const \{ datasets, checkpoints, valTable, confusionMatrix, logs, \.\.\.rest \} = e/,
      'const { datasets, checkpoints, valTable, confusionMatrix, logs, ...rest } = e',
    )
  }
  if (f === 'vla.js') {
    // sceneMap keys were remapped already; rebuild a clean sceneMap for residual Element names
    s = s.replace(
      /const sceneMap = \{[\s\S]*?\n  \}/,
      `const sceneMap = {
    warehouse_bin: 'tote_wall',
    kitchen_counter: 'stove_top',
    lab_bench: 'clean_bench',
    office_desk: 'dual_monitor',
  }`,
    )
  }
  fs.writeFileSync(path.join(dst, f), s)
  console.log(f, s.length)
}
console.log('seed domain files written')