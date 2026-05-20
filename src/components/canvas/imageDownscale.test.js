// Tests for imageDownscale.js. This module uses browser APIs (Image, canvas)
// that aren't available in jsdom by default, so each test stubs them out.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { downscaleDataUrl, DEFAULT_MAX_PX, DEFAULT_QUALITY, QUOTA_WARN_BYTES } from './imageDownscale'

// ─── Canvas / Image stubs ─────────────────────────────────────────────────────

let _origImage
let _origCreateElement

beforeEach(() => {
  _origImage = globalThis.Image
  _origCreateElement = document.createElement.bind(document)
})

afterEach(() => {
  globalThis.Image = _origImage
  document.createElement = _origCreateElement
})

// Replace window.Image with a synchronous fake that reports the given
// natural dimensions and fires onload (or onerror) immediately on src set.
function stubImage(naturalWidth, naturalHeight, { shouldError = false } = {}) {
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = naturalWidth
      this.naturalHeight = naturalHeight
    }
    set src(_url) {
      if (shouldError) this.onerror?.()
      else this.onload?.()
    }
  }
}

// Replace document.createElement so that requests for 'canvas' return a
// fake canvas. All other tags fall through to the real implementation.
function stubCanvas(outDataUrl = 'data:image/jpeg;base64,scaledmock') {
  const ctx = { drawImage: vi.fn() }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => outDataUrl),
  }
  const orig = _origCreateElement
  document.createElement = (tag, ...args) =>
    tag === 'canvas' ? canvas : orig(tag, ...args)
  return { canvas, ctx }
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('imageDownscale constants', () => {
  it('DEFAULT_MAX_PX is 2000', () => {
    expect(DEFAULT_MAX_PX).toBe(2000)
  })

  it('QUOTA_WARN_BYTES is 4 MB', () => {
    expect(QUOTA_WARN_BYTES).toBe(4 * 1024 * 1024)
  })
})

// ─── downscaleDataUrl ─────────────────────────────────────────────────────────

describe('downscaleDataUrl', () => {
  it('passes a small image through unchanged (downscaled: false)', async () => {
    stubImage(800, 400)
    const input = 'data:image/png;base64,smallimage'
    const result = await downscaleDataUrl(input, 2000)

    expect(result.downscaled).toBe(false)
    expect(result.dataUrl).toBe(input)
    expect(result.width).toBe(800)
    expect(result.height).toBe(400)
  })

  it('downscales a landscape image so the long side equals maxPx', async () => {
    // 4000×2000 → maxPx 2000 → ratio 0.5 → 2000×1000
    stubImage(4000, 2000)
    const { canvas, ctx } = stubCanvas()

    const result = await downscaleDataUrl('data:image/png;base64,bigimage', 2000)

    expect(result.downscaled).toBe(true)
    expect(result.width).toBe(2000)
    expect(result.height).toBe(1000)
    expect(canvas.width).toBe(2000)
    expect(canvas.height).toBe(1000)
    expect(ctx.drawImage).toHaveBeenCalledOnce()
    expect(result.dataUrl).toBe('data:image/jpeg;base64,scaledmock')
  })

  it('respects a custom maxPx smaller than the default', async () => {
    // 600×400, maxPx=400 → ratio = 400/600 ≈ 0.667 → w=400, h=267
    stubImage(600, 400)
    const { canvas } = stubCanvas()

    const result = await downscaleDataUrl('data:image/png;base64,img', 400)

    expect(result.downscaled).toBe(true)
    expect(result.width).toBe(400)
    expect(result.height).toBe(267) // Math.round(400 * 400/600) = Math.round(266.67) = 267
    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(267)
  })

  it('rejects with an error when the image fails to load', async () => {
    stubImage(0, 0, { shouldError: true })
    await expect(downscaleDataUrl('data:image/png;base64,bad')).rejects.toThrow(
      'Could not decode image',
    )
  })
})
