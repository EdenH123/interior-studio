import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createLayersSlice } from './layersSlice'

describe('layersSlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => createLayersSlice(set, get))
  })

  it('all layers are visible by default', () => {
    const { layers } = store.getState()
    expect(layers.walls).toBe(true)
    expect(layers.furniture).toBe(true)
    expect(layers.openings).toBe(true)
    expect(layers.rooms).toBe(true)
    expect(layers.underlay).toBe(true)
    expect(layers.grid).toBe(true)
  })

  it('toggleLayer hides a visible layer', () => {
    store.getState().toggleLayer('walls')
    expect(store.getState().layers.walls).toBe(false)
  })

  it('toggleLayer shows a hidden layer', () => {
    store.getState().toggleLayer('walls')
    store.getState().toggleLayer('walls')
    expect(store.getState().layers.walls).toBe(true)
  })

  it('toggleLayer does not affect other layers', () => {
    store.getState().toggleLayer('walls')
    const { layers } = store.getState()
    expect(layers.furniture).toBe(true)
    expect(layers.grid).toBe(true)
  })

  it('can independently toggle each layer', () => {
    const keys = ['walls', 'furniture', 'openings', 'rooms', 'underlay', 'grid']
    keys.forEach((key) => {
      store.getState().toggleLayer(key)
      expect(store.getState().layers[key]).toBe(false)
      store.getState().toggleLayer(key)
      expect(store.getState().layers[key]).toBe(true)
    })
  })
})
