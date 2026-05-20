import { describe, it, expect, beforeEach } from 'vitest'
import { detectRooms, polygonAreaM2 } from './roomDetection'
import { PIXELS_PER_METER } from './constants'

// Helpers for constructing walls in tests. World coords are pixels at
// 50 px = 1 m; using metres in the test inputs keeps the cases readable.
const m = (v) => v * PIXELS_PER_METER
let nextId = 0
const wall = (x1m, y1m, x2m, y2m) => ({
  id: `w${nextId++}`,
  x1: m(x1m), y1: m(y1m), x2: m(x2m), y2: m(y2m),
})

beforeEach(() => { nextId = 0 })

describe('detectRooms', () => {
  it('finds nothing with no walls', () => {
    expect(detectRooms([])).toEqual([])
  })

  it('finds nothing with a single isolated wall', () => {
    expect(detectRooms([wall(0, 0, 5, 0)])).toEqual([])
  })

  it('detects a closed 4×4 m square as one room', () => {
    const walls = [
      wall(0, 0, 4, 0),
      wall(4, 0, 4, 4),
      wall(4, 4, 0, 4),
      wall(0, 4, 0, 0),
    ]
    const rooms = detectRooms(walls)
    expect(rooms).toHaveLength(1)
    expect(rooms[0].verts).toHaveLength(4)
    // 4×4 m = 16 m²; the helper returns pixels² so convert
    expect(polygonAreaM2(rooms[0].verts)).toBeCloseTo(16, 2)
  })

  it('detects an L-shape as one room', () => {
    // Outline: (0,0) → (4,0) → (4,2) → (2,2) → (2,4) → (0,4) → close
    const walls = [
      wall(0, 0, 4, 0),
      wall(4, 0, 4, 2),
      wall(4, 2, 2, 2),
      wall(2, 2, 2, 4),
      wall(2, 4, 0, 4),
      wall(0, 4, 0, 0),
    ]
    const rooms = detectRooms(walls)
    expect(rooms).toHaveLength(1)
    expect(rooms[0].verts).toHaveLength(6)
    // Area = (4×2) + (2×2) = 12 m²
    expect(polygonAreaM2(rooms[0].verts)).toBeCloseTo(12, 2)
  })

  it('detects two rooms separated by a shared wall (figure-8)', () => {
    // Two adjacent 2×2 m rooms sharing the middle wall. The outer top
    // and bottom walls must be split at the divider's endpoints so
    // (2, 0) and (2, 2) become real graph nodes — without that, the
    // divider is just a dangling wall floating inside the outer loop.
    const walls = [
      // Outer top, split at x=2
      wall(0, 0, 2, 0),
      wall(2, 0, 4, 0),
      // Right side
      wall(4, 0, 4, 2),
      // Outer bottom, split at x=2
      wall(4, 2, 2, 2),
      wall(2, 2, 0, 2),
      // Left side
      wall(0, 2, 0, 0),
      // Dividing wall at x=2
      wall(2, 0, 2, 2),
    ]
    const rooms = detectRooms(walls)
    expect(rooms).toHaveLength(2)
    // Each 2×2 m = 4 m²
    for (const r of rooms) {
      expect(polygonAreaM2(r.verts)).toBeCloseTo(4, 2)
    }
  })

  it('ignores dangling walls that don\'t close a loop', () => {
    // Square plus a dangling tail off one corner.
    const walls = [
      wall(0, 0, 4, 0),
      wall(4, 0, 4, 4),
      wall(4, 4, 0, 4),
      wall(0, 4, 0, 0),
      wall(4, 4, 6, 5), // dangling
    ]
    const rooms = detectRooms(walls)
    expect(rooms).toHaveLength(1)
    expect(polygonAreaM2(rooms[0].verts)).toBeCloseTo(16, 2)
  })

  it('drops sub-threshold tiny polygons', () => {
    // 0.1 × 0.1 m = 0.01 m² — under the 0.25 m² minimum (5 px × 5 px ≈
    // 25 px²; min is 25 × 25 = 625 px²). Should be filtered out.
    const walls = [
      { id: '0', x1: 0, y1: 0, x2: 5, y2: 0 },
      { id: '1', x1: 5, y1: 0, x2: 5, y2: 5 },
      { id: '2', x1: 5, y1: 5, x2: 0, y2: 5 },
      { id: '3', x1: 0, y1: 5, x2: 0, y2: 0 },
    ]
    expect(detectRooms(walls)).toEqual([])
  })
})

describe('roomDetection fingerprint stability', () => {
  it('returns the same room id regardless of wall insertion order', () => {
    const a = [
      wall(0, 0, 4, 0),
      wall(4, 0, 4, 4),
      wall(4, 4, 0, 4),
      wall(0, 4, 0, 0),
    ]
    const b = [a[2], a[0], a[3], a[1]] // shuffled
    const idA = detectRooms(a)[0].id
    const idB = detectRooms(b)[0].id
    expect(idA).toBe(idB)
  })

  it('returns the same room id when the same wall is drawn reversed', () => {
    const a = [
      wall(0, 0, 4, 0),
      wall(4, 0, 4, 4),
      wall(4, 4, 0, 4),
      wall(0, 4, 0, 0),
    ]
    // Reverse direction of one wall — same endpoints
    const b = [...a]
    b[0] = { ...a[0], x1: a[0].x2, y1: a[0].y2, x2: a[0].x1, y2: a[0].y1 }
    expect(detectRooms(a)[0].id).toBe(detectRooms(b)[0].id)
  })

  it('returns different ids for different polygons', () => {
    const sq = detectRooms([
      wall(0, 0, 4, 0), wall(4, 0, 4, 4), wall(4, 4, 0, 4), wall(0, 4, 0, 0),
    ])
    const sq2 = detectRooms([
      wall(0, 0, 5, 0), wall(5, 0, 5, 5), wall(5, 5, 0, 5), wall(0, 5, 0, 0),
    ])
    expect(sq[0].id).not.toBe(sq2[0].id)
  })
})

describe('polygonAreaM2', () => {
  it('returns 1 for a 1 m × 1 m square', () => {
    const verts = [
      { x: 0, y: 0 }, { x: m(1), y: 0 }, { x: m(1), y: m(1) }, { x: 0, y: m(1) },
    ]
    expect(polygonAreaM2(verts)).toBeCloseTo(1, 4)
  })
})
