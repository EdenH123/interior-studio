import { describe, it, expect } from 'vitest'
import {
  PIXELS_PER_METER, GRID_SIZE, WORLD_HALF, WALL_THICKNESS,
  SNAP_RADIUS_SCREEN, snapTo90, formatMeters, findNearestSnapPoint,
  snapParallelWallLength,
} from './constants'

describe('constants', () => {
  it('exposes the canonical scale + grid sizes', () => {
    expect(PIXELS_PER_METER).toBe(50)
    expect(GRID_SIZE).toBe(50)
    expect(WORLD_HALF).toBe(5000)
    expect(WALL_THICKNESS).toBeGreaterThan(0)
    expect(SNAP_RADIUS_SCREEN).toBeGreaterThan(0)
  })
})

describe('formatMeters', () => {
  it('formats with 2 decimals and a m suffix', () => {
    expect(formatMeters(50)).toBe('1.00 m')
    expect(formatMeters(75)).toBe('1.50 m')
    expect(formatMeters(0)).toBe('0.00 m')
    expect(formatMeters(-50)).toBe('-1.00 m')
  })
})

describe('snapTo90', () => {
  it('returns the cursor unchanged at a zero-length stroke', () => {
    const r = snapTo90({ x: 0, y: 0 }, { x: 0, y: 0 })
    expect(r).toEqual({ x: 0, y: 0 })
  })

  it('snaps a near-horizontal drag to perfect horizontal, preserving cursor distance', () => {
    const start = { x: 0, y: 0 }
    const end = { x: 100, y: 5 } // mostly horizontal
    const dist = Math.hypot(100, 5)
    const snapped = snapTo90(start, end)
    expect(snapped.y).toBeCloseTo(0, 6) // horizontal
    expect(Math.hypot(snapped.x, snapped.y)).toBeCloseTo(dist, 6)
  })

  it('snaps a near-vertical drag to perfect vertical', () => {
    const snapped = snapTo90({ x: 0, y: 0 }, { x: 3, y: 100 })
    expect(snapped.x).toBeCloseTo(0, 6)
    expect(snapped.y).toBeCloseTo(Math.hypot(3, 100), 6)
  })

  it('handles the 4 cardinal directions cleanly', () => {
    const cases = [
      [{ x: 100, y: 0 }, { x: 100, y: 0 }],
      [{ x: 0, y: 100 }, { x: 0, y: 100 }],
      [{ x: -100, y: 0 }, { x: -100, y: 0 }],
      [{ x: 0, y: -100 }, { x: 0, y: -100 }],
    ]
    for (const [end, want] of cases) {
      const got = snapTo90({ x: 0, y: 0 }, end)
      expect(got.x).toBeCloseTo(want.x, 6)
      expect(got.y).toBeCloseTo(want.y, 6)
    }
  })
})

describe('findNearestSnapPoint', () => {
  const walls = [
    { id: 'w', x1: 0, y1: 0, x2: 100, y2: 0 },
  ]

  it('returns null when no snap point is within range', () => {
    const p = findNearestSnapPoint({ x: 500, y: 500 }, walls, 14)
    expect(p).toBeNull()
  })

  it('snaps to an endpoint when the cursor is near it', () => {
    const p = findNearestSnapPoint({ x: 2, y: 2 }, walls, 14)
    expect(p).toMatchObject({ x: 0, y: 0, kind: 'endpoint' })
  })

  it('snaps to the midpoint when closer than either endpoint', () => {
    const p = findNearestSnapPoint({ x: 50, y: 3 }, walls, 14)
    expect(p).toMatchObject({ x: 50, y: 0, kind: 'midpoint' })
  })

  it('prefers endpoints over midpoints on equal distance (tie-break order)', () => {
    // Cursor equidistant from endpoint (0,0) and midpoint (50,0) — only
    // happens for short walls; pick a 6-wide wall where the midpoint is
    // at (3, 0) and cursor at (1.5, 0). Endpoint at (0,0) is 1.5 away,
    // midpoint at (3,0) is 1.5 away.
    const w = [{ id: 'w', x1: 0, y1: 0, x2: 6, y2: 0 }]
    const p = findNearestSnapPoint({ x: 1.5, y: 0 }, w, 14)
    expect(p.kind).toBe('endpoint')
    expect(p.x).toBe(0)
  })

  it('respects the supplied threshold', () => {
    expect(findNearestSnapPoint({ x: 20, y: 0 }, walls, 5)).toBeNull()
    const p = findNearestSnapPoint({ x: 20, y: 0 }, walls, 25)
    expect(p).not.toBeNull()
  })
})

describe('snapParallelWallLength', () => {
  const drawStart = { x: 0, y: 200 }

  it('returns dirPoint unchanged when no parallel wall is within threshold', () => {
    const walls = [{ id: 'w1', x1: 0, y1: 0, x2: 300, y2: 0 }]  // horizontal, not parallel to vertical draw
    const dirPoint = { x: 0, y: 0 }  // drawing upward, length 200
    const result = snapParallelWallLength(drawStart, dirPoint, walls, 14)
    expect(result).toEqual(dirPoint)
  })

  it('snaps length to a parallel wall when cursor is within threshold', () => {
    // Drawing upward from (0,200); parallel vertical wall has length 200
    // but cursor is at length 195 — within threshold 14 of 200
    const walls = [{ id: 'w2', x1: 300, y1: 0, x2: 300, y2: 200 }]  // vertical, length 200
    const dirPoint = { x: 0, y: 5 }  // drawStart=(0,200) → (0,5): length = 195
    const result = snapParallelWallLength(drawStart, dirPoint, walls, 14)
    // Should snap to length 200: end at (0, 0)
    expect(result.x).toBeCloseTo(0, 5)
    expect(result.y).toBeCloseTo(0, 5)
    const len = Math.hypot(result.x - drawStart.x, result.y - drawStart.y)
    expect(len).toBeCloseTo(200, 5)
  })

  it('does not snap when the delta exceeds threshold', () => {
    const walls = [{ id: 'w2', x1: 300, y1: 0, x2: 300, y2: 200 }]
    const dirPoint = { x: 0, y: 30 }  // length = 170, delta=30 > threshold=14
    const result = snapParallelWallLength(drawStart, dirPoint, walls, 14)
    expect(result).toEqual(dirPoint)
  })

  it('ignores perpendicular walls', () => {
    const walls = [{ id: 'w3', x1: 0, y1: 0, x2: 300, y2: 0 }]  // horizontal
    const dirPoint = { x: 0, y: 3 }  // drawing upward, length 197
    const result = snapParallelWallLength(drawStart, dirPoint, walls, 14)
    expect(result).toEqual(dirPoint)  // no snap — no parallel walls
  })

  it('returns dirPoint unchanged for a zero-length draw', () => {
    const walls = [{ id: 'w2', x1: 300, y1: 0, x2: 300, y2: 200 }]
    const dirPoint = { x: 0, y: 200 }  // same as drawStart → length 0
    const result = snapParallelWallLength(drawStart, dirPoint, walls, 14)
    expect(result).toEqual(dirPoint)
  })
})
