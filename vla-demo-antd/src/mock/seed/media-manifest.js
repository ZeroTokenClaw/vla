/** Orion desensitized media manifest. Binary files from scripts/generate-samples.mjs */
export const MEDIA_MANIFEST = {
  brand: 'Orion',
  images: [1, 2, 3, 4, 5, 6].map((i) => ({
    path: `/samples/images/scene_0${i}.jpg`,
    w: 640,
    h: 360,
  })),
  videos: [
    { path: '/samples/video/ep_01.mp4', poster: '/samples/video/ep_01_poster.jpg', durationSec: 2 },
    { path: '/samples/video/ep_02.mp4', poster: '/samples/video/ep_02_poster.jpg', durationSec: 3 },
    { path: '/samples/video/ep_03.mp4', poster: '/samples/video/ep_03_poster.jpg', durationSec: 4 },
    { path: '/samples/video/ep_04.mp4', poster: '/samples/video/ep_04_poster.jpg', durationSec: 2 },
    { path: '/samples/video/ep_05.mp4', poster: '/samples/video/ep_05_poster.jpg', durationSec: 3 },
    { path: '/samples/video/ep_06.mp4', poster: '/samples/video/ep_06_poster.jpg', durationSec: 4 },
  ],
  audios: [
    { path: '/samples/audio/clip_01.wav', durationSec: 1.1, waveform: '/samples/audio/clip_01_wave.png' },
    { path: '/samples/audio/clip_02.wav', durationSec: 1.2, waveform: '/samples/audio/clip_02_wave.png' },
    { path: '/samples/audio/clip_03.wav', durationSec: 1.3, waveform: '/samples/audio/clip_03_wave.png' },
  ],
  /** Kept for QC / hand-row compatibility; new episodes must not all share one mp4. */
  legacy: {
    images: ['/samples/images/desk_seg.jpg', '/samples/images/desk_grasp.jpg'],
    video: {
      videoUrl: '/samples/video/bin_pick.mp4',
      posterUrl: '/samples/video/bin_pick_poster.jpg',
    },
    audio: {
      audioUrl: '/samples/audio/instruction.wav',
      waveformUrl: '/samples/audio/instruction_wave.png',
    },
    pointcloud: ['/samples/pointcloud/desk_pc.png'],
  },
}

/** Pick diversified media by modality index (cycles ep_01..06 / scene_01..06 / clip_01..03). */
export function pickMedia(modality, index = 0) {
  if (modality === 'seg') {
    const images = MEDIA_MANIFEST.images
    const img = images[index % images.length]
    return { imageUrl: img.path }
  }
  if (modality === 'video_det') {
    const videos = MEDIA_MANIFEST.videos
    const v = videos[index % videos.length]
    return { videoUrl: v.path, posterUrl: v.poster, durationSec: v.durationSec }
  }
  if (modality === 'audio_slice') {
    const audios = MEDIA_MANIFEST.audios
    const a = audios[index % audios.length]
    return { audioUrl: a.path, waveformUrl: a.waveform, durationSec: a.durationSec }
  }
  if (modality === 'point_seg') {
    const pcs = MEDIA_MANIFEST.legacy.pointcloud
    return { previewUrl: pcs[index % pcs.length] }
  }
  return {}
}
