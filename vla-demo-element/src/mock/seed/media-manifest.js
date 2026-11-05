/** Path-only manifest; binary media generated in enrichment Task 6. */
export const MEDIA_MANIFEST = {
  images: [
    '/samples/images/desk_seg.jpg',
    '/samples/images/scene_01.jpg',
    '/samples/images/scene_02.jpg',
    '/samples/images/scene_03.jpg',
    '/samples/images/scene_04.jpg',
    '/samples/images/scene_05.jpg',
    '/samples/images/scene_06.jpg',
  ],
  video: [
    { videoUrl: '/samples/video/bin_pick.mp4', posterUrl: '/samples/video/bin_pick_poster.jpg' },
    { videoUrl: '/samples/video/ep_01.mp4', posterUrl: '/samples/video/ep_01_poster.jpg' },
    { videoUrl: '/samples/video/ep_02.mp4', posterUrl: '/samples/video/ep_02_poster.jpg' },
    { videoUrl: '/samples/video/ep_03.mp4', posterUrl: '/samples/video/ep_03_poster.jpg' },
    { videoUrl: '/samples/video/ep_04.mp4', posterUrl: '/samples/video/ep_04_poster.jpg' },
    { videoUrl: '/samples/video/ep_05.mp4', posterUrl: '/samples/video/ep_05_poster.jpg' },
    { videoUrl: '/samples/video/ep_06.mp4', posterUrl: '/samples/video/ep_06_poster.jpg' },
  ],
  audio: [
    { audioUrl: '/samples/audio/instruction.wav', waveformUrl: '/samples/audio/instruction_wave.png' },
    { audioUrl: '/samples/audio/clip_01.wav', waveformUrl: '/samples/audio/clip_01_wave.png' },
    { audioUrl: '/samples/audio/clip_02.wav', waveformUrl: '/samples/audio/clip_02_wave.png' },
    { audioUrl: '/samples/audio/clip_03.wav', waveformUrl: '/samples/audio/clip_03_wave.png' },
  ],
  pointcloud: ['/samples/pointcloud/desk_pc.png'],
}

export function pickMedia(modality, index = 0) {
  if (modality === 'seg') {
    const images = MEDIA_MANIFEST.images
    return { imageUrl: images[index % images.length] }
  }
  if (modality === 'video_det') {
    const videos = MEDIA_MANIFEST.video
    return videos[index % videos.length]
  }
  if (modality === 'audio_slice') {
    const audios = MEDIA_MANIFEST.audio
    return audios[index % audios.length]
  }
  if (modality === 'point_seg') {
    const pcs = MEDIA_MANIFEST.pointcloud
    return { previewUrl: pcs[index % pcs.length] }
  }
  return {}
}
