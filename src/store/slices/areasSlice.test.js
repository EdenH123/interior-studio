import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createAreasSlice } from './areasSlice'

const tri = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }]

describe('areasSlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => ({
      ...createAreasSlice(set, get),
      activeLevel: 'L0',
      selection: null,
    }))
  })

  it('starts empty with no draft', () => {
    expect(store.getState().areas).toEqual([])
    expect(store.getState().areaDraft).toBeNull()
  })

  it('addArea stores verts + active level and selects it', () => {
    store.getState().addArea(tri)
    const a = store.getState().areas[0]
    expect(a).toMatchObject({ verts: tri, name: '', floorMaterial: null, levelId: 'L0' })
    expect(store.getState().selection).toEqual({ items: [{ kind: 'area', id: a.id }] })
  })

  it('updateArea merges a patch (name / material)', () => {
    store.getState().addArea(tri)
    const id = store.getState().areas[0].id
    store.getState().updateArea(id, { name: 'Patio', floorMaterial: 'tile' })
    expect(store.getState().areas[0]).toMatchObject({ name: 'Patio', floorMaterial: 'tile' })
  })

  it('removeArea drops it and clears a matching selection', () => {
    store.getState().addArea(tri)
    const id = store.getState().areas[0].id
    store.getState().removeArea(id)
    expect(store.getState().areas).toEqual([])
    expect(store.getState().selection).toBeNull()
  })

  it('addAreaPoint appends to the draft', () => {
    store.getState().addAreaPoint({ x: 1, y: 2 })
    store.getState().addAreaPoint({ x: 3, y: 4 })
    expect(store.getState().areaDraft).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }])
  })

  it('finishAreaDraft commits a polygon of ≥3 points and clears the draft', () => {
    tri.forEach((p) => store.getState().addAreaPoint(p))
    store.getState().finishAreaDraft()
    expect(store.getState().areaDraft).toBeNull()
    expect(store.getState().areas).toHaveLength(1)
    expect(store.getState().areas[0].verts).toEqual(tri)
  })

  it('finishAreaDraft drops a draft with fewer than 3 points (no area)', () => {
    store.getState().addAreaPoint({ x: 0, y: 0 })
    store.getState().addAreaPoint({ x: 10, y: 0 })
    store.getState().finishAreaDraft()
    expect(store.getState().areas).toEqual([])
    expect(store.getState().areaDraft).toBeNull()
  })

  it('cancelAreaDraft clears the draft without committing', () => {
    tri.forEach((p) => store.getState().addAreaPoint(p))
    store.getState().cancelAreaDraft()
    expect(store.getState().areaDraft).toBeNull()
    expect(store.getState().areas).toEqual([])
  })
})
