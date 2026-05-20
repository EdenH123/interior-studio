import { describe, it, expect } from 'vitest'
import {
  validateProposedProject, diffProject, diffIsEmpty, totalChangeCount,
} from './aiApply'

const okWall = { id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }
const okFurniture = {
  id: 'f1', type: 'sofa', x: 0, y: 0, rotation: 0,
  width: 2, depth: 0.9, height: 0.85, color: '#475569',
}
const okOpening = {
  id: 'o1', type: 'door', wallId: 'w1', position: 0.5,
  width: 0.9, height: 2.1,
}
const okShape = () => ({ walls: [okWall], openings: [okOpening], furniture: [okFurniture], roomMeta: {} })

describe('validateProposedProject', () => {
  it('accepts a minimal valid shape', () => {
    const r = validateProposedProject(okShape())
    expect(r.ok).toBe(true)
    expect(r.data.walls).toHaveLength(1)
  })

  it('accepts empty arrays + empty meta', () => {
    expect(validateProposedProject({ walls: [], furniture: [], roomMeta: {} }).ok).toBe(true)
  })

  it('rejects non-object input', () => {
    expect(validateProposedProject(null).ok).toBe(false)
    expect(validateProposedProject('string').ok).toBe(false)
    expect(validateProposedProject(42).ok).toBe(false)
  })

  it('rejects missing keys', () => {
    expect(validateProposedProject({ furniture: [], roomMeta: {} }).ok).toBe(false)
    expect(validateProposedProject({ walls: [], roomMeta: {} }).ok).toBe(false)
    expect(validateProposedProject({ walls: [], furniture: [] }).ok).toBe(false)
  })

  it('rejects roomMeta arrays', () => {
    expect(validateProposedProject({ walls: [], furniture: [], roomMeta: [] }).ok).toBe(false)
  })

  it('rejects walls missing id or with NaN coords', () => {
    expect(validateProposedProject({
      walls: [{ x1: 0, y1: 0, x2: 100, y2: 0 }],
      furniture: [], roomMeta: {},
    }).ok).toBe(false)
    expect(validateProposedProject({
      walls: [{ id: 'w', x1: 0, y1: 0, x2: NaN, y2: 0 }],
      furniture: [], roomMeta: {},
    }).ok).toBe(false)
  })

  it('rejects furniture missing id or type or finite numerics', () => {
    expect(validateProposedProject({
      walls: [], furniture: [{ ...okFurniture, id: undefined }], roomMeta: {},
    }).ok).toBe(false)
    expect(validateProposedProject({
      walls: [], furniture: [{ ...okFurniture, type: undefined }], roomMeta: {},
    }).ok).toBe(false)
    expect(validateProposedProject({
      walls: [], furniture: [{ ...okFurniture, width: Infinity }], roomMeta: {},
    }).ok).toBe(false)
  })
})

describe('diffProject', () => {
  it('reports no change when input matches current', () => {
    const d = diffProject(okShape(), okShape())
    expect(diffIsEmpty(d)).toBe(true)
    expect(totalChangeCount(d)).toBe(0)
  })

  it('detects added walls', () => {
    const current = okShape()
    const proposed = { ...okShape(), walls: [okWall, { id: 'w2', x1: 0, y1: 100, x2: 100, y2: 100 }] }
    const d = diffProject(current, proposed)
    expect(d.walls.added.map((w) => w.id)).toEqual(['w2'])
    expect(d.walls.removed).toEqual([])
    expect(d.walls.modified).toEqual([])
  })

  it('detects removed walls', () => {
    const current = okShape()
    const proposed = { ...okShape(), walls: [] }
    const d = diffProject(current, proposed)
    expect(d.walls.removed.map((w) => w.id)).toEqual(['w1'])
  })

  it('detects modified walls when geometry changes', () => {
    const current = okShape()
    const proposed = { ...okShape(), walls: [{ ...okWall, x2: 200 }] }
    const d = diffProject(current, proposed)
    expect(d.walls.modified.map((w) => w.id)).toEqual(['w1'])
    expect(d.walls.added).toEqual([])
  })

  it('treats identical wall geometry but new material as a modification', () => {
    const current = okShape()
    const proposed = { ...okShape(), walls: [{ ...okWall, material: 'brick' }] }
    const d = diffProject(current, proposed)
    expect(d.walls.modified.map((w) => w.id)).toEqual(['w1'])
  })

  it('treats `material: null` and missing material as equal', () => {
    const current = { walls: [{ ...okWall, material: null }], furniture: [], roomMeta: {} }
    const proposed = { walls: [{ ...okWall }], furniture: [], roomMeta: {} }
    const d = diffProject(current, proposed)
    expect(d.walls.modified).toEqual([])
  })

  it('detects roomMeta added / removed / modified', () => {
    const current = { walls: [], furniture: [], roomMeta: { a: { name: 'A' }, b: { name: 'B' } } }
    const proposed = { walls: [], furniture: [], roomMeta: { b: { name: 'B renamed' }, c: { name: 'C' } } }
    const d = diffProject(current, proposed)
    expect(d.roomMeta.added.map((r) => r.id)).toEqual(['c'])
    expect(d.roomMeta.removed.map((r) => r.id)).toEqual(['a'])
    expect(d.roomMeta.modified.map((r) => r.id)).toEqual(['b'])
  })

  it('totalChangeCount sums everything', () => {
    const current = okShape()
    const proposed = {
      walls: [{ id: 'w2', x1: 0, y1: 0, x2: 50, y2: 0 }], // added (w2), removed (w1)
      openings: [], // removed (o1)
      furniture: [{ ...okFurniture, x: 999 }], // modified
      roomMeta: { r1: { name: 'A' } }, // added
    }
    const d = diffProject(current, proposed)
    expect(totalChangeCount(d)).toBe(5)
  })
})

describe('validateProposedProject — openings', () => {
  it('treats missing openings as empty', () => {
    const r = validateProposedProject({ walls: [], furniture: [], roomMeta: {} })
    expect(r.ok).toBe(true)
    expect(r.data.openings).toEqual([])
  })

  it('rejects openings with unknown wallId', () => {
    const r = validateProposedProject({
      walls: [okWall], furniture: [], roomMeta: {},
      openings: [{ ...okOpening, wallId: 'ghost' }],
    })
    expect(r.ok).toBe(false)
  })

  it('rejects openings with bad numeric fields', () => {
    expect(validateProposedProject({
      walls: [okWall], furniture: [], roomMeta: {},
      openings: [{ ...okOpening, position: 2 }],
    }).ok).toBe(false)
    expect(validateProposedProject({
      walls: [okWall], furniture: [], roomMeta: {},
      openings: [{ ...okOpening, width: 0 }],
    }).ok).toBe(false)
  })

  it('rejects openings with invalid type', () => {
    expect(validateProposedProject({
      walls: [okWall], furniture: [], roomMeta: {},
      openings: [{ ...okOpening, type: 'skylight' }],
    }).ok).toBe(false)
  })
})

describe('diffProject — openings', () => {
  it('detects added / removed / modified openings', () => {
    const current = okShape()
    const proposed = {
      ...okShape(),
      openings: [
        { ...okOpening, position: 0.7 }, // modified
        { id: 'o2', type: 'window', wallId: 'w1', position: 0.2, width: 1.2, height: 1.4, sillHeight: 0.9 }, // added
      ],
    }
    const d = diffProject(current, proposed)
    expect(d.openings.modified.map((o) => o.id)).toEqual(['o1'])
    expect(d.openings.added.map((o) => o.id)).toEqual(['o2'])
    expect(d.openings.removed).toEqual([])
  })
})
