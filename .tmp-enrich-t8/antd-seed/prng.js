/** Mulberry32 - fixed seed, reproducible across refresh. */
export function createPrng(seed) {
  let t = seed >>> 0
  function next() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1))
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)]
    },
    shuffle(arr) {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
  }
}
