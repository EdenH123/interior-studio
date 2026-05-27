import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useStore from '../store/useStore'
import useMarquee from './useMarquee'

function resetStore() {
  useStore.getState().loadProject({ walls: [], furniture: [], roomMeta: {}, openings: [], underlay: null })
  useStore.temporal.getState().clear()
}

describe('useMarquee — background click deselects', () => {
  beforeEach(resetStore)

  function setup() {
    const stage = { getRelativePointerPosition: () => ({ x: 10, y: 10 }) }
    const stageRef = { current: stage }
    const setDrawStart = (v) => useStore.setState({ drawStart: v })
    const { result } = renderHook(() => useMarquee({ stageRef, setDrawStart }))
    return { result, stage }
  }

  it('clears selection on a plain background click (press on stage, no drag)', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    const id = useStore.getState().walls[0].id
    useStore.getState().select('wall', id)

    const { result, stage } = setup()
    act(() => result.current.onMouseDown({ evt: { button: 0, clientX: 5, clientY: 5 }, target: stage }))
    act(() => result.current.onMouseUp())

    expect(useStore.getState().selection).toBeNull()
  })

  it('leaves selection alone when the press landed on a shape (not the stage)', () => {
    useStore.getState().addWall(0, 0, 100, 0)
    const id = useStore.getState().walls[0].id
    useStore.getState().select('wall', id)

    const { result } = setup()
    act(() => result.current.onMouseDown({ evt: { button: 0, clientX: 5, clientY: 5 }, target: {} }))
    act(() => result.current.onMouseUp())

    expect(useStore.getState().selection).toEqual({ items: [{ kind: 'wall', id }] })
  })
})
