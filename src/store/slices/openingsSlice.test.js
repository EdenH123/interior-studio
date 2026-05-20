import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createOpeningsSlice } from './openingsSlice'
import { createWallsSlice } from './wallsSlice'

// The openings slice reads from `walls` to validate placement, and the
// walls slice cascades opening removal when a wall is deleted. We compose
// both slices in tests so those interactions can be exercised.

function makeStore() {
  return create((set, get) => ({
    ...createWallsSlice(set, get),
    ...createOpeningsSlice(set, get),
    selection: null,
  }))
}

describe('openingsSlice.addOpening', () => {
  let store
  beforeEach(() => {
    store = makeStore()
    // 10 m wall along the X axis (10 * 50 = 500 px).
    store.getState().addWall(0, 0, 500, 0)
  })

  it('starts with no openings', () => {
    expect(store.getState().openings).toEqual([])
  })

  it('places a door at a normalised position', () => {
    const wallId = store.getState().walls[0].id
    const r = store.getState().addOpening('door', wallId, 0.5)
    expect(r.ok).toBe(true)
    const o = store.getState().openings[0]
    expect(o).toMatchObject({ type: 'door', wallId, position: 0.5 })
    expect(o.width).toBeGreaterThan(0)
    expect(o.height).toBeGreaterThan(0)
  })

  it('auto-selects the new opening', () => {
    const wallId = store.getState().walls[0].id
    const r = store.getState().addOpening('window', wallId, 0.3)
    expect(store.getState().selection).toEqual({ items: [{ kind: 'opening', id: r.id }] })
  })

  it('rejects unknown opening types', () => {
    const wallId = store.getState().walls[0].id
    const r = store.getState().addOpening('skylight', wallId, 0.5)
    expect(r.ok).toBe(false)
    expect(store.getState().openings).toHaveLength(0)
  })

  it('rejects placement on a missing wall', () => {
    const r = store.getState().addOpening('door', 'no-such-wall', 0.5)
    expect(r.ok).toBe(false)
  })

  it('rejects when the wall is shorter than the opening width', () => {
    // 0.3 m wall — narrower than a door (0.9 m).
    store.getState().addWall(0, 0, 15, 0)
    const shortId = store.getState().walls[1].id
    const r = store.getState().addOpening('door', shortId, 0.5)
    expect(r.ok).toBe(false)
  })

  it('clamps position so the footprint stays inside the wall', () => {
    const wallId = store.getState().walls[0].id
    store.getState().addOpening('door', wallId, 0)
    const o = store.getState().openings[0]
    expect(o.position).toBeGreaterThan(0)
    expect(o.position).toBeLessThan(0.5)
  })

  it('refuses to overlap an existing opening on the same wall', () => {
    const wallId = store.getState().walls[0].id
    store.getState().addOpening('door', wallId, 0.5)
    const r = store.getState().addOpening('window', wallId, 0.52)
    expect(r.ok).toBe(false)
    expect(store.getState().openings).toHaveLength(1)
  })
})

describe('openingsSlice.updateOpening', () => {
  let store
  let wallId
  let id
  beforeEach(() => {
    store = makeStore()
    store.getState().addWall(0, 0, 500, 0)
    wallId = store.getState().walls[0].id
    id = store.getState().addOpening('door', wallId, 0.5).id
  })

  it('merges a patch onto the opening', () => {
    const ok = store.getState().updateOpening(id, { width: 1.4 })
    expect(ok).toBe(true)
    expect(store.getState().openings[0].width).toBe(1.4)
  })

  it('rejects an update that would no longer fit', () => {
    const ok = store.getState().updateOpening(id, { width: 99 })
    expect(ok).toBe(false)
    expect(store.getState().openings[0].width).toBeLessThan(2)
  })

  it('rejects an update that would overlap another opening', () => {
    store.getState().addOpening('window', wallId, 0.2)
    const ok = store.getState().updateOpening(id, { position: 0.22 })
    expect(ok).toBe(false)
  })

  it('returns false for unknown ids', () => {
    const ok = store.getState().updateOpening('nope', { width: 1 })
    expect(ok).toBe(false)
  })
})

describe('openingsSlice.toggleDoorOpen', () => {
  let store
  let wallId
  let doorId

  beforeEach(() => {
    store = makeStore()
    store.getState().addWall(0, 0, 500, 0)
    wallId = store.getState().walls[0].id
    doorId = store.getState().addOpening('door', wallId, 0.5).id
  })

  it('new doors have open: false by default', () => {
    expect(store.getState().openings[0].open).toBe(false)
  })

  it('new windows have no open field', () => {
    const wid = store.getState().addOpening('window', wallId, 0.8).id
    const win = store.getState().openings.find((o) => o.id === wid)
    expect(win.open).toBeUndefined()
  })

  it('toggleDoorOpen sets open to true', () => {
    store.getState().toggleDoorOpen(doorId)
    expect(store.getState().openings[0].open).toBe(true)
  })

  it('toggleDoorOpen flips back to false on second call', () => {
    store.getState().toggleDoorOpen(doorId)
    store.getState().toggleDoorOpen(doorId)
    expect(store.getState().openings[0].open).toBe(false)
  })

  it('toggleDoorOpen ignores unknown ids', () => {
    const before = store.getState().openings[0].open
    store.getState().toggleDoorOpen('no-such-id')
    expect(store.getState().openings[0].open).toBe(before)
  })

  it('toggleDoorOpen ignores window ids', () => {
    const winId = store.getState().addOpening('window', wallId, 0.8).id
    store.getState().toggleDoorOpen(winId)
    const win = store.getState().openings.find((o) => o.id === winId)
    expect(win.open).toBeUndefined()
  })
})

describe('openingsSlice.removeOpening + wall cascade', () => {
  let store
  beforeEach(() => {
    store = makeStore()
    store.getState().addWall(0, 0, 500, 0)
  })

  it('removes by id and clears matching selection', () => {
    const wallId = store.getState().walls[0].id
    const id = store.getState().addOpening('door', wallId, 0.5).id
    expect(store.getState().selection).toEqual({ items: [{ kind: 'opening', id }] })
    store.getState().removeOpening(id)
    expect(store.getState().openings).toHaveLength(0)
    expect(store.getState().selection).toBeNull()
  })

  it('removeWall drops openings on that wall', () => {
    const wallId = store.getState().walls[0].id
    store.getState().addOpening('door', wallId, 0.3)
    store.getState().addOpening('window', wallId, 0.7)
    store.getState().removeWall(wallId)
    expect(store.getState().openings).toEqual([])
  })

  it('removeWall clears selection pointing at one of its openings', () => {
    const wallId = store.getState().walls[0].id
    const r = store.getState().addOpening('door', wallId, 0.5)
    expect(store.getState().selection).toEqual({ items: [{ kind: 'opening', id: r.id }] })
    store.getState().removeWall(wallId)
    expect(store.getState().selection).toBeNull()
  })
})
