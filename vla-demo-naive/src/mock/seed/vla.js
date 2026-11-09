import { createPrng } from './prng'
import { MEDIA_MANIFEST } from './media-manifest.js'

function makeSignal(rng, frames = 24, dofCount = 7) {
  const dof = []
  const claw = []
  const t = []
  for (let i = 0; i < frames; i += 1) {
    dof.push(
      Array.from({ length: dofCount }, (_, j) =>
        Number((rng.next() * 1.2 - 0.4 + j * 0.01).toFixed(4)),
      ),
    )
    claw.push(Number(rng.next().toFixed(3)))
    t.push(i * 100)
  }
  return { dof, claw, t, hz: 10 }
}

/**
 * LingMou VLA episodes - independent seed; trajectory keys:
 * signal.{dof,claw,t}
 * Media paths cycle ep_01..ep_06 (not a shared single mp4).
 */
export function seedVlaEpisodes(hand, seed = 0x11A10E01) {
  const rng = createPrng(seed ^ 0x3333)
  const scenes = ['stove_top', 'clean_bench', 'tote_wall', 'dual_monitor']
  const plans = ['pick_place_std', 'open_drawer', 'wipe_surface', 'sort_parts']
  const modes = ['teleop', 'scripted', 'human_demo', 'mixed']
  const statuses = ['ready', 'annotating', 'done']
  const videos = MEDIA_MANIFEST.videos.map((v) => ({
    videoUrl: v.path,
    imageUrl: v.poster,
    durationSec: v.durationSec,
  }))

  const sceneMap = {
    warehouse_bin: 'tote_wall',
    kitchen_counter: 'stove_top',
    lab_bench: 'clean_bench',
    office_desk: 'dual_monitor',
  }

  const out = hand.map((t, idx) => {
    const mappedScene = sceneMap[t.scene] || t.scene

    const media = videos[idx % videos.length]
    const usesSharedBin =
      typeof t.videoUrl === 'string' && t.videoUrl.includes('bin_pick')
    return {
      ...t,
      scene: mappedScene,
      signal: t.signal || makeSignal(rng, Math.min(30, t.totalFrames || 24)),
      videoUrl: usesSharedBin ? media.videoUrl : t.videoUrl,
      imageUrl: usesSharedBin ? media.imageUrl : t.imageUrl,
      durationSec: usesSharedBin ? media.durationSec : (t.durationSec ?? media.durationSec),
    }
  })

  const used = new Set(out.map((t) => t.id))
  let seq = out.length + 1
  while (out.length < 56) {
    const media = videos[(seq - 1) % videos.length]
    const frames = rng.int(80, 140)
    let id = `LM-VLA-2026-${String(seq).padStart(3, '0')}`
    while (used.has(id)) {
      seq += 1
      id = `LM-VLA-2026-${String(seq).padStart(3, '0')}`
    }
    used.add(id)
    const scene = rng.pick(scenes)
    const plan = rng.pick(plans)
    const mode = rng.pick(modes)
    const status = rng.pick(statuses)
    const day = rng.int(1, 4)
    out.push({
      id,
      name: `LingMou采集episode-${seq}`,
      deviceIds: rng.next() > 0.5 ? ['DEV-LM-CAM-01'] : [],
      targetCount: rng.int(10, 40),
      collectedCount: rng.int(0, 15),
      dataTypes: ['video', 'action'],
      qualityRequirement: '画面稳定、关键帧清晰',
      scene,
      plan,
      mode,
      actionTemplateIds: ['tpl-reach', 'tpl-grasp', 'tpl-place'],
      personnelIds: [rng.pick(['u-lm-annotator', 'u-lm-annotator-2'])],
      instruction: `脱敏指令：完成 episode ${seq} 抓取放置。场景=${scene} 方案=${plan}`,
      videoUrl: media.videoUrl,
      imageUrl: media.imageUrl,
      fps: 10,
      totalFrames: frames,
      durationSec: media.durationSec,
      status,
      createdAt: `2026-11-0${day} ${String(rng.int(8, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      actions: [],
      issuesSeed: [],
      signal: makeSignal(rng, 24),
    })
    seq += 1
  }
  return out
}

export { makeSignal }