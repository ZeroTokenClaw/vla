import { createPrng } from './prng'
import { MEDIA_MANIFEST } from './media-manifest.js'

function makeStream(rng, frames = 24, dofCount = 7) {
  const joints = []
  const eeOpen = []
  const t = []
  for (let i = 0; i < frames; i += 1) {
    joints.push(
      Array.from({ length: dofCount }, (_, j) =>
        Number((rng.next() * 1.2 - 0.4 + j * 0.01).toFixed(4)),
      ),
    )
    eeOpen.push(Number(rng.next().toFixed(3)))
    t.push(i * 100)
  }
  return { joints, eeOpen, stamp: t, hz: 10 }
}

/**
 * StarCompute VLA episodes - independent seed; trajectory keys:
 * stream.{joints,eeOpen,stamp}
 * Media paths cycle ep_01..ep_06 (not a shared single mp4).
 */
export function seedVlaEpisodes(hand, seed = 0x5C010001) {
  const rng = createPrng(seed ^ 0x3333)
  const scenes = ['pack_station', 'chem_hood', 'sku_cage', 'sit_stand']
  const plans = ['pick_place_std', 'open_drawer', 'wipe_surface', 'sort_parts']
  const modes = ['teleop', 'scripted', 'human_demo', 'mixed']
  const statuses = ['ready', 'annotating', 'done']
  const videos = MEDIA_MANIFEST.videos.map((v) => ({
    videoUrl: v.path,
    imageUrl: v.poster,
    durationSec: v.durationSec,
  }))

  const sceneMap = {
    warehouse_bin: 'sku_cage',
    kitchen_counter: 'pack_station',
    lab_bench: 'chem_hood',
    office_desk: 'sit_stand',
  }

  const out = hand.map((t, idx) => {
    const mappedScene = sceneMap[t.scene] || t.scene

    const media = videos[idx % videos.length]
    const usesSharedBin =
      typeof t.videoUrl === 'string' && t.videoUrl.includes('bin_pick')
    return {
      ...t,
      scene: mappedScene,
      stream: t.stream || makeStream(rng, Math.min(30, t.totalFrames || 24)),
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
    let id = `SC-VLA-2026-${String(seq).padStart(3, '0')}`
    while (used.has(id)) {
      seq += 1
      id = `SC-VLA-2026-${String(seq).padStart(3, '0')}`
    }
    used.add(id)
    const scene = rng.pick(scenes)
    const plan = rng.pick(plans)
    const mode = rng.pick(modes)
    const status = rng.pick(statuses)
    const day = rng.int(1, 4)
    out.push({
      id,
      name: `StarCompute采集episode-${seq}`,
      scene,
      plan,
      mode,
      actionTemplateIds: ['tpl-reach', 'tpl-grasp', 'tpl-place'],
      personnelIds: [rng.pick(['u-sc-annotator', 'u-sc-annotator-2'])],
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
      stream: makeStream(rng, 24),
    })
    seq += 1
  }
  return out
}

export { makeStream }