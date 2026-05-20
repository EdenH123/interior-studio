import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createWallsSlice } from './wallsSlice'

// Slices are tested with a freshly-created Zustand store containing only
// the slice under test (or a minimal composition when cross-slice writes
// are involved). The real composer is exercised in useStore.test.js.

describe('wallsSlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => createWallsSlice(set, get))
  })

  it('starts with no walls', () => {
    expect(store.getState().walls).toEqual([])
  })

  it('addWall appends a wall with all coords + a generated id', () => {
    store.getState().addWall(0, 0, 100, 0)
    const { walls } = store.getState()
    expect(walls).toHaveLength(1)
    expect(walls[0]).toMatchObject({ x1: 0, y1: 0, x2: 100, y2: 0 })
    expect(walls[0].id).toEqual(expect.any(String))
    expect(walls[0].id.length).toBeGreaterThan(0)
  })

  it('addWall gives every wall a unique id', () => {
    store.getState().addWall(0, 0, 100, 0)
    store.getState().addWall(100, 0, 100, 100)
    const ids = store.getState().walls.map((w) => w.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('updateWall merges a patch onto the targeted wall', () => {
    store.getState().addWall(0, 0, 100, 0)
    const id = store.getState().walls[0].id
    store.getState().updateWall(id, { x2: 200, material: 'brick' })
    const w = store.getState().walls[0]
    expect(w.x1).toBe(0)
    expect(w.x2).toBe(200)
    expect(w.material).toBe('brick')
  })

  it('updateWall is a no-op for unknown ids', () => {
    store.getState().addWall(0, 0, 100, 0)
    const before = store.getState().walls
    store.getState().updateWall('does-not-exist', { x2: 999 })
    expect(store.getState().walls).toEqual(before)
  })

  it('removeWall drops the matching wall', () => {
    store.getState().addWall(0, 0, 100, 0)
    store.getState().addWall(100, 0, 100, 100)
    const idToRemove = store.getState().walls[0].id
    store.getState().removeWall(idToRemove)
    const { walls } = store.getState()
    expect(walls).toHaveLength(1)
    expect(walls[0].id).not.toBe(idToRemove)
  })
})

describe('wallsSlice cross-slice: selection clearing', () => {
  // Compose the walls slice with a tiny stand-in selection slice so the
  // cross-slice effect of removeWall (clearing a matching selection) can
  // be tested without dragging the whole uiSlice in.
  let store
  beforeEach(() => {
    store = create((set, get) => ({
      ...createWallsSlice(set, get),
      selection: null,
      _setSelection: (sel) => set({ selection: sel }),
    }))
  })

  it('clears selection when the selected wall is removed', () => {
    store.getState().addWall(0, 0, 100, 0)
    const id = store.getState().walls[0].id
    store.getState()._setSelection({ items: [{ kind: 'wall', id }] })
    store.getState().removeWall(id)
    expect(store.getState().selection).toBeNull()
  })

  it('leaves an unrelated selection alone', () => {
    store.getState().addWall(0, 0, 100, 0)
    store.getState().addWall(0, 0, 50, 50)
    const [a, b] = store.getState().walls
    store.getState()._setSelection({ items: [{ kind: 'wall', id: b.id }] })
    store.getState().removeWall(a.id)
    expect(store.getState().selection).toEqual({ items: [{ kind: 'wall', id: b.id }] })
  })
})
