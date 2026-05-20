import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createViewSlice } from './viewSlice'

describe('viewSlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => createViewSlice(set, get))
  })

  it('starts with show3d=false and no drawStart', () => {
    expect(store.getState().show3d).toBe(false)
    expect(store.getState().drawStart).toBeNull()
  })

  it('toggle3d flips show3d', () => {
    store.getState().toggle3d()
    expect(store.getState().show3d).toBe(true)
    store.getState().toggle3d()
    expect(store.getState().show3d).toBe(false)
  })

  it('setDrawStart stores the point (and accepts null to clear)', () => {
    store.getState().setDrawStart({ x: 10, y: 20 })
    expect(store.getState().drawStart).toEqual({ x: 10, y: 20 })
    store.getState().setDrawStart(null)
    expect(store.getState().drawStart).toBeNull()
  })
})
