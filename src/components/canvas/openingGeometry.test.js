import { describe, it, expect } from 'vitest'
import {
  wallLengthPx,
  projectOntoWall,
  nearestWallSnap,
  clampPosition,
  openingsOverlap,
  wallSegmentsForRendering,
  openingPlacement,
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
