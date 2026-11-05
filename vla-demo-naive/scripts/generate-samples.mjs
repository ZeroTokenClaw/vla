import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const brand = 'LingMou' // dark stripe palette; independent of Orion/DataLink
const colors = ['#1f1f2e','#2a1f3d','#1a2a3a','#2e1a2a','#1f2e28','#3a2a1f']
// Match MEDIA_MANIFEST durationSec: 2,3,4,2,3,4
const videoDurations = [2, 3, 4, 2, 3, 4]
const audioDurations = [1.1, 1.2, 1.3]

function run(args, { quiet = false } = {}) {
  const r = spawnSync(ffmpeg, args, {
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  if (r.status !== 0) {
    const err = (r.stderr && String(r.stderr).slice(-400)) || `status=${r.status}`
    const e = new Error(`ffmpeg failed: ${args.join(' ')}\n${err}`)
    e.stderr = r.stderr
    throw e
  }
  return r
}

function ensureDirs() {
  for (const rel of ['public/samples/images', 'public/samples/video', 'public/samples/audio']) {
    fs.mkdirSync(path.join(root, rel), { recursive: true })
  }
}

function makeImage(i, color, withText) {
  const img = path.join(root, `public/samples/images/scene_0${i}.jpg`)
  const args = ['-y', '-f', 'lavfi', '-i', `color=c=${color}:s=640x360:d=1`]
  if (withText) {
    args.push('-vf', `drawtext=text='${brand} scene ${i} DESENSITIZED':x=24:y=24:fontsize=28:fontcolor=white`)
  }
  args.push('-frames:v', '1', img)
  run(args, { quiet: true })
  return img
}

function makeVideo(i, color, dur, withText) {
  const mp4 = path.join(root, `public/samples/video/ep_0${i}.mp4`)
  const freq = 520 + i * 90
  const args = [
    '-y',
    '-f', 'lavfi', '-i', `color=c=${color}:s=640x360:d=${dur}`,
    '-f', 'lavfi', '-i', `sine=frequency=${180 + i * 113}:duration=${dur}`,
  ]
  if (withText) {
    args.push('-vf', `drawtext=text='${brand} EP0${i}':x=40:y=40:fontsize=32:fontcolor=white`)
  }
  args.push('-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', mp4)
  run(args, { quiet: true })
  const poster = path.join(root, `public/samples/video/ep_0${i}_poster.jpg`)
  run(['-y', '-i', mp4, '-frames:v', '1', poster], { quiet: true })
  return mp4
}

function makeAudio(i, dur) {
  const wav = path.join(root, `public/samples/audio/clip_0${i}.wav`)
  const freq = 440 + i * 110
  run(['-y', '-f', 'lavfi', '-i', `sine=frequency=${180 + i * 113}:duration=${dur}`, wav], { quiet: true })
  // optional waveform preview
  const wave = path.join(root, `public/samples/audio/clip_0${i}_wave.png`)
  try {
    run(
      [
        '-y', '-i', wav,
        '-filter_complex', `showwavespic=s=640x120:colors=${colors[i - 1]}`,
        '-frames:v', '1', wave,
      ],
      { quiet: true },
    )
  } catch {
    // waveform optional — ignore
  }
  return wav
}

ensureDirs()

let useText = true
try {
  makeImage(1, colors[0], true)
} catch (err) {
  console.warn('[generate-samples] drawtext failed, using fontless solid-color fallback')
  console.warn(String(err.message).split('\n')[0])
  useText = false
}

for (let i = 1; i <= 6; i += 1) {
  const color = colors[i - 1]
  const dur = videoDurations[i - 1]
  // regenerate scene_01 if we probed with text and now fall back (or always rewrite)
  makeImage(i, color, useText)
  makeVideo(i, color, dur, useText)
}

for (let i = 1; i <= 3; i += 1) {
  makeAudio(i, audioDurations[i - 1])
}

console.log(`LingMou samples generated (drawtext=${useText}) under ${path.join(root, 'public/samples')}`)
