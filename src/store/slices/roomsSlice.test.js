import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createRoomsSlice } from './roomsSlice'

describe('roomsSlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => createRoomsSlice(set, get))
  })

  it('starts with empty roomMeta', () => {
    expect(store.getState().roomMeta).toEqual({})
  })

  it('updateRoomMeta adds a new entry under the given id', () => {
    store.getState().updateRoomMeta('abc', { name: 'Living room' })
    expect(store.getState().roomMeta).toEqual({ abc: { name: 'Living room' } })
  })

  it('updateRoomMeta merges patches into an existing entry', () => {
    store.getState().updateRoomMeta('abc', { name: 'Living room' })
    store.getState().updateRoomMeta('abc', { floorMaterial: 'wood' })
    expect(store.getState().roomMeta.abc).toEqual({
      name: 'Living room',
      floorMaterial: 'wood',
    })
  })

  it('updateRoomMeta leaves unrelated entries untouched', () => {
    store.getState().updateRoomMeta('a', { name: 'A' })
    store.getState().updateRoomMeta('b', { name: 'B' })
    expect(store.getState().roomMeta).toEqual({
      a: { name: 'A' },
      b: { name: 'B' },
    })
  })
})
