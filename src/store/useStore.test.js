import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import useStore from './useStore'

// Composer integration tests. useStore is a singleton, so we reset state
// (and zundo's history) between tests rather than re-creating the store.

function resetStore() {
  // loadProject covers walls/furniture/roomMeta/underlay + clears most
  // transient state. The remaining UI bits get cleared by their own
  // actions (avoids fighting the persist+zundo middleware with a raw
  // setState(replace=true)).
  useStore.getState().loadProject({ walls: [], furniture: [], roomMeta: {}, underlay: null })
  useStore.setState({ show3d: false, toast: null, aiPanelOpen: false, aiProposal: null })
  useStore.temporal.getState().clear()
}

describe('useStore composer', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('loadProject', () => {
    it('replaces project slices and clears transient state', () => {
      useStore.getState().addWall(0, 0, 100, 0)
      useStore.getState().setDrawStart({ x: 1, y: 1 })
      useStore.getState().select('wall', useStore.getState().walls[0].id)

      useStore.getState().loadProject({
        walls: [{ id: 'a', x1: 0, y1: 0, x2: 200, y2: 0 }],
        furniture: [],
        roomMeta: { foo: { name: 'Living' } },
        underlay: null,
      })

      const s = useStore.getState()
      expect(s.walls).toEqual([{ id: 'a', x1: 0, y1: 0, x2: 200, y2: 0 }])
      expect(s.roomMeta).toEqual({ foo: { name: 'Living' } })
      expect(s.selection).toBeNull()
      expect(s.drawStart).toBeNull()
      expect(s.calibration).toBeNull()
    })

    it('defaults missing arrays/objects to empty', () => {
      useStore.getState().loadProject({})
      const s = useStore.getState()
      expect(s.walls).toEqual([])
      expect(s.furniture).toEqual([])
      expect(s.roomMeta).toEqual({})
      expect(s.underlay).toBeNull()
    })
  })

  describe('applyAiProposal', () => {
    it('swaps in the proposed slices, preserves the underlay, clears the proposal', () => {
      const underlay = { dataUrl: 'x', x: 0, y: 0, scale: 1, opacity: 0.5, locked: true }
      useStore.setState({ underlay })
      useStore.getState().setAiProposal({
        proposed: {
          walls: [{ id: 'w1', x1: 0, y1: 0, x2: 50, y2: 0 }],
          furniture: [],
          roomMeta: {},
        },
        diff: { walls: { added: [], removed: [], modified: [] }, furniture: { added: [], removed: [], modified: [] }, roomMeta: { added: [], removed: [], modified: [] } },
      })

      useStore.getState().applyAiProposal()

      const s = useStore.getState()
      expect(s.walls).toEqual([{ id: 'w1', x1: 0, y1: 0, x2: 50, y2: 0 }])
      expect(s.underlay).toBe(underlay) // preserved
      expect(s.aiProposal).toBeNull()
    })

    it('is a no-op when there is no proposal', () => {
      useStore.getState().addWall(0, 0, 100, 0)
      const before = useStore.getState().walls
      useStore.getState().applyAiProposal()
      expect(useStore.getState().walls).toEqual(before)
    })
  })

  describe('zundo undo/redo', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('undo reverts an addWall after the debounce settles', () => {
      useStore.getState().addWall(0, 0, 100, 0)
      vi.advanceTimersByTime(350) // > 300ms debounce in handleSet
      expect(useStore.temporal.getState().pastStates.length).toBe(1)

      useStore.temporal.getState().undo()
      expect(useStore.getState().walls).toEqual([])
      expect(useStore.temporal.getState().futureStates.length).toBe(1)
    })

    it('redo restores the undone change', () => {
      useStore.getState().addWall(0, 0, 100, 0)
      vi.advanceTimersByTime(350)
      useStore.temporal.getState().undo()
      useStore.temporal.getState().redo()
      expect(useStore.getState().walls).toHaveLength(1)
    })

    it('applyAiProposal records a single history step', () => {
      useStore.getState().setAiProposal({
        proposed: {
          walls: [{ id: 'w1', x1: 0, y1: 0, x2: 50, y2: 0 }],
          furniture: [{ id: 'f1', type: 'sofa', x: 0, y: 0, rotation: 0, width: 2, depth: 0.9, height: 0.85, color: '#000' }],
          roomMeta: {},
        },
        diff: {},
      })
      // Apply immediately — settle the debounce — then undo.
      useStore.getState().applyAiProposal()
      vi.advanceTimersByTime(350)
      expect(useStore.getState().walls).toHaveLength(1)
      expect(useStore.getState().furniture).toHaveLength(1)
      useStore.temporal.getState().undo()
      // Undo restores BOTH slices in one step — apply was a single set().
      expect(useStore.getState().walls).toEqual([])
      expect(useStore.getState().furniture).toEqual([])
    })

    it('history capacity is bounded (≤ 50 entries)', () => {
      for (let i = 0; i < 60; i++) {
        useStore.getState().addWall(i, 0, i + 10, 0)
        vi.advanceTimersByTime(350)
      }
      expect(useStore.temporal.getState().pastStates.length).toBeLessThanOrEqual(50)
    })
  })
})
