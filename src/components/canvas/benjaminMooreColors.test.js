import { describe, it, expect } from 'vitest'
import { BENJAMIN_MOORE } from './benjaminMooreColors'

describe('benjaminMooreColors catalog', () => {
  it('has the curated ~30-color set', () => {
    expect(BENJAMIN_MOORE.length).toBeGreaterThanOrEqual(25)
    expect(BENJAMIN_MOORE.length).toBeLessThanOrEqual(40)
  })

  it('every entry has id + name + code + hex', () => {
    for (const c of BENJAMIN_MOORE) {
      expect(c.id).toMatch(/^bm-[a-z0-9-]+$/)
      expect(c.name).toEqual(expect.any(String))
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.code).toEqual(expect.any(String))
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('ids are unique', () => {
    const ids = BENJAMIN_MOORE.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes some well-known colors', () => {
    const names = BENJAMIN_MOORE.map((c) => c.name)
    expect(names).toContain('Hale Navy')
    expect(names).toContain('Revere Pewter')
    expect(names).toContain('White Dove')
  })
})
