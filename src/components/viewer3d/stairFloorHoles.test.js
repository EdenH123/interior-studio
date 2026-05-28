import { describe, it, expect } from 'vitest'
import { stairHoleCorners, holesFp, computeStairHolesForRooms, computeVoidHolesForRooms, stairOpenSides } from './stairFloorHoles'

const K2T = 0.02

describe('stairHoleCorners', () => {
  it('returns 4 corners at rotation=0', () => {
    const stair = { x: 0, y: 0, width: 1, depth: 2, rotation: 0 }
    const corners = stairHoleCorners(stair)
    expect(corners).toHaveLength(4)
    // hw=0.5, hd=1 → corners at (±0.5, ±1) in shape space
    const xs = corners.map((c) => c.x)
    const ys = corners.map((c) => c.y)
    expect(Math.min(...xs)).toBeCloseTo(-0.5)
    expect(Math.max(...xs)).toBeCloseTo(0.5)
    expect(Math.min(...ys)).toBeCloseTo(-1)
    expect(Math.max(...ys)).toBeCloseTo(1)
  })

  it('centers the hole on the stair position', () => {
    const stair = { x: 100, y: 200, width: 1, depth: 1, rotation: 0 }
    const corners = stairHoleCorners(stair)
    const cx = corners.reduce((s, c) => s + c.x, 0) / 4
    const cy = corners.reduce((s, c) => s + c.y, 0) / 4
    expect(cx).toBeCloseTo(100 * K2T)
    expect(cy).toBeCloseTo(200 * K2T)
  })

  it('swaps width/depth extents at 90° CW rotation', () => {
    // width=2 (hw=1 along local-x), depth=4 (hd=2 along local-y)
    // After 90° CW in Y-down: local-x → world-y, local-y → -world-x
    // So world x-extent becomes hd=2, world y-extent becomes hw=1
    const stair = { x: 0, y: 0, width: 2, depth: 4, rotation: 90 }
    const corners = stairHoleCorners(stair)
    const xs = corners.map((c) => c.x)
    const ys = corners.map((c) => c.y)
    expect(Math.max(...xs)).toBeCloseTo(2)
    expect(Math.min(...xs)).toBeCloseTo(-2)
    expect(Math.max(...ys)).toBeCloseTo(1)
    expect(Math.min(...ys)).toBeCloseTo(-1)
  })

  it('returns corners centred on stair position after rotation', () => {
    const stair = { x: 50, y: 100, width: 2, depth: 4, rotation: 45 }
    const corners = stairHoleCorners(stair)
    const cx = corners.reduce((s, c) => s + c.x, 0) / 4
    const cy = corners.reduce((s, c) => s + c.y, 0) / 4
    expect(cx).toBeCloseTo(50 * K2T)
    expect(cy).toBeCloseTo(100 * K2T)
  })
})

describe('holesFp', () => {
  it('returns empty string for no holes', () => {
    expect(holesFp([])).toBe('')
    expect(holesFp(null)).toBe('')
    expect(holesFp(undefined)).toBe('')
  })

  it('produces a stable fingerprint for the same holes', () => {
    const corners = stairHoleCorners({ x: 50, y: 50, width: 1, depth: 2, rotation: 0 })
    const fp1 = holesFp([corners])
    const fp2 = holesFp([corners])
    expect(fp1).toBe(fp2)
    expect(fp1.length).toBeGreaterThan(0)
  })

  it('differs for different stair positions', () => {
    const c1 = stairHoleCorners({ x: 50,  y: 50, width: 1, depth: 2, rotation: 0 })
    const c2 = stairHoleCorners({ x: 100, y: 50, width: 1, depth: 2, rotation: 0 })
    expect(holesFp([c1])).not.toBe(holesFp([c2]))
  })

  it('is order-independent (sorted)', () => {
    const c1 = stairHoleCorners({ x: 50,  y: 50, width: 1, depth: 2, rotation: 0 })
    const c2 = stairHoleCorners({ x: 100, y: 50, width: 1, depth: 2, rotation: 0 })
    expect(holesFp([c1, c2])).toBe(holesFp([c2, c1]))
  })
})

describe('computeStairHolesForRooms', () => {
  // Square room from (0,0) to (500,500) in Konva pixels
  const squareRoom = {
    id: 'room1',
    levelId: 'L1',
    verts: [
      { x: 0, y: 0 }, { x: 500, y: 0 },
      { x: 500, y: 500 }, { x: 0, y: 500 },
    ],
  }

  it('assigns hole to room when stair center is inside', () => {
    const stair = { x: 250, y: 250, width: 0.9, depth: 3.0, rotation: 0 }
    const result = computeStairHolesForRooms([squareRoom], [stair])
    const holes = result.get('room1')
    expect(holes).toHaveLength(1)
    expect(holes[0]).toHaveLength(4)
  })

  it('assigns no holes when stair center is outside the room', () => {
    const stair = { x: 600, y: 250, width: 0.9, depth: 3.0, rotation: 0 }
    const result = computeStairHolesForRooms([squareRoom], [stair])
    expect(result.get('room1')).toHaveLength(0)
  })

  it('handles multiple rooms — each gets only its own stairs', () => {
    const room2 = {
      id: 'room2',
      levelId: 'L1',
      verts: [
        { x: 600, y: 0 }, { x: 1100, y: 0 },
        { x: 1100, y: 500 }, { x: 600, y: 500 },
      ],
    }
    const stair1 = { x: 250, y: 250, width: 0.9, depth: 3.0, rotation: 0 }
    const stair2 = { x: 850, y: 250, width: 0.9, depth: 3.0, rotation: 0 }
    const result = computeStairHolesForRooms([squareRoom, room2], [stair1, stair2])
    expect(result.get('room1')).toHaveLength(1)
    expect(result.get('room2')).toHaveLength(1)
  })

  it('returns empty holes array for rooms with no nearby stairs', () => {
    const result = computeStairHolesForRooms([squareRoom], [])
    expect(result.get('room1')).toHaveLength(0)
  })

  it('returns a Map entry for every room regardless of holes', () => {
    const result = computeStairHolesForRooms([squareRoom], [])
    expect(result.has('room1')).toBe(true)
  })
})

describe('computeVoidHolesForRooms', () => {
  // A 10×10 m room (500×500 px) at the origin.
  const room = { id: 'r1', verts: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 500 }, { x: 0, y: 500 }] }

  it('adds the void outline (shape-space) as a hole when its centroid is inside the room', () => {
    const vd = { verts: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 100, y: 200 }] }
    const map = computeVoidHolesForRooms([room], [vd])
    const holes = map.get('r1')
    expect(holes).toHaveLength(1)
    // First corner converted to metres (×0.02).
    expect(holes[0][0]).toEqual({ x: 2, y: 2 })
  })

  it('skips a void whose centroid falls outside the room', () => {
    const vd = { verts: [{ x: 900, y: 900 }, { x: 950, y: 900 }, { x: 925, y: 950 }] }
    expect(computeVoidHolesForRooms([room], [vd]).get('r1')).toEqual([])
  })

  it('ignores degenerate voids (< 3 verts)', () => {
    expect(computeVoidHolesForRooms([room], [{ verts: [{ x: 1, y: 1 }] }]).get('r1')).toEqual([])
  })
})

describe('stairOpenSides', () => {
  // 1×3 m stair at origin, rotation 0 → long sides parallel to Y at x=±25 px.
  const stair = { x: 0, y: 0, width: 1, depth: 3, rotation: 0 }

  it('returns both sides open with no walls', () => {
    expect(stairOpenSides(stair, [])).toEqual([-1, 1])
  })

  it('marks a side as attached when a parallel wall runs along it', () => {
    // Right-side wall at x ≈ +25 (within 15 px threshold) covering the depth.
    const wall = { id: 'w', x1: 25, y1: -100, x2: 25, y2: 100 }
    // Only the LEFT side stays open.
    expect(stairOpenSides(stair, [wall])).toEqual([-1])
  })

  it('keeps both sides open when the wall only brushes one end (perpendicular)', () => {
    // A wall perpendicular to the stair, touching the top end (y=-75) but not
    // running alongside — only one sample point is close, so it's NOT attached.
    const wall = { id: 'w', x1: -100, y1: -75, x2: 100, y2: -75 }
    expect(stairOpenSides(stair, [wall])).toEqual([-1, 1])
  })

  it('returns [] when walls flank both long sides', () => {
    const left  = { id: 'L', x1: -25, y1: -100, x2: -25, y2: 100 }
    const right = { id: 'R', x1:  25, y1: -100, x2:  25, y2: 100 }
    expect(stairOpenSides(stair, [left, right])).toEqual([])
  })
})
