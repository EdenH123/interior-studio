import { describe, it, expect } from 'vitest'
import { WOOD_FINISHES } from './woodFinishes'

describe('woodFinishes catalog', () => {
  it('has the spec-required 15 finishes', () => {
    expect(WOOD_FINISHES.length).toBe(15)
  })

  it('every entry has id + name + hex (no manufacturer code)', () => {
    for (const w of WOOD_FINISHES) {
      expect(w.id).toMatch(/^wood-[a-z0-9-]+$/)
      expect(w.name).toEqual(expect.any(String))
      expect(w.name.length).toBeGreaterThan(0)
      expect(w.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(w.code).toBeUndefined()
    }
  })

  it('ids are unique', () => {
    const ids = WOOD_FINISHES.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes the classic finishes', () => {
    const names = WOOD_FINISHES.map((w) => w.name)
    expect(names).toEqual(
      expect.arrayContaining(['Walnut', 'Honey Oak', 'Mahogany', 'Cherry', 'Maple']),
    )
  })
})
