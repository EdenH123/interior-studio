import { describe, it, expect } from 'vitest'
import { kelvinToRgb, kelvinToHex } from './colorTemp'

describe('kelvinToRgb', () => {
  it('returns r=255 for warm temps', () => {
    const { r } = kelvinToRgb(2700)
    expect(r).toBe(255)
  })

  it('returns b=255 for temps above 6600 K', () => {
    const { b } = kelvinToRgb(7000)
    expect(b).toBe(255)
  })

  it('has high blue channel for cool daylight (6500 K)', () => {
    const { b } = kelvinToRgb(6500)
    expect(b).toBeGreaterThanOrEqual(248)
  })

  it('pure white at ~6600 K has r≈g≈b≈255', () => {
    const { r, g, b } = kelvinToRgb(6600)
    expect(r).toBe(255)
    expect(g).toBeGreaterThan(220)
    expect(b).toBe(255)
  })

  it('warm candlelight (1900K) has very low blue', () => {
    const { b } = kelvinToRgb(1900)
    expect(b).toBe(0)
  })

  it('clamps values below 1000 K to 1000', () => {
    const a = kelvinToRgb(1000)
    const b = kelvinToRgb(500)
    expect(a).toEqual(b)
  })

  it('clamps values above 40000 K to 40000', () => {
    const a = kelvinToRgb(40000)
    const b = kelvinToRgb(99999)
    expect(a).toEqual(b)
  })

  it('returns integers in 0-255 range', () => {
    for (const t of [2000, 2700, 3000, 4000, 5000, 6500, 10000]) {
      const { r, g, b } = kelvinToRgb(t)
      for (const v of [r, g, b]) {
        expect(Number.isInteger(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(255)
      }
    }
  })
})

describe('kelvinToHex', () => {
  it('returns a 7-char hex string', () => {
    expect(kelvinToHex(3000)).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('warm 2700K is reddish-orange', () => {
    const hex = kelvinToHex(2700)
    const r = parseInt(hex.slice(1, 3), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    expect(r).toBeGreaterThan(b + 50)
  })
})
