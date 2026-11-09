const fs = require('fs')
const crypto = require('crypto')
function hash(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 12)
}
const pairs = [
  ['images/scene_01.jpg', 'images/scene_01.jpg'],
  ['video/ep_01.mp4', 'video/ep_01.mp4'],
  ['audio/clip_01.wav', 'audio/clip_01.wav'],
]
for (const [a, b] of pairs) {
  const h1 = hash('E:/omp/vla/vla-demo-naive/public/samples/' + a)
  const h2 = hash('E:/omp/vla/vla-demo-antd/public/samples/' + b)
  const h3 = hash('E:/omp/vla/vla-demo-element/public/samples/' + a)
  console.log(a, 'naive', h1, 'antd', h2, 'elem', h3, 'diff?', h1 !== h2 && h1 !== h3)
}