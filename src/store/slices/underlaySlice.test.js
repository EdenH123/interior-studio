import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createUnderlaySlice } from './underlaySlice'
import { PIXELS_PER_METER } from '../../components/canvas/constants'

describe('underlaySlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => ({
      ...createUnderlaySlice(set, get),
      selection: null, // for clearUnderlay's cross-slice effect
    }))
  })

  it('starts with no underlay and no calibration', () => {
    expect(store.getState().underlay).toBeNull()
    expect(store.getState().calibration).toBeNull()
  })

  it('setUnderlay replaces the underlay wholesale', () => {
    const u = { dataUrl: 'data:image/png;base64,xxx', x: 0, y: 0, scale: 1, opacity: 0.5, locked: false }
    store.getState().setUnderlay(u)
    expect(store.getState().underlay).toEqual(u)
  })

  it('updateUnderlay patches onto the existing underlay; no-op when null', () => {
    expect(store.getState().updateUnderlay({ opacity: 1 })).toBeUndefined()
    expect(store.getState().underlay).toBeNull()
    store.getState().setUnderlay({ dataUrl: 'x', x: 0, y: 0, scale: 1, opacity: 0.5, locked: false })
    store.getState().updateUnderlay({ opacity: 1, x: 50 })
    expect(store.getState().underlay).toMatchObject({ opacity: 1, x: 50, y: 0 })
  })

  it('clearUnderlay clears the underlay, calibration, and an underlay selection', () => {
    store.getState().setUnderlay({ dataUrl: 'x', x: 0, y: 0, scale: 1, opacity: 0.5, locked: false })
    store.getState().startCalibration()
    store.setState({ selection: { kind: 'underlay', id: 'underlay' } })
    store.getState().clearUnderlay()
    expect(store.getState().underlay).toBeNull()
    expect(store.getState().calibration).toBeNull()
    expect(store.getState().selection).toBeNull()
  })

  it('startCalibration → setCalibrationPoint × 2 fills p1 then p2', () => {
    store.getState().startCalibration()
    expect(store.getState().calibration).toEqual({ p1: null, p2: null })
    store.getState().setCalibrationPoint({ x: 10, y: 10 })
    store.getState().setCalibrationPoint({ x: 110, y: 10 })
    expect(store.getState().calibration).toEqual({
      p1: { x: 10, y: 10 },
      p2: { x: 110, y: 10 },
    })
  })

  it('setCalibrationPoint does nothing once both points are set', () => {
    store.getState().startCalibration()
    store.getState().setCalibrationPoint({ x: 0, y: 0 })
    store.getState().setCalibrationPoint({ x: 100, y: 0 })
    store.getState().setCalibrationPoint({ x: 999, y: 999 })
    expect(store.getState().calibration).toEqual({
      p1: { x: 0, y: 0 },
      p2: { x: 100, y: 0 },
    })
  })

  it('cancelCalibration drops the in-flight calibration', () => {
    store.getState().startCalibration()
    store.getState().setCalibrationPoint({ x: 0, y: 0 })
    store.getState().cancelCalibration()
    expect(store.getState().calibration).toBeNull()
  })

  it('applyCalibration rescales the underlay and locks it', () => {
    // Underlay at origin with scale 1. Calibration points 100 px apart in
    // canvas coords. User says that span is 1 m. Expected: ratio = 50/100
    // = 0.5, so the image shrinks by half and p1 stays fixed.
    store.getState().setUnderlay({ dataUrl: 'x', x: 0, y: 0, scale: 1, opacity: 0.5, locked: false })
    store.getState().startCalibration()
    store.getState().setCalibrationPoint({ x: 0, y: 0 })
    store.getState().setCalibrationPoint({ x: 100, y: 0 })
    store.getState().applyCalibration(1)
    const u = store.getState().underlay
    expect(u.scale).toBeCloseTo(0.5)
    expect(u.x).toBeCloseTo(0)
    expect(u.locked).toBe(true)
    expect(store.getState().calibration).toBeNull()
    // sanity-check the ratio math against the constant
    expect(50).toBe(PIXELS_PER_METER)
  })

  it('applyCalibration is a no-op for invalid inputs', () => {
    store.getState().setUnderlay({ dataUrl: 'x', x: 0, y: 0, scale: 1, opacity: 0.5, locked: false })
    // No calibration started
    store.getState().applyCalibration(2)
    expect(store.getState().underlay.locked).toBe(false)
    // Negative distance
    store.getState().startCalibration()
    store.getState().setCalibrationPoint({ x: 0, y: 0 })
    store.getState().setCalibrationPoint({ x: 100, y: 0 })
    store.getState().applyCalibration(-1)
    expect(store.getState().underlay.locked).toBe(false)
  })

  it('applyCalibration with zero-length calibration just clears state', () => {
    store.getState().setUnderlay({ dataUrl: 'x', x: 0, y: 0, scale: 1, opacity: 0.5, locked: false })
    store.getState().startCalibration()
    store.getState().setCalibrationPoint({ x: 50, y: 50 })
    store.getState().setCalibrationPoint({ x: 50, y: 50 })
    store.getState().applyCalibration(1)
    expect(store.getState().calibration).toBeNull()
    expect(store.getState().underlay.scale).toBe(1)
  })
})
