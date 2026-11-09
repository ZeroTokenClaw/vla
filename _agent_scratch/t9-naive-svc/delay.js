export const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/** Default mock latency for business APIs (300–800ms range helper). */
export const businessDelay = () => delay(400 + Math.random() * 400)