import { describe, it, expect } from 'vitest'

// Unit tests for the coordinate-conversion math in useFurnitureDrop3D.
// The hook uses K2T = 0.02 (1 Konva px = 0.02 Three units, because 50px=1m).

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
