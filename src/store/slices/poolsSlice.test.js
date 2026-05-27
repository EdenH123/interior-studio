import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPoolsSlice } from './poolsSlice'

const tri = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }]

describe('poolsSlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => ({
      ...createPoolsSlice(set, get),
      activeLevel: 'L0',
      selection: null,
    }))
  })

  it('starts empty with no draft', () => {
    expect(store.getState().pools).toEqual([])
    expect(store.getState().poolDraft).toBeNull()
  })

  it('finishPoolDraft commits a polygon with a default depth + active level', () => {
    tri.forEach((p) => store.getState().addPoolPoint(p))
    store.getState().finishPoolDraft()
    const pool = store.getState().pools[0]
    expect(pool).toMatchObject({ verts: tri, name: '', levelId: 'L0' })
    expect(pool.depth).toBeGreaterThan(0)
    expect(store.getState().poolDraft).toBeNull()
    expect(store.getState().selection).toEqual({ items: [{ kind: 'pool', id: pool.id }] })
  })

  it('finishPoolDraft drops a draft with fewer than 3 points', () => {
    store.getState().addPoolPoint({ x: 0, y: 0 })
    store.getState().addPoolPoint({ x: 10, y: 0 })
    store.getState().finishPoolDraft()
    expect(store.getState().pools).toEqual([])
    expect(store.getState().poolDraft).toBeNull()
  })

  it('updatePool sets depth/name; removePool clears matching selection', () => {
    store.getState().addPool(tri)
    const id = store.getState().pools[0].id
    store.getState().updatePool(id, { depth: 2.2, name: 'Lap pool' })
    expect(store.getState().pools[0]).toMatchObject({ depth: 2.2, name: 'Lap pool' })
    store.getState().removePool(id)
    expect(store.getState().pools).toEqual([])
    expect(store.getState().selection).toBeNull()
  })

  it('movePoolVertices moves vertices by index', () => {
    store.getState().addPool(tri)
    const id = store.getState().pools[0].id
    store.getState().movePoolVertices(id, [{ index: 1, x: 120, y: 10 }])
    expect(store.getState().pools[0].verts[1]).toEqual({ x: 120, y: 10 })
    expect(store.getState().pools[0].verts[0]).toEqual({ x: 0, y: 0 })
  })
})
