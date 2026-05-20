import { describe, it, expect } from 'vitest'
import { FURNITURE_MATERIALS, getFurnitureMaterial, furnitureColorFor } from './furnitureMaterials'

describe('furnitureMaterials', () => {
  it('catalog entries have id + label + hex color', () => {
    expect(FURNITURE_MATERIALS.length).toBeGreaterThan(0)
    for (const m of FURNITURE_MATERIALS) {
      expect(m.id).toEqual(expect.any(String))
      expect(m.label).toEqual(expect.any(String))
      expect(m.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
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
