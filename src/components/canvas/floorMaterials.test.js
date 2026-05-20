import { describe, it, expect } from 'vitest'
import {
  FLOOR_MATERIALS, DEFAULT_ROOM_FILL, getFloorMaterial, materialOverlayFill,
} from './floorMaterials'

describe('floorMaterials', () => {
  it('exposes a non-empty catalog with required fields', () => {
    expect(FLOOR_MATERIALS.length).toBeGreaterThan(0)
    for (const m of FLOOR_MATERIALS) {
      expect(m.id).toEqual(expect.any(String))
      expect(m.label).toEqual(expect.any(String))
      expect(m.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('getFloorMaterial returns the material for known ids', () => {
    const fm = FLOOR_MATERIALS[0]
    expect(getFloorMaterial(fm.id)).toEqual(fm)
    expect(getFloorMaterial('imaginary')).toBeNull()
  })

  it('DEFAULT_ROOM_FILL is an rgba string', () => {
    expect(DEFAULT_ROOM_FILL).toMatch(/^rgba\(/)
  })

  it('materialOverlayFill converts hex to rgba with reduced alpha', () => {
    const out = materialOverlayFill('#ff0000')
    expect(out).toMatch(/^rgba\(255, 0, 0, 0\.\d+\)$/)
  })
})
