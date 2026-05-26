import { describe, it, expect } from 'vitest'
import {
  raySegmentIntersect, rayHitsWalls,
  indexOpeningsByWall, stairGroundY,
} from './walkthroughCollision'

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

// ─── rayHitsWalls — passable openings ────────────────────────────────────────

describe('rayHitsWalls with openings', () => {
  // 10m wall along Konva y-axis (Three z-axis) at Konva x=0 (Three x=0).
  // Length in Three units: |y2-y1| * KONVA_TO_THREE = 500 * 0.02 = 10.
  const WALL = { id: 'W1', x1: 0, y1: -250, x2: 0, y2: 250 }

  it('passes through a door (sillHeight 0) at wall midpoint', () => {
    // Door at position=0.5 (mid wall), width 0.9 m.
    const openings = [{ wallId: 'W1', type: 'door', position: 0.5, width: 0.9, sillHeight: 0 }]
    const idx = indexOpeningsByWall(openings)
    // Ray from Three (-5, 0) heading +x, hits wall at z=0 (mid). Mid = passable.
    const result = rayHitsWalls(
      { x: -5, z: 0 }, { x: 1, z: 0 }, [WALL], 20,
      { openingsByWall: idx },
    )
    expect(result).toBe(Infinity)
  })

  it('blocks when ray hits a window (non-zero sillHeight)', () => {
    const openings = [{ wallId: 'W1', type: 'window', position: 0.5, width: 1.2, sillHeight: 0.9 }]
    const idx = indexOpeningsByWall(openings)
    const result = rayHitsWalls(
      { x: -5, z: 0 }, { x: 1, z: 0 }, [WALL], 20,
      { openingsByWall: idx },
    )
    expect(result).toBeCloseTo(5)
  })

  it('blocks when ray hits the wall outside any opening', () => {
    // Door at position=0.5 (mid), so ray aimed at z=-3 (outside opening) blocks.
    const openings = [{ wallId: 'W1', type: 'door', position: 0.5, width: 0.9, sillHeight: 0 }]
    const idx = indexOpeningsByWall(openings)
    // Aim ray from (-5, -3) heading +x → hits wall at (0, -3), well outside the door.
    const result = rayHitsWalls(
      { x: -5, z: -3 }, { x: 1, z: 0 }, [WALL], 20,
      { openingsByWall: idx },
    )
    expect(result).toBeCloseTo(5)
  })

  it('open archway (sillHeight 0) is passable', () => {
    const openings = [{ wallId: 'W1', type: 'opening', position: 0.5, width: 1.2, sillHeight: 0 }]
    const idx = indexOpeningsByWall(openings)
    const result = rayHitsWalls(
      { x: -5, z: 0 }, { x: 1, z: 0 }, [WALL], 20,
      { openingsByWall: idx },
    )
    expect(result).toBe(Infinity)
  })
})

// ─── rayHitsWalls — vertical filter (multi-level) ────────────────────────────

describe('rayHitsWalls vertical filtering', () => {
  const WALL_L0 = { id: 'W0', x1: 0, y1: -50, x2: 0, y2: 50, levelId: 'L0' }
  const WALL_L1 = { id: 'W1', x1: 0, y1: -50, x2: 0, y2: 50, levelId: 'L1' }
  const offsets = new Map([['L0', 0], ['L1', 2.4]])

  it('player on ground floor only collides with ground-floor walls', () => {
    // Player Y = 1.65 (eye), feet at 0. Ground-floor wall [0, 2.4] hits;
    // upper-floor wall [2.4, 4.8] does not overlap [0, 1.65].
    const result = rayHitsWalls(
      { x: -5, z: 0 }, { x: 1, z: 0 }, [WALL_L0, WALL_L1], 20,
      { playerY: 1.65, levelBaseY: offsets },
    )
    expect(result).toBeCloseTo(5)  // ground-floor wall hit
  })

  it('player on upper floor only collides with upper-floor walls', () => {
    // Player Y = 4.05 (eye on 2nd floor), feet at 2.4. Upper wall [2.4, 4.8] hits.
    // Remove the upper wall to verify ground-floor wall is skipped.
    const result = rayHitsWalls(
      { x: -5, z: 0 }, { x: 1, z: 0 }, [WALL_L0], 20,
      { playerY: 4.05, levelBaseY: offsets },
    )
    expect(result).toBe(Infinity)
  })
})

// ─── stairGroundY ────────────────────────────────────────────────────────────

describe('stairGroundY', () => {
  // Axis-aligned stair, 1m wide × 3m deep, climbing 2.4m. Center at (0,0,0),
  // baseY = 0. Local +Z is the climbing axis (bottom at z=-1.5, top at z=+1.5).
  const STAIR = { cx: 0, cz: 0, yaw: 0, width: 1, depth: 3, height: 2.4, baseY: 0 }

  it('returns base height at the bottom of the stairs', () => {
    expect(stairGroundY(0, -1.5, STAIR)).toBeCloseTo(0)
  })

  it('returns half-height at the middle of the stairs', () => {
    expect(stairGroundY(0, 0, STAIR)).toBeCloseTo(1.2)
  })

  it('returns full height at the top of the stairs', () => {
    expect(stairGroundY(0, 1.5, STAIR)).toBeCloseTo(2.4)
  })

  it('returns null when player is outside the footprint width', () => {
    expect(stairGroundY(2, 0, STAIR)).toBeNull()
  })

  it('returns null when player is past the top edge', () => {
    expect(stairGroundY(0, 3, STAIR)).toBeNull()
  })

  it('respects baseY offset (stair on an upper floor)', () => {
    const upper = { ...STAIR, baseY: 2.4 }
    expect(stairGroundY(0, 0, upper)).toBeCloseTo(3.6)  // 2.4 + 1.2 ramp
  })

  it('handles rotated stairs (yaw 90° → climbing axis is world -X)', () => {
    const rotated = { ...STAIR, yaw: Math.PI / 2 }
    // Three.js Y rotation is CCW from above. After +90° rotation, the stair's
    // local +Z axis (top of stairs) maps to world -X.
    expect(stairGroundY(-1.5, 0, rotated)).toBeCloseTo(2.4)
    expect(stairGroundY(1.5, 0, rotated)).toBeCloseTo(0)
  })
})

// ─── indexOpeningsByWall ─────────────────────────────────────────────────────

describe('indexOpeningsByWall', () => {
  it('groups by wallId and marks doors passable', () => {
    const idx = indexOpeningsByWall([
      { wallId: 'A', type: 'door', position: 0.3, width: 0.9, sillHeight: 0 },
      { wallId: 'A', type: 'window', position: 0.7, width: 1.2, sillHeight: 0.9 },
      { wallId: 'B', type: 'opening', position: 0.5, width: 1.5, sillHeight: 0 },
    ])
    expect(idx.get('A')).toHaveLength(2)
    expect(idx.get('A')[0].passable).toBe(true)
    expect(idx.get('A')[1].passable).toBe(false)
    expect(idx.get('B')[0].passable).toBe(true)
  })

  it('handles null/undefined openings', () => {
    expect(indexOpeningsByWall(null).size).toBe(0)
    expect(indexOpeningsByWall(undefined).size).toBe(0)
    expect(indexOpeningsByWall([]).size).toBe(0)
  })

  it('skips openings without wallId', () => {
    const idx = indexOpeningsByWall([
      { type: 'door', position: 0.3, width: 0.9, sillHeight: 0 },
    ])
    expect(idx.size).toBe(0)
  })
})
