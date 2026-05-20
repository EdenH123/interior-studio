import { describe, it, expect } from 'vitest'
import {
  FURNITURE_MATERIALS,
  getFurnitureMaterial,
  furnitureColorFor,
  resolveFurnitureMaterialId,
} from './furnitureMaterials'

describe('furnitureMaterials', () => {
  it('catalog entries have id + label + hex color + category', () => {
    expect(FURNITURE_MATERIALS.length).toBeGreaterThan(0)
    for (const m of FURNITURE_MATERIALS) {
      expect(m.id).toEqual(expect.any(String))
      expect(m.label).toEqual(expect.any(String))
      expect(m.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(m.category).toEqual(expect.any(String))
    }
  })

  it('mixes wood finishes + paint + fabric tones', () => {
    const cats = new Set(FURNITURE_MATERIALS.map((m) => m.category))
    expect(cats.has('Wood Finish')).toBe(true)
    expect(cats.has('Paint')).toBe(true)
    expect(cats.has('Fabric')).toBe(true)
  })

  it('paint entries carry a manufacturer code', () => {
    const paints = FURNITURE_MATERIALS.filter((m) => m.category === 'Paint')
    expect(paints.length).toBeGreaterThan(0)
    for (const p of paints) expect(p.code).toEqual(expect.any(String))
  })

  it('getFurnitureMaterial returns null for unknown ids', () => {
    expect(getFurnitureMaterial('nope')).toBeNull()
    expect(getFurnitureMaterial(FURNITURE_MATERIALS[0].id)).toEqual(FURNITURE_MATERIALS[0])
  })

  it('furnitureColorFor: override wins over item.color', () => {
    const fm = FURNITURE_MATERIALS[0]
    expect(furnitureColorFor({ color: '#abc123', material: fm.id })).toBe(fm.color)
  })

  it('furnitureColorFor: catalog color when no material set', () => {
    expect(furnitureColorFor({ color: '#abc123' })).toBe('#abc123')
    expect(furnitureColorFor({ color: '#abc123', material: null })).toBe('#abc123')
  })

  it('furnitureColorFor: falls back to default grey when material is unknown AND no catalog color', () => {
    expect(furnitureColorFor({ material: 'imaginary' })).toBe('#888')
    expect(furnitureColorFor(null)).toBe('#888')
  })

  it('furnitureColorFor: unknown material falls through to catalog color', () => {
    expect(furnitureColorFor({ color: '#abc123', material: 'imaginary' })).toBe('#abc123')
  })
})

describe('furnitureMaterials legacy migrations', () => {
  it('maps each pre-2026-05-21 id to a current equivalent', () => {
    expect(resolveFurnitureMaterialId('light-wood')).toBe('wood-honey-oak')
    expect(resolveFurnitureMaterialId('dark-wood')).toBe('wood-walnut')
    expect(resolveFurnitureMaterialId('white')).toBe('bm-decorators-white')
    expect(resolveFurnitureMaterialId('black')).toBe('sw-tricorn-black')
    expect(resolveFurnitureMaterialId('linen')).toBe('fabric-cream-linen')
    expect(resolveFurnitureMaterialId('navy')).toBe('fabric-deep-navy')
    expect(resolveFurnitureMaterialId('forest')).toBe('bm-hunter-green')
  })

  it('null/undefined pass through as null', () => {
    expect(resolveFurnitureMaterialId(null)).toBeNull()
    expect(resolveFurnitureMaterialId(undefined)).toBeNull()
  })

  it('getFurnitureMaterial resolves legacy ids transparently', () => {
    const m = getFurnitureMaterial('light-wood')
    expect(m).not.toBeNull()
    expect(m.id).toBe('wood-honey-oak')
  })

  it('furnitureColorFor renders legacy items with the migrated color', () => {
    const color = furnitureColorFor({ color: '#fallback', material: 'linen' })
    const fabric = getFurnitureMaterial('fabric-cream-linen')
    expect(color).toBe(fabric.color)
  })
})
