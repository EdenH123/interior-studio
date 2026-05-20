import { describe, it, expect } from 'vitest'
import {
  wallLengthPx,
  projectOntoWall,
  nearestWallSnap,
  clampPosition,
  openingsOverlap,
  wallSegmentsForRendering,
  openingPlacement,
  wallMountedPlacement,
} from './openingGeometry'

const wallH = { id: 'h', x1: 0, y1: 0, x2: 500, y2: 0 }
const wallV = { id: 'v', x1: 0, y1: 0, x2: 0, y2: 500 }

describe('wallLengthPx', () => {
  it('returns pixel length', () => {
    expect(wallLengthPx(wallH)).toBe(500)
    expect(wallLengthPx(wallV)).toBe(500)
  })
})

describe('projectOntoWall', () => {
  it('projects a point onto a horizontal wall', () => {
    const p = projectOntoWall({ x: 250, y: 30 }, wallH)
    expect(p.x).toBe(250)
    expect(p.y).toBe(0)
    expect(p.t).toBe(0.5)
  })

  it('clamps t to [0, 1]', () => {
    const before = projectOntoWall({ x: -100, y: 0 }, wallH)
    expect(before.t).toBe(0)
    const after = projectOntoWall({ x: 9999, y: 0 }, wallH)
    expect(after.t).toBe(1)
  })
})

describe('nearestWallSnap', () => {
  it('picks the closest wall within threshold', () => {
    const snap = nearestWallSnap({ x: 100, y: 5 }, [wallH, wallV], 20)
    expect(snap.wallId).toBe('h')
    expect(snap.position).toBeCloseTo(0.2)
  })

  it('returns null when no wall is within threshold', () => {
    const snap = nearestWallSnap({ x: 100, y: 50 }, [wallH, wallV], 10)
    expect(snap).toBeNull()
  })
})

describe('clampPosition', () => {
  it('clamps an off-end opening inward', () => {
    // 0.9 m door on a 10 m wall: half = 0.045. position 0 → 0.045.
    const o = { width: 0.9, position: 0 }
    expect(clampPosition(o, wallH)).toBeCloseTo(0.045)
  })

  it('returns null when the opening is wider than the wall', () => {
    const o = { width: 999, position: 0.5 }
    expect(clampPosition(o, wallH)).toBeNull()
  })
})

describe('openingsOverlap', () => {
  const a = { width: 0.9, position: 0.5 }
  it('detects overlap', () => {
    const b = { width: 0.9, position: 0.55 }
    expect(openingsOverlap(a, b, wallH)).toBe(true)
  })
  it('treats clearly-separated openings as non-overlapping', () => {
    // Each has half-extent 0.045. Centres > 0.09 apart → no overlap.
    const b = { width: 0.9, position: 0.6 }
    expect(openingsOverlap(a, b, wallH)).toBe(false)
  })
})

describe('wallSegmentsForRendering', () => {
  it('returns the full wall when no openings', () => {
    const segs = wallSegmentsForRendering(wallH, [])
    expect(segs).toEqual([{ x1: 0, y1: 0, x2: 500, y2: 0 }])
  })

  it('produces gap-around-opening segments', () => {
    const o = { id: 'o1', wallId: 'h', width: 1, position: 0.5 }
    const segs = wallSegmentsForRendering(wallH, [o])
    expect(segs).toHaveLength(2)
    expect(segs[0].x1).toBe(0)
    expect(segs[1].x2).toBe(500)
    expect(segs[0].x2).toBeLessThan(segs[1].x1)
  })

  it('ignores openings on other walls', () => {
    const foreign = { id: 'x', wallId: 'v', width: 1, position: 0.5 }
    const segs = wallSegmentsForRendering(wallH, [foreign])
    expect(segs).toEqual([{ x1: 0, y1: 0, x2: 500, y2: 0 }])
  })
})

describe('openingPlacement', () => {
  it('returns world-space pose for an opening', () => {
    const o = { width: 1, position: 0.5 }
    const p = openingPlacement(o, wallH)
    expect(p.centerX).toBe(250)
    expect(p.centerY).toBe(0)
    expect(p.ux).toBeCloseTo(1)
    expect(p.uy).toBeCloseTo(0)
    expect(p.widthPx).toBe(50)
  })
})

describe('wallMountedPlacement', () => {
  // Horizontal wall (left→right). Drop point above wall (y < 0) → item faces up.
  const wallH = { id: 'h', x1: 0, y1: 0, x2: 500, y2: 0 }
  // Vertical wall (top→bottom). Drop point to the right (x > 0) → item faces right.
  const wallV = { id: 'v', x1: 0, y1: 0, x2: 0, y2: 500 }

  function makeSnap(wall, t = 0.5) {
    const x = wall.x1 + (wall.x2 - wall.x1) * t
    const y = wall.y1 + (wall.y2 - wall.y1) * t
    return { wall, point: { x, y }, position: t }
  }

  it('places item above a horizontal wall when drop is above', () => {
    const snap = makeSnap(wallH, 0.5)           // midpoint (250, 0)
    const depthMetres = 0.5                      // 25 px at 50px/m
    const world = { x: 250, y: -30 }            // cursor above the wall
    const result = wallMountedPlacement(snap, depthMetres, world)
    expect(result.x).toBeCloseTo(250)            // centre along wall unchanged
    expect(result.y).toBeCloseTo(-12.5)          // 25/2 px above projection
    expect(result.rotation).toBeCloseTo(0)       // facing up = 0°
  })

  it('places item below a horizontal wall when drop is below', () => {
    const snap = makeSnap(wallH, 0.5)
    const world = { x: 250, y: 30 }             // cursor below the wall
    const result = wallMountedPlacement(snap, 0.5, world)
    expect(result.y).toBeCloseTo(12.5)           // 25/2 px below projection
    expect(result.rotation).toBeCloseTo(180)     // facing down = 180°
  })

  it('places item to the right of a vertical wall when drop is to the right', () => {
    const snap = makeSnap(wallV, 0.5)            // midpoint (0, 250)
    const world = { x: 30, y: 250 }             // cursor to the right
    const result = wallMountedPlacement(snap, 0.5, world)
    expect(result.x).toBeCloseTo(12.5)           // 25/2 px right of projection
    expect(result.y).toBeCloseTo(250)
    expect(result.rotation).toBeCloseTo(90)      // facing right = 90°
  })

  it('center is always at projection + half-depth offset', () => {
    const snap = makeSnap(wallH, 0.5)
    const depthM = 0.6                           // 30 px
    const world = { x: 250, y: -50 }
    const result = wallMountedPlacement(snap, depthM, world)
    expect(result.y).toBeCloseTo(-15)            // 30/2 = 15 px above
  })
})
