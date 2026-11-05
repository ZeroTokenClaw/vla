import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MEDIA_MANIFEST } from '../src/mock/seed/media-manifest.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('Orion media manifest', () => {
  it('lists diversified samples with durationSec and existing files', () => {
    expect(MEDIA_MANIFEST.videos.length).toBeGreaterThanOrEqual(6)
    expect(MEDIA_MANIFEST.images.length).toBeGreaterThanOrEqual(6)
    expect(MEDIA_MANIFEST.audios.length).toBeGreaterThanOrEqual(3)
    for (const v of MEDIA_MANIFEST.videos) {
      expect(v.durationSec).toBeGreaterThan(0)
      expect(fs.existsSync(path.join(root, 'public', v.path.replace(/^\//, '')))).toBe(true)
    }
    for (const img of MEDIA_MANIFEST.images) {
      const p = typeof img === 'string' ? img : img.path
      expect(fs.existsSync(path.join(root, 'public', p.replace(/^\//, '')))).toBe(true)
    }
    for (const a of MEDIA_MANIFEST.audios) {
      expect(a.durationSec).toBeGreaterThan(0)
      expect(fs.existsSync(path.join(root, 'public', a.path.replace(/^\//, '')))).toBe(true)
    }
  })
})
