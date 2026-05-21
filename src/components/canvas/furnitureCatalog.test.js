import { describe, it, expect } from 'vitest'
import { FURNITURE, CATEGORIES, getFurnitureSpec } from './furnitureCatalog'

const byCategory = (cat) => FURNITURE.filter((f) => f.category === cat)

describe('CATEGORIES', () => {
  it('includes Bathroom and Kitchen', () => {
    expect(CATEGORIES).toContain('Bathroom')
    expect(CATEGORIES).toContain('Kitchen')
  })
})

describe('Bathroom category', () => {
  const items = byCategory('Bathroom')

  it('has 8 items', () => {
    expect(items).toHaveLength(8)
  })

  it('includes all expected types', () => {
    const types = items.map((f) => f.type)
    expect(types).toContain('toilet')
    expect(types).toContain('basin')
    expect(types).toContain('bathtub')
    expect(types).toContain('shower-tray')
    expect(types).toContain('towel-rack')
    expect(types).toContain('bathroom-mirror')
    expect(types).toContain('vanity-unit')
    expect(types).toContain('laundry-basket')
  })

  it('wall-mounted items have wallMounted:true and mountHeight', () => {
    const mounted = items.filter((f) => f.wallMounted)
    expect(mounted.map((f) => f.type)).toEqual(
      expect.arrayContaining(['towel-rack', 'bathroom-mirror']),
    )
    for (const f of mounted) {
      expect(f.wallMounted).toBe(true)
      expect(typeof f.mountHeight).toBe('number')
      expect(f.mountHeight).toBeGreaterThan(0)
    }
  })

  it('floor items do not have wallMounted', () => {
    const floorItems = items.filter((f) => !f.wallMounted)
    expect(floorItems).toHaveLength(6)
    for (const f of floorItems) {
      expect(f.wallMounted).toBeFalsy()
    }
  })
})

describe('Kitchen category', () => {
  const items = byCategory('Kitchen')

  it('has 10 items', () => {
    expect(items).toHaveLength(10)
  })

  it('includes all expected types', () => {
    const types = items.map((f) => f.type)
    expect(types).toContain('kitchen-sink')
    expect(types).toContain('fridge')
    expect(types).toContain('oven')
    expect(types).toContain('dishwasher')
    expect(types).toContain('microwave')
    expect(types).toContain('upper-cabinet')
    expect(types).toContain('range-hood')
    expect(types).toContain('kitchen-island')
    expect(types).toContain('pantry-unit')
    expect(types).toContain('bar-stool')
  })

  it('wall-mounted items have wallMounted:true and mountHeight', () => {
    const mounted = items.filter((f) => f.wallMounted)
    expect(mounted.map((f) => f.type)).toEqual(
      expect.arrayContaining(['microwave', 'upper-cabinet', 'range-hood']),
    )
    for (const f of mounted) {
      expect(f.wallMounted).toBe(true)
      expect(typeof f.mountHeight).toBe('number')
      expect(f.mountHeight).toBeGreaterThan(0)
    }
  })
})

describe('all items', () => {
  it('every item has required fields', () => {
    for (const f of FURNITURE) {
      expect(f.type, `${f.type} missing type`).toBeTruthy()
      expect(f.label, `${f.type} missing label`).toBeTruthy()
      expect(f.category, `${f.type} missing category`).toBeTruthy()
      expect(typeof f.width, `${f.type} width type`).toBe('number')
      expect(typeof f.depth, `${f.type} depth type`).toBe('number')
      expect(typeof f.height, `${f.type} height type`).toBe('number')
      expect(f.color, `${f.type} missing color`).toBeTruthy()
    }
  })

  it('getFurnitureSpec returns null for unknown type', () => {
    expect(getFurnitureSpec('not-a-thing')).toBeNull()
  })

  it('getFurnitureSpec returns spec for every catalog type', () => {
    for (const f of FURNITURE) {
      expect(getFurnitureSpec(f.type)).toBe(f)
    }
  })
})
