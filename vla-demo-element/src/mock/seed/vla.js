import { createPrng } from './prng'

function makeTrajectory(rng, frames = 24, dof = 7) {
  const joints = []
  const gripper = []
  const tSec = []
  for (let i = 0; i < frames; i += 1) {
    joints.push(
      Array.from({ length: dof }, (_, j) =>
        Number((rng.next() * 1.2 - 0.4 + j * 0.01).toFixed(4)),
      ),
    )
    gripper.push(Number(rng.next().toFixed(3)))
    tSec.push(Number((i / 10).toFixed(2)))
  }
  return { joints, gripper, tSec, hz: 10 }
}

/**
 * Element DataLink VLA episodes - independent seed; trajectory keys:
 * trajectory.{joints,gripper,tSec}
 */
export function seedVlaEpisodes(hand, seed = 0xD11A7E01) {
  const rng = createPrng(seed ^ 0x3333)
  const scenes = ['kitchen_counter', 'lab_bench', 'warehouse_bin', 'office_desk']
  const plans = ['pick_place_std', 'open_drawer', 'wipe_surface', 'sort_parts']
  const modes = ['teleop', 'scripted', 'human_demo', 'mixed']
  const statuses = ['ready', 'annotating', 'done']
  const videos = [1, 2, 3, 4, 5, 6].map((n) => ({
    videoUrl: `/samples/video/ep_0${n}.mp4`,
    imageUrl: `/samples/video/ep_0${n}_poster.jpg`,
  }))

  const out = hand.map((t, idx) => {
    const media = videos[idx % videos.length]
    const usesSharedBin =
      typeof t.videoUrl === 'string' && t.videoUrl.includes('bin_pick')
    return {
      ...t,
      trajectory: t.trajectory || makeTrajectory(rng, Math.min(30, t.totalFrames || 24)),
      videoUrl: usesSharedBin ? media.videoUrl : t.videoUrl,
      imageUrl: usesSharedBin ? media.imageUrl : t.imageUrl,
    }
  })

  const used = new Set(out.map((t) => t.id))
  let seq = out.length + 1
  while (out.length < 56) {
    const media = videos[(seq - 1) % videos.length]
    const frames = rng.int(80, 140)
    let id = `DL-VLA-2026-${String(seq).padStart(3, '0')}`
    while (used.has(id)) {
      seq += 1
      id = `DL-VLA-2026-${String(seq).padStart(3, '0')}`
    }
    used.add(id)
    const scene = rng.pick(scenes)
    const plan = rng.pick(plans)
    const mode = rng.pick(modes)
    const status = rng.pick(statuses)
    const day = rng.int(1, 4)
    out.push({
      id,
      name: `数联采集episode-${seq}`,
      scene,
      plan,
      mode,
      actionTemplateIds: ['tpl-reach', 'tpl-grasp', 'tpl-place'],
      personnelIds: [rng.pick(['u-dl-annotator', 'u-dl-annotator-2'])],
      instruction: `脱敏指令：完成 episode ${seq} 抓取放置。场景=${scene} 方案=${plan}`,
      videoUrl: media.videoUrl,
      imageUrl: media.imageUrl,
      fps: 10,
      totalFrames: frames,
      durationSec: Number((frames / 10).toFixed(1)),
      status,
      createdAt: `2026-11-0${day} ${String(rng.int(8, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      actions: [],
      issuesSeed: [],
      trajectory: makeTrajectory(rng, 24),
    })
    seq += 1
  }
  return out
}

export { makeTrajectory }

