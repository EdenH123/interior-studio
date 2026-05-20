import { describe, it, expect } from 'vitest'
import { WALL_MATERIALS, DEFAULT_WALL_COLOR, getWallMaterial, wallColorFor } from './wallMaterials'

describe('wallMaterials', () => {
  it('exposes a non-empty catalog with required fields', () => {
    expect(WALL_MATERIALS.length).toBeGreaterThan(0)
    for (const m of WALL_MATERIALS) {
      expect(m.id).toEqual(expect.any(String))
      expect(m.label).toEqual(expect.any(String))
      expect(m.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('getWallMaterial returns the material for a known id', () => {
    const wm = WALL_MATERIALS[0]
    expect(getWallMaterial(wm.id)).toEqual(wm)
  })

  it('getWallMaterial returns null for unknown ids', () => {
    expect(getWallMaterial('not-a-thing')).toBeNull()
  })

  it('wallColorFor falls back to DEFAULT_WALL_COLOR for walls with no material', () => {
    expect(wallColorFor({ id: 'w', x1: 0, y1: 0, x2: 1, y2: 0 })).toBe(DEFAULT_WALL_COLOR)
    expect(wallColorFor({ material: null })).toBe(DEFAULT_WALL_COLOR)
    expect(wallColorFor(null)).toBe(DEFAULT_WALL_COLOR)
  })

  it('wallColorFor returns the material colour when set', () => {
    const wm = WALL_MATERIALS[0]
    expect(wallColorFor({ material: wm.id })).toBe(wm.color)
  })

  it('wallColorFor falls back when material id is unknown', () => {
    expect(wallColorFor({ material: 'imaginary' })).toBe(DEFAULT_WALL_COLOR)
  })
})
