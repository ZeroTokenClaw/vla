import { createPrng } from './prng'
import { MEDIA_MANIFEST } from './media-manifest.js'

function makeTelem(rng, frames = 24, dof = 7) {
  const qpos = []
  const grip = []
  const tsMs = []
  for (let i = 0; i < frames; i += 1) {
    qpos.push(
      Array.from({ length: dof }, (_, j) =>
        Number((rng.next() * 1.2 - 0.4 + j * 0.01).toFixed(4)),
      ),
    )
    grip.push(Number(rng.next().toFixed(3)))
    tsMs.push(i * 100)
  }
  return { qpos, grip, tsMs, hz: 10 }
}

/**
 * Orion VLA episodes - independent seed; trajectory keys:
 * telem.{qpos,grip,tsMs}
 * Media paths cycle ep_01..ep_06 (not a shared single mp4).
 */
export function seedVlaEpisodes(hand, seed = 0x02A10D01) {
  const rng = createPrng(seed ^ 0x3333)
  const scenes = ['aisle_pick', 'cold_lab', 'mezzanine', 'lobby_desk']
  const plans = ['pick_place_std', 'open_drawer', 'wipe_surface', 'sort_parts']
  const modes = ['teleop', 'scripted', 'human_demo', 'mixed']
  const statuses = ['ready', 'annotating', 'done']
  const videos = MEDIA_MANIFEST.videos.map((v) => ({
    videoUrl: v.path,
    imageUrl: v.poster,
    durationSec: v.durationSec,
  }))

  const sceneMap = {
    warehouse_bin: 'aisle_pick',
    kitchen_counter: 'lobby_desk',
    lab_bench: 'cold_lab',
    office_desk: 'mezzanine',
  }

  const out = hand.map((t, idx) => {
    const mappedScene = sceneMap[t.scene] || t.scene

    const media = videos[idx % videos.length]
    const usesSharedBin =
      typeof t.videoUrl === 'string' && t.videoUrl.includes('bin_pick')
    return {
      ...t,
      scene: mappedScene,
      telem: t.telem || makeTelem(rng, Math.min(30, t.totalFrames || 24)),
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
    let id = `ORN-VLA-2026-${String(seq).padStart(3, '0')}`
    while (used.has(id)) {
      seq += 1
      id = `ORN-VLA-2026-${String(seq).padStart(3, '0')}`
    }
    used.add(id)
    const scene = rng.pick(scenes)
    const plan = rng.pick(plans)
    const mode = rng.pick(modes)
    const status = rng.pick(statuses)
    const day = rng.int(1, 4)
    out.push({
      id,
      name: `Orion采集episode-${seq}`,
      scene,
      plan,
      mode,
      actionTemplateIds: ['tpl-reach', 'tpl-grasp', 'tpl-place'],
      personnelIds: [rng.pick(['u-orn-annotator', 'u-orn-annotator-2'])],
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
      telem: makeTelem(rng, 24),
    })
    seq += 1
  }
  return out
}

export { makeTelem }