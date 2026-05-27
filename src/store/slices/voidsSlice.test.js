import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createVoidsSlice } from './voidsSlice'

const tri = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }]

describe('voidsSlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => ({
      ...createVoidsSlice(set, get),
      activeLevel: 'L0',
      selection: null,
    }))
  })

  it('starts empty with no draft', () => {
    expect(store.getState().voids).toEqual([])
    expect(store.getState().voidDraft).toBeNull()
  })

  it('finishVoidDraft commits a ≥3-point polygon on the active level + selects it', () => {
    tri.forEach((p) => store.getState().addVoidPoint(p))
    store.getState().finishVoidDraft()
    const v = store.getState().voids[0]
    expect(v).toMatchObject({ verts: tri, name: '', levelId: 'L0' })
    expect(store.getState().voidDraft).toBeNull()
    expect(store.getState().selection).toEqual({ items: [{ kind: 'void', id: v.id }] })
  })

  it('finishVoidDraft drops a draft with fewer than 3 points', () => {
    store.getState().addVoidPoint({ x: 0, y: 0 })
    store.getState().finishVoidDraft()
    expect(store.getState().voids).toEqual([])
  })

  it('removeVoid clears a matching selection; moveVoidVertices moves by index', () => {
    store.getState().addVoid(tri)
    const id = store.getState().voids[0].id
    store.getState().moveVoidVertices(id, [{ index: 0, x: -5, y: -5 }])
    expect(store.getState().voids[0].verts[0]).toEqual({ x: -5, y: -5 })
    store.getState().removeVoid(id)
    expect(store.getState().voids).toEqual([])
    expect(store.getState().selection).toBeNull()
  })
})
