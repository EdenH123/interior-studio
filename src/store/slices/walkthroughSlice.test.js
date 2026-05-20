import { describe, it, expect, beforeEach } from 'vitest'
import { createWalkthroughSlice } from './walkthroughSlice'

function makeSlice() {
  const store = {}
  const set = (updater) => {
    const patch = typeof updater === 'function' ? updater(store) : updater
    Object.assign(store, patch)
  }
  Object.assign(store, createWalkthroughSlice(set))
  return store
}

describe('walkthroughSlice', () => {
  let slice
  beforeEach(() => { slice = makeSlice() })

  it('initialises walkthrough as false', () => {
    expect(slice.walkthrough).toBe(false)
  })

  it('setWalkthrough(true) enables walkthrough', () => {
    slice.setWalkthrough(true)
    expect(slice.walkthrough).toBe(true)
  })

  it('setWalkthrough(false) disables walkthrough', () => {
    slice.setWalkthrough(true)
    slice.setWalkthrough(false)
    expect(slice.walkthrough).toBe(false)
  })

  it('toggleWalkthrough flips state', () => {
    slice.toggleWalkthrough()
    expect(slice.walkthrough).toBe(true)
    slice.toggleWalkthrough()
    expect(slice.walkthrough).toBe(false)
  })

  it('setWalkthrough coerces truthy values to true', () => {
    slice.setWalkthrough(1)
    expect(slice.walkthrough).toBe(true)
  })
})
