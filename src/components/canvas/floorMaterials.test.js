import { describe, it, expect } from 'vitest'
import {
  FLOOR_MATERIALS,
  DEFAULT_ROOM_FILL,
  getFloorMaterial,
  materialOverlayFill,
  resolveFloorMaterialId,
} from './floorMaterials'

describe('floorMaterials', () => {
  it('exposes a non-empty catalog with required fields', () => {
    expect(FLOOR_MATERIALS.length).toBeGreaterThan(0)
    for (const m of FLOOR_MATERIALS) {
      expect(m.id).toEqual(expect.any(String))
      expect(m.label).toEqual(expect.any(String))
      expect(m.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(m.category).toEqual(expect.any(String))
    }
  })

  it('covers Wood Finish + Other Materials categories', () => {
    const categories = new Set(FLOOR_MATERIALS.map((m) => m.category))
    expect(categories.has('Wood Finish')).toBe(true)
    expect(categories.has('Other Materials')).toBe(true)
  })

  it('has all 15 wood finishes plus tile/marble/concrete/carpet', () => {
    const woods = FLOOR_MATERIALS.filter((m) => m.category === 'Wood Finish')
    expect(woods.length).toBe(15)
    const ids = FLOOR_MATERIALS.map((m) => m.id)
    expect(ids).toEqual(expect.arrayContaining(['tile', 'marble', 'concrete', 'carpet']))
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

describe('floorMaterials legacy migrations', () => {
  it('resolveFloorMaterialId maps the legacy "wood" id to the closest finish', () => {
    expect(resolveFloorMaterialId('wood')).toBe('wood-honey-oak')
  })

  it('keeps tile / carpet / concrete / marble unchanged (still in catalog)', () => {
    expect(resolveFloorMaterialId('tile')).toBe('tile')
    expect(resolveFloorMaterialId('carpet')).toBe('carpet')
    expect(resolveFloorMaterialId('concrete')).toBe('concrete')
    expect(resolveFloorMaterialId('marble')).toBe('marble')
  })

  it('null/undefined pass through as null', () => {
    expect(resolveFloorMaterialId(null)).toBeNull()
    expect(resolveFloorMaterialId(undefined)).toBeNull()
  })

  it('getFloorMaterial resolves legacy ids transparently', () => {
    const m = getFloorMaterial('wood')
    expect(m).not.toBeNull()
    expect(m.id).toBe('wood-honey-oak')
  })
})
