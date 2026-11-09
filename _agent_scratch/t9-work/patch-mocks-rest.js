const fs = require('fs')

// ---------- vla mock ----------
let vla = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/vla.js', 'utf8')
if (!vla.includes("from './seed/vla'")) {
  vla = "import { seedVlaEpisodes } from './seed/vla'\n" + vla
}
vla = vla.replace(
  /export const SCENE_OPTIONS = \[[\s\S]*?\]/,
  `export const SCENE_OPTIONS = [
  { value: 'pack_station', label: '打包工位' },
  { value: 'chem_hood', label: '化学通风橱' },
  { value: 'sku_cage', label: 'SKU 笼车' },
  { value: 'sit_stand', label: '升降工位' },
]`,
)
vla = vla.replace(
  '/** Seed collect tasks with linked multimodal assets + action spans. */\nexport const VLA_TASKS = [',
  `/** Seed collect tasks with linked multimodal assets + action spans. */
const VLA_HAND = [`,
)
if (!vla.includes('const VLA_HAND')) {
  vla = vla.replace('export const VLA_TASKS = [', 'const VLA_HAND = [')
}
if (!vla.includes('seedVlaEpisodes(VLA_HAND)')) {
  vla = vla.replace(
    /(\n\])\n\nexport function nextVlaId/,
    `$1

function buildVlaTasks() {
  try {
    return seedVlaEpisodes(VLA_HAND)
  } catch (e) {
    console.error('[starcompute] vla seed failed, fallback thin', e)
    return VLA_HAND.map((t) => ({ ...t, stream: t.stream || { joints: [], eeOpen: [], stamp: [], hz: 10 } }))
  }
}

export const VLA_TASKS = buildVlaTasks()

export function nextVlaId`,
  )
}
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/vla.js', vla)
console.log('vla', vla.includes('seedVlaEpisodes'), vla.includes('pack_station'), !vla.includes('kitchen_counter'))

// ---------- prelabel mock ----------
let pre = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/prelabel.js', 'utf8')
if (!pre.includes("from './seed/prelabel'")) {
  pre = "import { seedTextDocs, seedVisionImages, seedAcceptJobs } from './seed/prelabel'\n" + pre
}
pre = pre.replace('export const TEXT_DOCS = [', 'const TEXT_HAND = [')
pre = pre.replace('export const VISION_IMAGES = [', 'const VISION_HAND = [')
if (!pre.includes('export const TEXT_DOCS')) {
  pre = pre.replace(
    /\nexport const ACCEPT_STEPS = \[/,
    `
export const TEXT_DOCS = (() => {
  try { return seedTextDocs(TEXT_HAND) } catch (e) {
    console.error('[starcompute] text seed failed', e); return TEXT_HAND
  }
})()

export const VISION_IMAGES = (() => {
  try { return seedVisionImages(VISION_HAND) } catch (e) {
    console.error('[starcompute] vision seed failed', e); return VISION_HAND
  }
})()

export const ACCEPT_STEPS = [`,
  )
}
if (!pre.includes('seedAcceptJobs(hand)')) {
  pre = pre.replace(
    /export function createAcceptJobs\(\) \{\n  return \[/,
    `export function createAcceptJobs() {
  const hand = [`,
  )
  pre = pre.replace(
    /(\n  \])\n\}\s*$/,
    `$1
  try {
    return seedAcceptJobs(hand)
  } catch (e) {
    console.error('[starcompute] accept seed failed', e)
    return hand
  }
}
`,
  )
}
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/prelabel.js', pre)
console.log('prelabel', pre.includes('seedTextDocs'), pre.includes('export const TEXT_DOCS'), pre.includes('seedAcceptJobs'))

// ---------- train mock ----------
let tr = fs.readFileSync('E:/omp/vla/vla-demo-arco/src/mock/train.js', 'utf8')
if (!tr.includes("from './seed/train'")) {
  tr = "import { seedExperiments } from './seed/train'\n" + tr
}
tr = tr.replace('/** Seed experiments with SC-EXP- prefix */\nexport const EXPERIMENTS = [', '/** Seed experiments with SC-EXP- prefix */\nconst EXP_HAND = [')
if (!tr.includes('const EXP_HAND')) {
  tr = tr.replace('export const EXPERIMENTS = [', 'const EXP_HAND = [')
}
if (!tr.includes('seedExperiments(EXP_HAND)')) {
  tr = tr.replace(
    /(\n\])\n\nexport function nextExpId/,
    `$1

function buildExperiments() {
  try {
    return seedExperiments(EXP_HAND)
  } catch (e) {
    console.error('[starcompute] train seed failed, fallback thin', e)
    return EXP_HAND.map((e) => ({
      ...e,
      repos: e.repos || [],
      weights: e.weights || [],
      evalSheet: e.evalSheet || [],
      errorGrid: e.errorGrid || [],
      trainLog: e.trainLog || e.logs || [],
    }))
  }
}

export const EXPERIMENTS = buildExperiments()

export function nextExpId`,
  )
}
fs.writeFileSync('E:/omp/vla/vla-demo-arco/src/mock/train.js', tr)
console.log('train', tr.includes('seedExperiments'), tr.includes('EXP_HAND'))
