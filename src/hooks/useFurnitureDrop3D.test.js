import { describe, it, expect, vi, beforeEach } from 'vitest'

// wallPositionFrom reads walls via useStore.getState() — mock the store.
vi.mock('../store/useStore', () => ({
  default: Object.assign(
    vi.fn((sel) => sel(_storeState)),
    { getState: () => _storeState },
  ),
}))
vi.mock('../components/Sidebar', () => ({
  FURNITURE_DRAG_MIME: 'application/x-interior-studio-furniture',
}))
vi.mock('../components/canvas/openingsCatalog', () => ({
  OPENING_DRAG_MIME: 'application/x-interior-studio-opening',
  getOpeningSpec: vi.fn(),
}))
vi.mock('../components/canvas/furnitureCatalog', () => ({
  getFurnitureSpec: vi.fn(),
}))

import { wallPositionFrom } from './useFurnitureDrop3D'

// Unit tests for the coordinate-conversion math in useFurnitureDrop3D.
// The hook uses K2T = 0.02 (1 Konva px = 0.02 Three units, because 50px=1m).

let _storeState = { walls: [] }
beforeEach(() => { _storeState = { walls: [] } })

const K2T = 0.02

function threeToKonva(tx, tz) {
  return { x: tx / K2T, y: tz / K2T }
}

function konvaToThree(kx, ky) {
  return { x: kx * K2T, z: ky * K2T }
}

const SNAP = 0.5
function snapHalf(v) { return Math.round(v / SNAP) * SNAP }

describe('3D drop coordinate conversion', () => {
  it('converts Three world X/Z to Konva X/Y', () => {
    const { x, y } = threeToKonva(2.0, 3.0)
    expect(x).toBeCloseTo(100)  // 2.0 / 0.02
    expect(y).toBeCloseTo(150)  // 3.0 / 0.02
  })

  it('converts Konva X/Y back to Three X/Z', () => {
    const { x, z } = konvaToThree(100, 150)
    expect(x).toBeCloseTo(2.0)
    expect(z).toBeCloseTo(3.0)
  })

  it('round-trips: Konva → Three → Konva = identity', () => {
    const kx = 250, ky = 375
    const { x: tx, z: tz } = konvaToThree(kx, ky)
    const { x, y } = threeToKonva(tx, tz)
    expect(x).toBeCloseTo(kx)
    expect(y).toBeCloseTo(ky)
  })

  it('snaps Three world coords to 0.5 m grid', () => {
    expect(snapHalf(1.1)).toBe(1.0)
    expect(snapHalf(1.3)).toBe(1.5)
    expect(snapHalf(2.75)).toBe(3.0)
    expect(snapHalf(-0.3)).toBe(-0.5)
  })

  it('0.5 Three units = 25 Konva units = 0.5 m', () => {
    const konva = threeToKonva(0.5, 0.5)
    expect(konva.x).toBeCloseTo(25)
    expect(konva.y).toBeCloseTo(25)
  })
})

describe('wallPositionFrom — 3D hit point → 0–1 wall position', () => {
  it('returns 0.5 for midpoint of horizontal wall', () => {
    // Wall: Konva (0,0)→(100,0) = 2 m at angle 0°.
    // Hit at Three (1.0, *, 0) = Konva (50, 0) = midpoint.
    _storeState = { walls: [{ id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }] }
    expect(wallPositionFrom('w1', { x: 1.0, z: 0 })).toBeCloseTo(0.5)
  })

  it('returns 0.25 for quarter-point along horizontal wall', () => {
    // Konva x=25 = 25% of 100 px wall → Three x=0.5
    _storeState = { walls: [{ id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }] }
    expect(wallPositionFrom('w1', { x: 0.5, z: 0 })).toBeCloseTo(0.25)
  })

  it('returns 0.5 for midpoint of vertical wall', () => {
    // Wall: Konva (0,0)→(0,100) = 2 m at 90°.
    // Hit at Three (0, *, 1.0) = Konva (0, 50) = midpoint.
    _storeState = { walls: [{ id: 'w1', x1: 0, y1: 0, x2: 0, y2: 100 }] }
    expect(wallPositionFrom('w1', { x: 0, z: 1.0 })).toBeCloseTo(0.5)
  })

  it('returns 0.5 when wall id is not found', () => {
    _storeState = { walls: [] }
    expect(wallPositionFrom('missing', { x: 1, z: 1 })).toBe(0.5)
  })

  it('clamps hit before wall start to 0.01', () => {
    _storeState = { walls: [{ id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }] }
    // Three x=-1 → Konva x=-50, before the wall start at x=0
    expect(wallPositionFrom('w1', { x: -1, z: 0 })).toBe(0.01)
  })

  it('clamps hit past wall end to 0.99', () => {
    _storeState = { walls: [{ id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }] }
    // Three x=3 → Konva x=150, past wall end at x=100
    expect(wallPositionFrom('w1', { x: 3, z: 0 })).toBe(0.99)
  })
})
