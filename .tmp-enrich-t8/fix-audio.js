const fs = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')
const root = 'E:/omp/vla/vla-demo-naive'
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const audioDir = path.join(root, 'public/samples/audio')
for (let i = 1; i <= 3; i++) {
  const wav = path.join(audioDir, `clip_0${i}.wav`)
  const freq = 180 + i * 113 // distinct from Orion 300+i*80 and Element
  const dur = (1 + i * 0.1).toFixed(1)
  const r = spawnSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${dur}`, wav], {
    encoding: 'utf8',
  })
  if (r.status !== 0) console.error(r.stderr)
  // simple wave png placeholder solid
  const wave = path.join(audioDir, `clip_0${i}_wave.png`)
  spawnSync(ffmpeg, [
    '-y', '-f', 'lavfi', '-i', `color=c=#1f1f2e:s=320x80:d=1`,
    '-frames:v', '1', wave,
  ])
  console.log('audio', i, freq, fs.statSync(wav).size)
}
const crypto = require('crypto')
function hash(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0,12)}
console.log('naive', hash(path.join(audioDir,'clip_01.wav')))
console.log('antd', hash('E:/omp/vla/vla-demo-antd/public/samples/audio/clip_01.wav'))
console.log('elem', hash('E:/omp/vla/vla-demo-element/public/samples/audio/clip_01.wav'))