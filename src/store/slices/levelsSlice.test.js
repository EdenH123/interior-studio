import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createLevelsSlice,
  computeLevelOffsets,
  GROUND_FLOOR_ID,
  DEFAULT_LEVEL_HEIGHT,
} from './levelsSlice'

describe('computeLevelOffsets', () => {
  it('returns ground floor at offset 0', () => {
    const levels = [{ id: 'L00000', name: 'Ground Floor', height: 2.7, order: 0 }]
    const offsets = computeLevelOffsets(levels)
    expect(offsets.get('L00000')).toBe(0)
  })

  it('stacks levels by their height', () => {
    const levels = [
      { id: 'L00000', name: 'Ground', height: 3.0, order: 0 },
      { id: 'L00001', name: 'Floor 1', height: 2.8, order: 1 },
      { id: 'L00002', name: 'Floor 2', height: 2.5, order: 2 },
    ]
    const offsets = computeLevelOffsets(levels)
    expect(offsets.get('L00000')).toBe(0)
    expect(offsets.get('L00001')).toBeCloseTo(3.0)
    expect(offsets.get('L00002')).toBeCloseTo(5.8)
  })

  it('sorts by order before accumulating', () => {
    const levels = [
      { id: 'B', name: 'Floor 1', height: 2.8, order: 1 },
      { id: 'A', name: 'Ground',  height: 3.0, order: 0 },
    ]
    const offsets = computeLevelOffsets(levels)
    expect(offsets.get('A')).toBe(0)
    expect(offsets.get('B')).toBeCloseTo(3.0)
  })

  it('returns an empty Map for an empty array', () => {
    expect(computeLevelOffsets([]).size).toBe(0)
  })
})

describe('createLevelsSlice', () => {
  let store

  beforeEach(() => {
    store = create((set, get) => createLevelsSlice(set, get))
  })

  it('initialises with one ground-floor level', () => {
    const { levels, activeLevel } = store.getState()
    expect(levels).toHaveLength(1)
    expect(levels[0]).toMatchObject({ id: GROUND_FLOOR_ID, name: 'Ground Floor', height: DEFAULT_LEVEL_HEIGHT, order: 0 })
    expect(activeLevel).toBe(GROUND_FLOOR_ID)
  })

  it('solo3d and xrayCeiling start false', () => {
    const { solo3d, xrayCeiling } = store.getState()
    expect(solo3d).toBe(false)
    expect(xrayCeiling).toBe(false)
  })

  it('addLevel appends a new level with the next order', () => {
    const id = store.getState().addLevel()
    const { levels } = store.getState()
    expect(levels).toHaveLength(2)
    const added = levels.find((l) => l.id === id)
    expect(added).toBeDefined()
    expect(added.order).toBe(1)
    expect(added.height).toBe(DEFAULT_LEVEL_HEIGHT)
  })

  it('addLevel returns the new id', () => {
    const id = store.getState().addLevel()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('removeLevel removes the level by id', () => {
    const newId = store.getState().addLevel()
    store.getState().removeLevel(newId)
    const { levels } = store.getState()
    expect(levels).toHaveLength(1)
    expect(levels[0].id).toBe(GROUND_FLOOR_ID)
  })

  it('removeLevel does nothing when only 1 level remains', () => {
    store.getState().removeLevel(GROUND_FLOOR_ID)
    expect(store.getState().levels).toHaveLength(1)
  })

  it('removeLevel switches activeLevel to an adjacent level when the active is removed', () => {
    const newId = store.getState().addLevel()
    store.getState().setActiveLevel(newId)
    store.getState().removeLevel(newId)
    expect(store.getState().activeLevel).toBe(GROUND_FLOOR_ID)
  })

  it('renameLevel updates the name', () => {
    store.getState().renameLevel(GROUND_FLOOR_ID, 'Basement')
    expect(store.getState().levels[0].name).toBe('Basement')
  })

  it('renameLevel is a no-op for unknown ids', () => {
    store.getState().renameLevel('unknown', 'Nope')
    expect(store.getState().levels[0].name).toBe('Ground Floor')
  })

  it('setLevelHeight updates the height', () => {
    store.getState().setLevelHeight(GROUND_FLOOR_ID, 3.5)
    expect(store.getState().levels[0].height).toBe(3.5)
  })

  it('setLevelHeight clamps to minimum 0.1', () => {
    store.getState().setLevelHeight(GROUND_FLOOR_ID, 0)
    expect(store.getState().levels[0].height).toBe(0.1)
  })

  it('setActiveLevel changes the active level', () => {
    const newId = store.getState().addLevel()
    store.getState().setActiveLevel(newId)
    expect(store.getState().activeLevel).toBe(newId)
  })

  it('setSolo3d toggles the flag', () => {
    store.getState().setSolo3d(true)
    expect(store.getState().solo3d).toBe(true)
    store.getState().setSolo3d(false)
    expect(store.getState().solo3d).toBe(false)
  })

  it('setXrayCeiling toggles the flag', () => {
    store.getState().setXrayCeiling(true)
    expect(store.getState().xrayCeiling).toBe(true)
  })
})
