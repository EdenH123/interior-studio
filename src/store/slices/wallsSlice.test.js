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

describe('wallsSlice cross-slice: railing cascade', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => ({
      ...createWallsSlice(set, get),
      furniture: [],
      selection: null,
    }))
  })

  it('removes railings mounted on the deleted wall and clears their selection', () => {
    store.getState().addWall(0, 0, 200, 0)
    const wallId = store.getState().walls[0].id
    store.setState({
      furniture: [
        { id: 'r1', type: 'railing-cable', mountWallId: wallId },
        { id: 'f2', type: 'sofa' },                       // unrelated, stays
      ],
      selection: { items: [{ kind: 'furniture', id: 'r1' }] },
    })
    store.getState().removeWall(wallId)
    const { furniture, selection } = store.getState()
    expect(furniture.map((f) => f.id)).toEqual(['f2'])
    expect(selection).toBeNull()
  })
})

describe('wallsSlice.moveWallVertices', () => {
  const make = (activeLevel = null) =>
    create((set, get) => ({ ...createWallsSlice(set, get), activeLevel }))

  it('moves every wall endpoint coincident with a corner (room stays closed)', () => {
    const store = make()
    store.getState().addWall(0, 0, 100, 0)     // A — shares corner (100,0)
    store.getState().addWall(100, 0, 100, 100) // B — shares corner (100,0)
    store.getState().moveWallVertices([{ from: { x: 100, y: 0 }, to: { x: 120, y: 10 } }])
    const [a, b] = store.getState().walls
    expect(a).toMatchObject({ x1: 0, y1: 0, x2: 120, y2: 10 }) // A's shared end moved
    expect(b).toMatchObject({ x1: 120, y1: 10, x2: 100, y2: 100 }) // B's shared end moved
  })

  it('leaves non-coincident endpoints untouched', () => {
    const store = make()
    store.getState().addWall(0, 0, 100, 0)
    store.getState().addWall(100, 0, 100, 100)
    store.getState().moveWallVertices([{ from: { x: 0, y: 0 }, to: { x: -5, y: -5 } }])
    const [a, b] = store.getState().walls
    expect(a).toMatchObject({ x1: -5, y1: -5 })
    expect(b).toMatchObject({ x1: 100, y1: 0 }) // unchanged
  })

  it('applies multiple moves at once (edge slide) against pre-move coords', () => {
    const store = make()
    store.getState().addWall(0, 0, 100, 0) // slide both endpoints down by 30
    store.getState().moveWallVertices([
      { from: { x: 0, y: 0 }, to: { x: 0, y: 30 } },
      { from: { x: 100, y: 0 }, to: { x: 100, y: 30 } },
    ])
    expect(store.getState().walls[0]).toMatchObject({ x1: 0, y1: 30, x2: 100, y2: 30 })
  })

  it('only moves walls on the active level', () => {
    const store = make('L0')
    store.getState().addWall(0, 0, 100, 0) // levelId L0
    store.setState({
      walls: [...store.getState().walls, { id: 'x', x1: 0, y1: 0, x2: 50, y2: 0, levelId: 'L1' }],
    })
    store.getState().moveWallVertices([{ from: { x: 0, y: 0 }, to: { x: 10, y: 0 } }])
    const l0 = store.getState().walls.find((w) => w.levelId === 'L0')
    const l1 = store.getState().walls.find((w) => w.id === 'x')
    expect(l0).toMatchObject({ x1: 10, y1: 0 })
    expect(l1).toMatchObject({ x1: 0, y1: 0 }) // other level untouched
  })
})
