import { describe, it, expect } from 'vitest'
import { normalizeProjectData, migratePersistedState } from './normalizeProject'
import { GROUND_FLOOR_ID } from './slices/levelsSlice'

describe('normalizeProjectData', () => {
  it('seeds a ground floor and backfills levelId for legacy (v1) data', () => {
    const out = normalizeProjectData({
      walls: [{ id: 'w1' }],
      furniture: [{ id: 'f1' }],
      openings: [{ id: 'o1' }],
    })
    expect(out.levels).toHaveLength(1)
    expect(out.levels[0].id).toBe(GROUND_FLOOR_ID)
    expect(out.activeLevel).toBe(GROUND_FLOOR_ID)
    expect(out.walls[0].levelId).toBe(GROUND_FLOOR_ID)
    expect(out.furniture[0].levelId).toBe(GROUND_FLOOR_ID)
    expect(out.openings[0].levelId).toBe(GROUND_FLOOR_ID)
  })

  it('preserves existing levels and per-item levelId (v2 data)', () => {
    const data = {
      walls: [{ id: 'w1', levelId: 'L1' }],
      furniture: [],
      openings: [],
      levels: [
        { id: 'L1', name: 'First', height: 2.7, order: 0 },
        { id: 'L2', name: 'Second', height: 2.7, order: 1 },
      ],
      activeLevel: 'L2',
    }
    const out = normalizeProjectData(data)
    expect(out.levels).toHaveLength(2)
    expect(out.activeLevel).toBe('L2')
    expect(out.walls[0].levelId).toBe('L1')
  })

  it('assigns the first level by order, not array position', () => {
    const out = normalizeProjectData({
      walls: [{ id: 'w1' }],
      levels: [
        { id: 'L2', name: 'Second', height: 2.7, order: 1 },
        { id: 'L1', name: 'First', height: 2.7, order: 0 },
      ],
    })
    expect(out.walls[0].levelId).toBe('L1')
    expect(out.activeLevel).toBe('L1')
  })

  it('coerces missing/garbage arrays and objects to safe defaults', () => {
    const out = normalizeProjectData({ walls: null, roomMeta: 'nope', underlay: 5 })
    expect(out.walls).toEqual([])
    expect(out.furniture).toEqual([])
    expect(out.openings).toEqual([])
    expect(out.roomMeta).toEqual({})
    expect(out.underlay).toBeNull()
  })

  it('tolerates null/undefined input', () => {
    const out = normalizeProjectData(undefined)
    expect(out.walls).toEqual([])
    expect(out.levels[0].id).toBe(GROUND_FLOOR_ID)
  })
})

describe('migratePersistedState', () => {
  it('v1 → v2: seeds levels and backfills levelId, preserving other keys', () => {
    const v1 = {
      walls: [{ id: 'w1' }],
      furniture: [],
      openings: [],
      roomMeta: { fp1: { name: 'Kitchen' } },
      lighting: { lightsOn: true },
      language: 'he',
    }
    const out = migratePersistedState(v1, 1)
    expect(out.levels[0].id).toBe(GROUND_FLOOR_ID)
    expect(out.activeLevel).toBe(GROUND_FLOOR_ID)
    expect(out.walls[0].levelId).toBe(GROUND_FLOOR_ID)
    // Untouched persisted keys survive the migration.
    expect(out.roomMeta).toEqual({ fp1: { name: 'Kitchen' } })
    expect(out.lighting).toEqual({ lightsOn: true })
    expect(out.language).toBe('he')
  })

  it('v2 state passes through unchanged', () => {
    const v2 = {
      walls: [{ id: 'w1', levelId: 'L1' }],
      levels: [{ id: 'L1', name: 'First', height: 2.7, order: 0 }],
      activeLevel: 'L1',
    }
    const out = migratePersistedState(v2, 2)
    expect(out).toBe(v2)
  })
})
