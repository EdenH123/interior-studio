import { describe, it, expect } from 'vitest'
import { raySegmentIntersect, rayHitsWalls } from './walkthroughCollision'

// ─── raySegmentIntersect ──────────────────────────────────────────────────────

describe('raySegmentIntersect', () => {
  it('returns distance for a direct hit', () => {
    // Ray from origin heading +x, wall at x=5 from z=-1 to z=1
    const t = raySegmentIntersect(
      { x: 0, z: 0 }, { x: 1, z: 0 },
      { x: 5, z: -1 }, { x: 5, z: 1 },
      10,
    )
    expect(t).toBeCloseTo(5)
  })

  it('returns Infinity for a ray that misses the segment', () => {
    // Ray heading +x, wall at x=5 from z=2 to z=4 (ray passes z=0)
    const t = raySegmentIntersect(
      { x: 0, z: 0 }, { x: 1, z: 0 },
      { x: 5, z: 2 }, { x: 5, z: 4 },
      10,
    )
    expect(t).toBe(Infinity)
  })

  it('returns Infinity when hit is beyond maxDist', () => {
    const t = raySegmentIntersect(
      { x: 0, z: 0 }, { x: 1, z: 0 },
      { x: 5, z: -1 }, { x: 5, z: 1 },
      4,
    )
    expect(t).toBe(Infinity)
  })

  it('returns Infinity for a parallel ray', () => {
    // Ray along z=0 heading +x; wall also runs along z-axis (parallel would be vertical)
    // Wall runs +x from (0, -1) to (0, 1) — perpendicular, but let's use a truly parallel case
    const t = raySegmentIntersect(
      { x: 0, z: 1 }, { x: 1, z: 0 },
      { x: 0, z: 0 }, { x: 10, z: 0 }, // wall runs along x at z=0
      20,
    )
    expect(t).toBe(Infinity)
  })

  it('returns Infinity for a ray pointing away from the wall', () => {
    const t = raySegmentIntersect(
      { x: 0, z: 0 }, { x: -1, z: 0 }, // pointing -x
      { x: 5, z: -1 }, { x: 5, z: 1 }, // wall at +x=5
      10,
    )
    expect(t).toBe(Infinity)
  })

  it('returns Infinity for a ray co-linear with the wall (parallel, same line)', () => {
    // Ray heading +x along z=0; wall also runs along z=0 (co-planar/parallel)
    const t = raySegmentIntersect(
      { x: 0, z: 0 }, { x: 1, z: 0 },
      { x: 5, z: 0 }, { x: 10, z: 0 },
      20,
    )
    expect(t).toBe(Infinity)
  })

  it('hit exactly at segment endpoint (s=0)', () => {
    const t = raySegmentIntersect(
      { x: 0, z: 0 }, { x: 1, z: 0 },
      { x: 3, z: 0 }, { x: 3, z: 2 },
      10,
    )
    expect(t).toBeCloseTo(3)
  })
})

// ─── rayHitsWalls ────────────────────────────────────────────────────────────

describe('rayHitsWalls', () => {
  const WALLS = [
    { x1: 0, y1: -50, x2: 0, y2: 50 },    // left wall at Konva x=0, Three x=0
    { x1: 500, y1: -50, x2: 500, y2: 50 }, // right wall at Konva x=500, Three x=10
  ]

  it('returns Infinity when no walls nearby', () => {
    const result = rayHitsWalls({ x: 5, z: 0 }, { x: 0, z: 1 }, WALLS, 20)
    expect(result).toBe(Infinity)
  })

  it('returns distance in Three.js units to the nearest wall', () => {
    // Pos at Three x=4, heading -x; left wall (Konva x=0) is at Three x=0, 4 units away
    const result = rayHitsWalls({ x: 4, z: 0 }, { x: -1, z: 0 }, WALLS, 20)
    expect(result).toBeCloseTo(4)
  })

  it('returns nearest when multiple walls could be hit', () => {
    // Pos at Three x=5, heading +x; right wall at Three x=10, 5 units away
    const result = rayHitsWalls({ x: 5, z: 0 }, { x: 1, z: 0 }, WALLS, 20)
    expect(result).toBeCloseTo(5)
  })

  it('handles empty wall list', () => {
    const result = rayHitsWalls({ x: 0, z: 0 }, { x: 1, z: 0 }, [], 20)
    expect(result).toBe(Infinity)
  })

  it('applies KONVA_TO_THREE scale (50 Konva px = 1 Three unit)', () => {
    // Wall at Konva x=100, Three x=2; pos at Three x=0
    const walls = [{ x1: 100, y1: -50, x2: 100, y2: 50 }]
    const result = rayHitsWalls({ x: 0, z: 0 }, { x: 1, z: 0 }, walls, 10)
    expect(result).toBeCloseTo(2)
  })
})
