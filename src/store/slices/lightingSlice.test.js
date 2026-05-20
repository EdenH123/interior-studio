import { describe, it, expect, beforeEach } from 'vitest'
import { createLightingSlice } from './lightingSlice'

function makeSlice() {
  let state = {}
  const set = (updater) => {
    state = { ...state, ...(typeof updater === 'function' ? updater(state) : updater) }
  }
  state = { ...state, ...createLightingSlice(set) }
  return { get: () => state, actions: state }
}

describe('lightingSlice', () => {
  let slice
  beforeEach(() => { slice = makeSlice() })

  it('initialises with sensible defaults', () => {
    const { lighting } = slice.get()
    expect(lighting.lightsOn).toBe(true)
    expect(lighting.timeOfDay).toBe(12)
    expect(lighting.ambientStrength).toBe(0.4)
  })

  it('setLightsOn toggles the master switch', () => {
    slice.actions.setLightsOn(false)
    expect(slice.get().lighting.lightsOn).toBe(false)
    slice.actions.setLightsOn(true)
    expect(slice.get().lighting.lightsOn).toBe(true)
  })

  it('setTimeOfDay updates timeOfDay', () => {
    slice.actions.setTimeOfDay(8.5)
    expect(slice.get().lighting.timeOfDay).toBe(8.5)
  })

  it('setTimeOfDay accepts 0 and 24', () => {
    slice.actions.setTimeOfDay(0)
    expect(slice.get().lighting.timeOfDay).toBe(0)
    slice.actions.setTimeOfDay(24)
    expect(slice.get().lighting.timeOfDay).toBe(24)
  })

  it('setAmbientStrength updates ambientStrength', () => {
    slice.actions.setAmbientStrength(0.7)
    expect(slice.get().lighting.ambientStrength).toBe(0.7)
  })

  it('setAmbientStrength to 0 kills fill light', () => {
    slice.actions.setAmbientStrength(0)
    expect(slice.get().lighting.ambientStrength).toBe(0)
  })

  it('actions do not clobber sibling lighting fields', () => {
    slice.actions.setTimeOfDay(18)
    slice.actions.setLightsOn(false)
    const { lighting } = slice.get()
    expect(lighting.timeOfDay).toBe(18)
    expect(lighting.lightsOn).toBe(false)
    expect(lighting.ambientStrength).toBe(0.4)
  })
})
