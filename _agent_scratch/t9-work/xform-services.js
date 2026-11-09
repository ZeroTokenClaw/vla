const fs = require('fs')
const path = require('path')

function xformSvc(s) {
  return s
    .replace(/LingMou/g, 'StarCompute')
    .replace(/灵眸/g, '星算')
    .replace(/\[lingmou\]/g, '[starcompute]')
    .replace(/u-lm-/g, 'u-sc-')
    .replace(/LM-TXT-/g, 'SC-TXT-')
    .replace(/LM-IMG-/g, 'SC-IMG-')
    .replace(/LM-ACC-/g, 'SC-ACC-')
    .replace(/LM-VLA-/g, 'SC-VLA-')
    .replace(/LM-EXP-/g, 'SC-EXP-')
    .replace(/`LM-/g, '`SC-')
    .replace(/URGENCIES/g, 'SLA_CLASSES')
    .replace(/LANES/g, 'TENANTS')
    .replace(/\burgencies\b/g, 'slaClasses')
    .replace(/\blanes\b/g, 'tenants')
    .replace(/\burgency\b/g, 'slaClass')
    .replace(/\blane\b/g, 'tenantCode')
    .replace(/bounceLog/g, 'reworkTrail')
    .replace(/\bsquad\b/g, 'pool')
    .replace(/stove_top/g, 'pack_station')
    .replace(/clean_bench/g, 'chem_hood')
    .replace(/tote_wall/g, 'sku_cage')
    .replace(/dual_monitor/g, 'sit_stand')
    .replace(/\bsignal\b/g, 'stream')
    .replace(/\bdof\b/g, 'joints')
    .replace(/\bclaw\b/g, 'eeOpen')
    .replace(/\bcorpora\b/g, 'repos')
    .replace(/\bsnapshots\b/g, 'weights')
    .replace(/\bscoreSheet\b/g, 'evalSheet')
    .replace(/\bmixMatrix\b/g, 'errorGrid')
    .replace(/\bconsoleLines\b/g, 'trainLog')
    .replace(/\.logs\b/g, '.trainLog')
    .replace(/logs:/g, 'trainLog:')
    .replace(/exp\.logs/g, 'exp.trainLog')
}

const srcDir = 'E:/omp/vla/vla-demo-naive/src/services'
const dstDir = 'E:/omp/vla/vla-demo-arco/src/services'

for (const f of ['qc.js', 'vla.js', 'train.js', 'prelabel.js']) {
  let s = fs.readFileSync(path.join(srcDir, f), 'utf8')
  s = xformSvc(s)
  // listMeta users field
  s = s.replace(/dept: u\.pool/g, 'pool: u.pool')
  s = s.replace(/dept: u\.dept/g, 'pool: u.pool')
  // Fix createQcTask defaults
  s = s.replace("slaClass: payload.slaClass || 'normal'", "slaClass: payload.slaClass || 'A'")
  s = s.replace("tenantCode: payload.tenantCode || 'lane-alpha'", "tenantCode: payload.tenantCode || 'tn-sc-01'")
  s = s.replace("tenantCode: payload.tenantCode || 'tn-sc-01'", "tenantCode: payload.tenantCode || 'tn-sc-01'")
  // Fix export lists
  s = s.replace(
    'export { SAMPLE_RESOURCES, MODALITIES, STATUS_FLOW, REJECT_REASONS, SLA_CLASSES, TENANTS, TRANSITIONS }',
    'export { SAMPLE_RESOURCES, MODALITIES, STATUS_FLOW, REJECT_REASONS, SLA_CLASSES, TENANTS, TRANSITIONS }',
  )
  fs.writeFileSync(path.join(dstDir, f), s)
  console.log('svc', f, s.length)
}

console.log('services copied+xformed from naive')
