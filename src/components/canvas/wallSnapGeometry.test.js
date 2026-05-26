import { describe, it, expect } from 'vitest'
import { findWallSnap, normalizeAngle } from './wallSnapGeometry'
import { PIXELS_PER_METER, WALL_THICKNESS } from './constants'

const WALL_HALF_THICK = WALL_THICKNESS / 2

describe('normalizeAngle', () => {
  it('wraps negative angles to 0-359', () => {
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(-180)).toBe(180)
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(360)).toBe(0)
    expect(normalizeAngle(450)).toBe(90)
  })
})

describe('findWallSnap', () => {
  const scale = 1
  const thresholdScreen = 60 // world pixels at scale 1

  // A vertical wall at x=100, from y=0 to y=200.
  const verticalWall = [{ id: 'w1', x1: 100, y1: 0, x2: 100, y2: 200 }]

  // A horizontal wall at y=100, from x=0 to x=200.
  const horizontalWall = [{ id: 'w2', x1: 0, y1: 100, x2: 200, y2: 100 }]

  it('returns null for empty wall list', () => {
    const item = { x: 100, y: 100, width: 1, depth: 1 }
    expect(findWallSnap(item, [], scale)).toBeNull()
  })

  it('item beyond threshold returns null', () => {
    const item = { x: 200, y: 100, width: 1, depth: 1 }
    // Distance from (200,100) to vertical wall at x=100 is 100 — beyond 60 threshold.
    expect(findWallSnap(item, verticalWall, scale, 60)).toBeNull()
  })

  it('vertical wall — item to the right snaps to right face (uses half-width at rotation 0)', () => {
    // Item is 40 px to the right of the wall — within threshold.
    // Wall normal points along ±X. At rotation 0, the OBB extent in the X
    // direction is half the item's width.
    const item = { x: 140, y: 100, width: 1, depth: 0.5, rotation: 0 }
    const halfWidth = (1 * PIXELS_PER_METER) / 2 // 25
    const snap = findWallSnap(item, verticalWall, scale, 60)
    expect(snap).not.toBeNull()
    const expectedX = 100 + WALL_HALF_THICK + halfWidth + 1
    expect(snap.x).toBeCloseTo(expectedX, 3)
    expect(snap.y).toBeCloseTo(100, 3)
  })

  it('horizontal wall — item below snaps to bottom face', () => {
    // Item is 40 px below the horizontal wall — within threshold.
    const item = { x: 100, y: 140, width: 1, depth: 0.5 }
    const halfDepth = (0.5 * PIXELS_PER_METER) / 2 // 12.5
    const snap = findWallSnap(item, horizontalWall, scale, 60)
    expect(snap).not.toBeNull()
    // Snapped y should be wall_y + WALL_HALF_THICK + halfDepth + 1.
    const expectedY = 100 + WALL_HALF_THICK + halfDepth + 1
    expect(snap.x).toBeCloseTo(100, 3)
    expect(snap.y).toBeCloseTo(expectedY, 3)
  })

  it('projection clamps to segment — item past wall endpoint uses endpoint', () => {
    // Wall from (0,0) to (100,0). Item is at (150, 30) — projection to segment
    // is clamped to endpoint (100, 0).
    const wall = [{ id: 'w3', x1: 0, y1: 0, x2: 100, y2: 0 }]
    const item = { x: 150, y: 30, width: 1, depth: 0.4 }
    const snap = findWallSnap(item, wall, scale, 60)
    // Distance from (150,30) to clamped point (100,0) = sqrt(50^2+30^2) ≈ 58.3 < 60.
    expect(snap).not.toBeNull()
    // Snap should be positioned relative to the endpoint (100, 0).
    // Side: item is below the wall (y>0 means positive in screen coords).
    // Wall dir: (1,0), normal: (0,1). dot = (150-100)*0 + (30-0)*1 = 30 > 0 → side=1.
    const halfDepth = (0.4 * PIXELS_PER_METER) / 2
    expect(snap.y).toBeCloseTo(WALL_HALF_THICK + halfDepth + 1, 3)
  })

  it('item on left side of vertical wall snaps to left face (uses half-width at rotation 0)', () => {
    const item = { x: 60, y: 100, width: 1, depth: 0.5, rotation: 0 }
    const halfWidth = (1 * PIXELS_PER_METER) / 2
    const snap = findWallSnap(item, verticalWall, scale, 60)
    expect(snap).not.toBeNull()
    const expectedX = 100 - WALL_HALF_THICK - halfWidth - 1
    expect(snap.x).toBeCloseTo(expectedX, 3)
  })
})
