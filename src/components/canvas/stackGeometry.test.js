import { describe, it, expect } from 'vitest'
import { findStackTarget, resolveStackedYOffset } from './stackGeometry'
import { PIXELS_PER_METER } from './constants'

// 1m × 1m item centered at origin → footprint covers [-25..25] in both axes.
const wardrobe = {
  id: 'w1', type: 'wardrobe', x: 0, y: 0, rotation: 0,
  width: 1, depth: 1, height: 2.0, levelId: 'L0',
}
// Light at the same spot — should be skipped as a stack target.
const lamp = {
  id: 'l1', type: 'lighting:table-lamp', x: 0, y: 0, rotation: 0,
  width: 0.3, depth: 0.3, height: 0.5, levelId: 'L0',
}

describe('findStackTarget', () => {
  it('returns the furniture whose footprint contains the cursor', () => {
    const target = findStackTarget({ x: 10, y: 10 }, null, [wardrobe])
    expect(target?.id).toBe('w1')
  })

  it('returns null when cursor is outside any footprint', () => {
    const target = findStackTarget({ x: 200, y: 200 }, null, [wardrobe])
    expect(target).toBeNull()
  })

  it('skips lighting items even if cursor is inside their footprint', () => {
    const target = findStackTarget({ x: 0, y: 0 }, null, [lamp])
    expect(target).toBeNull()
  })

  it('skips wall-mounted items', () => {
    const sconce = { ...wardrobe, id: 's1', wallMounted: true }
    expect(findStackTarget({ x: 0, y: 0 }, null, [sconce])).toBeNull()
  })

  it('skips stairs and railings', () => {
    const stair = { ...wardrobe, id: 'st1', stairStyle: 'standard' }
    const rail = { ...wardrobe, id: 'r1', railingStyle: 'wood' }
    expect(findStackTarget({ x: 0, y: 0 }, null, [stair])).toBeNull()
    expect(findStackTarget({ x: 0, y: 0 }, null, [rail])).toBeNull()
  })

  it("doesn't return the dragging item itself", () => {
    const target = findStackTarget({ x: 0, y: 0 }, wardrobe, [wardrobe])
    expect(target).toBeNull()
  })

  it('prevents cycles by skipping descendants of the dragging item', () => {
    // tv is stacked on wardrobe; if user drags wardrobe over tv, tv must
    // NOT be considered a stack target.
    const tv = { ...wardrobe, id: 't1', width: 0.5, depth: 0.3, height: 0.3, stackedOn: 'w1' }
    const target = findStackTarget({ x: 0, y: 0 }, wardrobe, [wardrobe, tv])
    expect(target).toBeNull()
  })

  it('prefers smaller-footprint candidates when nested', () => {
    const big = { ...wardrobe, id: 'big', width: 2, depth: 2 }
    const small = { ...wardrobe, id: 'small', width: 0.5, depth: 0.5 }
    const target = findStackTarget({ x: 0, y: 0 }, null, [big, small])
    expect(target?.id).toBe('small')
  })

  it('honours rotation when testing containment', () => {
    // 2 m × 0.5 m item rotated 90° → footprint becomes 0.5 m × 2 m.
    const narrow = { ...wardrobe, id: 'n1', width: 2, depth: 0.5, rotation: 90 }
    // (40, 0) is OUTSIDE the unrotated rect but INSIDE the rotated one.
    const hit = findStackTarget({ x: 0, y: 40 }, null, [narrow])
    expect(hit?.id).toBe('n1')
    const miss = findStackTarget({ x: 40, y: 0 }, null, [narrow])
    expect(miss).toBeNull()
  })

  it('skips candidates on a different level', () => {
    const child = { ...wardrobe, id: 'c1', levelId: 'L1' }
    expect(findStackTarget({ x: 0, y: 0 }, child, [wardrobe])).toBeNull()
  })
})

describe('resolveStackedYOffset', () => {
  const auto = () => 0

  it('returns elevation when set and not stacked', () => {
    const f = { id: 'a', height: 1.0, elevation: 0.5 }
    const y = resolveStackedYOffset(f, new Map([[f.id, f]]), auto)
    expect(y).toBe(0.5)
  })

  it('returns mountHeight for wall-mounted items', () => {
    const f = { id: 'a', height: 1.0, wallMounted: true, mountHeight: 1.5 }
    const y = resolveStackedYOffset(f, new Map([[f.id, f]]), auto)
    expect(y).toBe(1.5)
  })

  it('walks the stackedOn chain and sums parent heights', () => {
    const ward = { id: 'w', height: 2.0 }
    const drawer = { id: 'd', height: 0.4, stackedOn: 'w' }
    const tv = { id: 't', height: 0.6, stackedOn: 'd' }
    const byId = new Map([['w', ward], ['d', drawer], ['t', tv]])
    expect(resolveStackedYOffset(ward, byId, auto)).toBe(0)
    expect(resolveStackedYOffset(drawer, byId, auto)).toBe(2.0)
    expect(resolveStackedYOffset(tv, byId, auto)).toBe(2.4)
  })

  it('falls back to floor when a stack parent is missing', () => {
    const orphan = { id: 'o', height: 1, stackedOn: 'gone' }
    const y = resolveStackedYOffset(orphan, new Map([['o', orphan]]), auto)
    expect(y).toBe(0)
  })

  it('handles cycles without infinite recursion', () => {
    const a = { id: 'a', height: 1, stackedOn: 'b' }
    const b = { id: 'b', height: 2, stackedOn: 'a' }
    const byId = new Map([['a', a], ['b', b]])
    // Just assert it terminates with a finite number.
    expect(Number.isFinite(resolveStackedYOffset(a, byId, auto))).toBe(true)
  })

  it('elevation is ignored when stackedOn wins', () => {
    const ward = { id: 'w', height: 2.0 }
    const tv = { id: 't', height: 0.6, elevation: 0.1, stackedOn: 'w' }
    const byId = new Map([['w', ward], ['t', tv]])
    expect(resolveStackedYOffset(tv, byId, auto)).toBe(2.0)
  })
})

// Sanity-check the PIXELS_PER_METER assumption used in containment tests above.
describe('PIXELS_PER_METER sanity', () => {
  it('is 50 (1 m = 50 px)', () => {
    expect(PIXELS_PER_METER).toBe(50)
  })
})
