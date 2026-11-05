import { createPrng } from './prng'

/**
 * Merge hand-written showcase text docs with seeded bulk (>=56).
 * Preserves intentional Diff rows (e.g. DL-TXT-2026-001 te4→ORG).
 */
export function seedTextDocs(hand, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x1111)
  const out = hand.map((d) => ({
    ...d,
    progressPct: d.progressPct ?? 100,
    spotCheckPass: d.spotCheckPass ?? true,
  }))
  const used = new Set(out.map((d) => d.id))
  let i = 100
  while (out.length < 56) {
    i += 1
    let id = `DL-TXT-2026-${String(i).padStart(3, '0')}`
    while (used.has(id)) {
      i += 1
      id = `DL-TXT-2026-${String(i).padStart(3, '0')}`
    }
    used.add(id)
    out.push({
      id,
      title: `数联预标文本批次样例-${i}`,
      batchId: `PRE-BATCH-T${String(rng.int(1, 12)).padStart(2, '0')}`,
      status: rng.pick(['ready', 'running', 'corrected', 'accepted']),
      progressPct: rng.int(0, 100),
      spotCheckPass: rng.pick([true, true, false]),
      rawText: `脱敏工单正文 seed-${i}：订单 DL-ORD-${8000 + i} 状态咨询。`,
      model: {
        classify: {
          label: rng.pick(['咨询-进度', '投诉-物流延误', '其他']),
          conf: 0.7 + rng.next() * 0.2,
        },
        entities: [
          {
            id: `te-s-${i}`,
            text: `DL-ORD-${8000 + i}`,
            type: 'ORDER_ID',
            start: 10,
            end: 22,
            conf: 0.9,
          },
        ],
        relations: [],
        structured: {
          orderId: `DL-ORD-${8000 + i}`,
          customer: '某用户',
          issue: '咨询',
          channel: '在线',
        },
      },
      goldHint: {},
    })
  }
  return out
}

/**
 * Merge hand vision images with seeded bulk (>=56).
 * Preserves intentional Diff (e.g. y3→tool on DL-IMG-2026-001).
 */
export function seedVisionImages(hand, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x2222)
  const scenes = [
    'scene_01.jpg',
    'scene_02.jpg',
    'scene_03.jpg',
    'scene_04.jpg',
    'scene_05.jpg',
    'scene_06.jpg',
  ]
  const out = hand.map((d) => ({
    ...d,
    batchId: d.batchId ?? 'PRE-BATCH-V01',
    progressPct: d.progressPct ?? 100,
    spotCheckPass: d.spotCheckPass ?? true,
  }))
  const used = new Set(out.map((d) => d.id))
  let i = 100
  while (out.length < 56) {
    i += 1
    let id = `DL-IMG-2026-${String(i).padStart(3, '0')}`
    while (used.has(id)) {
      i += 1
      id = `DL-IMG-2026-${String(i).padStart(3, '0')}`
    }
    used.add(id)
    const img = rng.pick(scenes)
    out.push({
      id,
      title: `数联预标视觉样例-${i}`,
      batchId: `PRE-BATCH-V${String(rng.int(1, 8)).padStart(2, '0')}`,
      imageUrl: `/samples/images/${img}`,
      width: 640,
      height: 400,
      status: rng.pick(['ready', 'running', 'corrected']),
      progressPct: rng.int(0, 100),
      spotCheckPass: rng.pick([true, false]),
      ocrModel: [
        {
          id: `o-s-${i}`,
          text: `TAG-${i}`,
          x: 0.1,
          y: 0.1,
          w: 0.2,
          h: 0.08,
          conf: 0.8,
        },
      ],
      yoloModel: [
        {
          id: `y-s-${i}`,
          label: rng.pick(['cup', 'plate', 'tray']),
          x: 0.2,
          y: 0.2,
          w: 0.2,
          h: 0.2,
          conf: 0.85,
        },
      ],
      labelSet: ['cup', 'plate', 'hand', 'tray', 'tool', 'table', 'other'],
    })
  }
  return out
}

/**
 * Expand accept wizard jobs to >=20 for paginated demo.
 * Keeps hand showcase IDs (DL-ACC-2026-001..003).
 */
export function seedAcceptJobs(hand, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x3333)
  const out = hand.map((j) => ({ ...j, stepDone: [...(j.stepDone || [])] }))
  const used = new Set(out.map((j) => j.id))
  const steps = ['confirm', 'annotate', 'qa', 'accept']
  let i = 100
  while (out.length < 24) {
    i += 1
    let id = `DL-ACC-2026-${String(i).padStart(3, '0')}`
    while (used.has(id)) {
      i += 1
      id = `DL-ACC-2026-${String(i).padStart(3, '0')}`
    }
    used.add(id)
    const step = rng.pick(steps)
    const stepIdx = steps.indexOf(step)
    const sourceType = rng.pick(['text', 'vision'])
    out.push({
      id,
      title: `数联预标验收 · seed-${i}`,
      sourceType,
      sourceId:
        sourceType === 'text'
          ? `DL-TXT-2026-${String(rng.int(101, 140)).padStart(3, '0')}`
          : `DL-IMG-2026-${String(rng.int(101, 140)).padStart(3, '0')}`,
      step,
      stepDone: steps.slice(0, stepIdx),
      qaNote: '',
      acceptedAt: null,
      acceptedBy: null,
      status: step === 'accept' && rng.next() > 0.7 ? 'accepted' : 'in_progress',
    })
  }
  return out
}