import { describe, it, expect } from 'vitest'
import { KONVA_TO_THREE, konvaToFloor, konvaRotationToThreeY } from './threeMath'

describe('threeMath', () => {
  it('KONVA_TO_THREE is 0.02 (= 1 / PIXELS_PER_METER)', () => {
    expect(KONVA_TO_THREE).toBeCloseTo(0.02, 6)
  })

  it('konvaToFloor: (x, y) px → (x*0.02, z=y*0.02)', () => {
    expect(konvaToFloor(0, 0)).toEqual({ x: 0, z: 0 })
    expect(konvaToFloor(50, 100)).toEqual({ x: 1, z: 2 })
    expect(konvaToFloor(-100, 200)).toEqual({ x: -2, z: 4 })
  })

  it('konvaRotationToThreeY: 0° → 0 rad', () => {
    expect(konvaRotationToThreeY(0)).toBe(-0) // tolerant of -0 vs 0
  })

  it('konvaRotationToThreeY: Konva CW positive → Three Y CCW positive (flipped sign)', () => {
    // Konva 90° clockwise on screen should correspond to Three Y rotation
    // of -π/2 (CW from the +Y vantage in three's right-handed system).
    expect(konvaRotationToThreeY(90)).toBeCloseTo(-Math.PI / 2, 6)
    expect(konvaRotationToThreeY(180)).toBeCloseTo(-Math.PI, 6)
    expect(konvaRotationToThreeY(-45)).toBeCloseTo(Math.PI / 4, 6)
  })
})
