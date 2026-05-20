import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createFurnitureSlice } from './furnitureSlice'
import { FURNITURE, getFurnitureSpec } from '../../components/canvas/furnitureCatalog'

describe('furnitureSlice', () => {
  // Furniture's addFurniture auto-selects, so we compose with a stub
  // selection slot to keep the slice's full behaviour testable.
  let store
  beforeEach(() => {
    store = create((set, get) => ({
      ...createFurnitureSlice(set, get),
      selection: null,
    }))
  })

  it('starts empty', () => {
    expect(store.getState().furniture).toEqual([])
  })

  it('addFurniture instantiates a piece from the catalog spec', () => {
    const id = store.getState().addFurniture('sofa', 0, 0)
    const spec = getFurnitureSpec('sofa')
    const f = store.getState().furniture[0]
    expect(id).toBe(f.id)
    expect(f).toMatchObject({
      type: 'sofa', x: 0, y: 0, rotation: 0,
      width: spec.width, depth: spec.depth, height: spec.height,
      color: spec.color, model: spec.model ?? null,
    })
  })

  it('addFurniture returns null for an unknown type and adds nothing', () => {
    const id = store.getState().addFurniture('nonexistent', 0, 0)
    expect(id).toBeNull()
    expect(store.getState().furniture).toEqual([])
  })

  it('addFurniture sets selection to the new piece', () => {
    const id = store.getState().addFurniture('chair', 50, 50)
    expect(store.getState().selection).toEqual({ items: [{ kind: 'furniture', id }] })
  })

  it('updateFurniture merges patches onto the targeted piece', () => {
    const id = store.getState().addFurniture('chair', 0, 0)
    store.getState().updateFurniture(id, { x: 100, y: 200 })
    const f = store.getState().furniture[0]
    expect(f.x).toBe(100)
    expect(f.y).toBe(200)
    expect(f.rotation).toBe(0)
  })

  it('rotateFurniture wraps to [0, 360)', () => {
    const id = store.getState().addFurniture('chair', 0, 0)
    store.getState().rotateFurniture(id, 15)
    expect(store.getState().furniture[0].rotation).toBe(15)
    store.getState().rotateFurniture(id, 360)
    expect(store.getState().furniture[0].rotation).toBe(15)
    store.getState().rotateFurniture(id, -30)
    expect(store.getState().furniture[0].rotation).toBe(345)
  })

  it('removeFurniture drops the matching piece and clears its selection', () => {
    const id = store.getState().addFurniture('chair', 0, 0)
    store.getState().removeFurniture(id)
    expect(store.getState().furniture).toEqual([])
    expect(store.getState().selection).toBeNull()
  })

  it('catalog exposes every type — sanity check the spec loop', () => {
    // Guards against a future change where a catalog item omits a field
    // addFurniture depends on. Tries to add one of each.
    for (const item of FURNITURE) {
      const id = store.getState().addFurniture(item.type, 0, 0)
      expect(id).not.toBeNull()
    }
    expect(store.getState().furniture).toHaveLength(FURNITURE.length)
  })
})
