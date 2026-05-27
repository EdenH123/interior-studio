import { describe, it, expect, beforeEach } from 'vitest'
import { cache, touch, enforceLimit } from './furnitureModelCache'

const loaded = () => ({ state: 'loaded', listeners: new Set() })
const loading = () => ({ state: 'loading', listeners: new Set() })

beforeEach(() => cache.clear())

describe('furnitureModelCache LRU', () => {
  it('touch moves a key to most-recently-used (end of insertion order)', () => {
    cache.set('a', loaded())
    cache.set('b', loaded())
    cache.set('c', loaded())
    touch('a')
    expect([...cache.keys()]).toEqual(['b', 'c', 'a'])
  })

  it('touch is a no-op for an unknown key', () => {
    cache.set('a', loaded())
    touch('missing')
    expect([...cache.keys()]).toEqual(['a'])
  })

  it('enforceLimit keeps the cache at or under the cap, evicting oldest first', () => {
    for (let i = 0; i < 45; i++) cache.set(`m${i}`, loaded())
    enforceLimit()
    expect(cache.size).toBe(40)
    // The 5 oldest (m0..m4) are evicted; the newest survive.
    expect(cache.has('m0')).toBe(false)
    expect(cache.has('m4')).toBe(false)
    expect(cache.has('m5')).toBe(true)
    expect(cache.has('m44')).toBe(true)
  })

  it('enforceLimit never evicts in-flight (loading) entries', () => {
    cache.set('pending', loading())
    for (let i = 0; i < 44; i++) cache.set(`m${i}`, loaded())
    enforceLimit()
    expect(cache.has('pending')).toBe(true)
    expect(cache.size).toBe(40)
  })

  it('enforceLimit does nothing under the cap', () => {
    for (let i = 0; i < 10; i++) cache.set(`m${i}`, loaded())
    enforceLimit()
    expect(cache.size).toBe(10)
  })
})
