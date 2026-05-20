import { describe, it, expect } from 'vitest'
import {
  WALL_MATERIALS,
  DEFAULT_WALL_COLOR,
  getWallMaterial,
  wallColorFor,
  resolveWallMaterialId,
} from './wallMaterials'

describe('wallMaterials', () => {
  it('exposes a non-empty catalog with required fields', () => {
    expect(WALL_MATERIALS.length).toBeGreaterThan(0)
    for (const m of WALL_MATERIALS) {
      expect(m.id).toEqual(expect.any(String))
      expect(m.label).toEqual(expect.any(String))
      expect(m.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(m.category).toEqual(expect.any(String))
    }
  })

  it('covers Benjamin Moore + Sherwin-Williams + at least one Other', () => {
    const categories = new Set(WALL_MATERIALS.map((m) => m.category))
    expect(categories.has('Benjamin Moore')).toBe(true)
    expect(categories.has('Sherwin-Williams')).toBe(true)
    expect(categories.has('Other')).toBe(true)
  })

  it('paint entries carry a manufacturer code', () => {
    const paints = WALL_MATERIALS.filter((m) =>
      m.category === 'Benjamin Moore' || m.category === 'Sherwin-Williams',
    )
    expect(paints.length).toBeGreaterThan(40)
    for (const p of paints) {
      expect(p.code).toEqual(expect.any(String))
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

describe('wallMaterials legacy migrations', () => {
  it('resolveWallMaterialId returns the same id for current ids', () => {
    expect(resolveWallMaterialId('bm-hale-navy')).toBe('bm-hale-navy')
    expect(resolveWallMaterialId('wood-panel')).toBe('wood-panel')
  })

  it('resolveWallMaterialId maps legacy ids to current equivalents', () => {
    expect(resolveWallMaterialId('painted-white')).toBe('bm-decorators-white')
    expect(resolveWallMaterialId('brick')).toBe('sw-pottery-red')
    expect(resolveWallMaterialId('concrete')).toBe('sw-repose-gray')
    expect(resolveWallMaterialId('wallpaper')).toBe('bm-swiss-coffee')
  })

  it('resolveWallMaterialId returns null/undefined unchanged', () => {
    expect(resolveWallMaterialId(null)).toBeNull()
    expect(resolveWallMaterialId(undefined)).toBeNull()
  })

  it('getWallMaterial resolves legacy ids transparently', () => {
    const m = getWallMaterial('painted-white')
    expect(m).not.toBeNull()
    expect(m.id).toBe('bm-decorators-white')
  })

  it('wallColorFor renders legacy walls with the migrated color', () => {
    const color = wallColorFor({ material: 'painted-white' })
    expect(color).toBe(getWallMaterial('bm-decorators-white').color)
  })
})
