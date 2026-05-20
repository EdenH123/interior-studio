import { describe, it, expect } from 'vitest'
import { SHERWIN_WILLIAMS } from './sherwinWilliamsColors'

describe('sherwinWilliamsColors catalog', () => {
  it('has the curated ~30-color set', () => {
    expect(SHERWIN_WILLIAMS.length).toBeGreaterThanOrEqual(25)
    expect(SHERWIN_WILLIAMS.length).toBeLessThanOrEqual(40)
  })

  it('every entry has id + name + SW code + hex', () => {
    for (const c of SHERWIN_WILLIAMS) {
      expect(c.id).toMatch(/^sw-[a-z0-9-]+$/)
      expect(c.name).toEqual(expect.any(String))
      expect(c.name.length).toBeGreaterThan(0)
      // SW codes look like "SW 7005" or "SW 9109"
      expect(c.code).toMatch(/^SW \d{4}$/)
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('ids are unique', () => {
    const ids = SHERWIN_WILLIAMS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes some well-known colors', () => {
    const names = SHERWIN_WILLIAMS.map((c) => c.name)
    expect(names).toContain('Agreeable Gray')
    expect(names).toContain('Alabaster')
    expect(names).toContain('Naval')
  })
})
