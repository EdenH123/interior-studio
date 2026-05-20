import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseDataUrl, transformWalls, traceFloorPlan } from './traceFloorPlan'

vi.mock('./claudeApi', () => ({ streamClaude: vi.fn() }))

import { streamClaude } from './claudeApi'

// ── parseDataUrl ──────────────────────────────────────────────────────────────

describe('parseDataUrl', () => {
  it('splits a valid data URL into mediaType and base64', () => {
    const url = 'data:image/png;base64,abc123=='
    const { mediaType, base64 } = parseDataUrl(url)
    expect(mediaType).toBe('image/png')
    expect(base64).toBe('abc123==')
  })

  it('works for image/jpeg', () => {
    const url = 'data:image/jpeg;base64,/9j/ABCD'
    const { mediaType, base64 } = parseDataUrl(url)
    expect(mediaType).toBe('image/jpeg')
    expect(base64).toBe('/9j/ABCD')
  })

  it('throws on a non-data-URL string', () => {
    expect(() => parseDataUrl('https://example.com/img.png')).toThrow('Invalid data URL')
  })

  it('throws on a malformed data URL', () => {
    expect(() => parseDataUrl('data:image/png;utf8,hello')).toThrow('Invalid data URL')
  })
})

// ── transformWalls ────────────────────────────────────────────────────────────

describe('transformWalls', () => {
  const underlay = { x: 100, y: 200, scale: 2 }

  it('converts image-pixel coords to Konva world coords', () => {
    const raw = [{ x1: 0, y1: 0, x2: 10, y2: 20 }]
    const [w] = transformWalls(raw, underlay)
    expect(w.x1).toBe(100)   // 100 + 0 * 2
    expect(w.y1).toBe(200)   // 200 + 0 * 2
    expect(w.x2).toBe(120)   // 100 + 10 * 2
    expect(w.y2).toBe(240)   // 200 + 20 * 2
  })

  it('assigns a fresh 6-char id to each wall', () => {
    const raw = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 0, y1: 0, x2: 0, y2: 10 },
    ]
    const walls = transformWalls(raw, underlay)
    expect(walls[0].id).toHaveLength(6)
    expect(walls[1].id).toHaveLength(6)
    expect(walls[0].id).not.toBe(walls[1].id)
  })

  it('handles an empty array', () => {
    expect(transformWalls([], underlay)).toEqual([])
  })

  it('applies scale=1 identity correctly', () => {
    const id = { x: 0, y: 0, scale: 1 }
    const [w] = transformWalls([{ x1: 5, y1: 6, x2: 7, y2: 8 }], id)
    expect(w.x1).toBe(5)
    expect(w.y1).toBe(6)
    expect(w.x2).toBe(7)
    expect(w.y2).toBe(8)
  })
})

// ── traceFloorPlan ────────────────────────────────────────────────────────────

describe('traceFloorPlan', () => {
  const underlay = { x: 0, y: 0, scale: 1, dataUrl: null }
  const apiKey = 'sk-test'
  const underlayDataUrl = 'data:image/png;base64,abc=='

  beforeEach(() => {
    vi.mocked(streamClaude).mockReset()
  })

  async function* fakeStream(text) { yield text }

  it('passes an image message to streamClaude', async () => {
    const jsonResponse = '```json\n{"walls":[{"x1":0,"y1":0,"x2":100,"y2":0}]}\n```'
    vi.mocked(streamClaude).mockReturnValue(fakeStream(jsonResponse))
    await traceFloorPlan({ apiKey, underlayDataUrl, underlay })
    const call = vi.mocked(streamClaude).mock.calls[0][0]
    const content = call.messages[0].content
    expect(content[0].type).toBe('image')
    expect(content[0].source.type).toBe('base64')
    expect(content[0].source.media_type).toBe('image/png')
    expect(content[0].source.data).toBe('abc==')
  })

  it('returns walls transformed to Konva coords', async () => {
    const ulay = { x: 50, y: 100, scale: 2 }
    const jsonResponse = '```json\n{"walls":[{"x1":0,"y1":0,"x2":10,"y2":0}]}\n```'
    vi.mocked(streamClaude).mockReturnValue(fakeStream(jsonResponse))
    const result = await traceFloorPlan({ apiKey, underlayDataUrl, underlay: ulay })
    expect(result.walls[0].x1).toBe(50)
    expect(result.walls[0].y1).toBe(100)
    expect(result.walls[0].x2).toBe(70)  // 50 + 10 * 2
    expect(result.walls[0].y2).toBe(100) // 100 + 0 * 2
  })

  it('returns empty furniture, openings, and roomMeta', async () => {
    const jsonResponse = '```json\n{"walls":[]}\n```'
    vi.mocked(streamClaude).mockReturnValue(fakeStream(jsonResponse))
    const result = await traceFloorPlan({ apiKey, underlayDataUrl, underlay })
    expect(result.furniture).toEqual([])
    expect(result.openings).toEqual([])
    expect(result.roomMeta).toEqual({})
  })

  it('throws when Claude returns no JSON block', async () => {
    vi.mocked(streamClaude).mockReturnValue(fakeStream('Sorry, I cannot do that.'))
    await expect(traceFloorPlan({ apiKey, underlayDataUrl, underlay })).rejects.toThrow('JSON block')
  })

  it('throws when JSON is missing the walls array', async () => {
    const jsonResponse = '```json\n{"rooms":[]}\n```'
    vi.mocked(streamClaude).mockReturnValue(fakeStream(jsonResponse))
    await expect(traceFloorPlan({ apiKey, underlayDataUrl, underlay })).rejects.toThrow('"walls"')
  })
})
