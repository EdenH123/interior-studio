import { create } from 'zustand'
import { describe, it, expect, beforeEach } from 'vitest'
import { createUiSlice } from './uiSlice'

describe('uiSlice', () => {
  let store
  beforeEach(() => {
    store = create((set, get) => createUiSlice(set, get))
  })

  describe('selection — multi-item shape', () => {
    it('starts null', () => {
      expect(store.getState().selection).toBeNull()
    })

    it('select(kind, id) creates a single-item selection; clearSelection nulls it', () => {
      store.getState().select('wall', 'w1')
      expect(store.getState().selection).toEqual({ items: [{ kind: 'wall', id: 'w1' }] })
      store.getState().clearSelection()
      expect(store.getState().selection).toBeNull()
    })

    it('select with missing kind or id is a clear', () => {
      store.getState().select('wall', 'w1')
      store.getState().select(null, 'w1')
      expect(store.getState().selection).toBeNull()
    })

    it('addToSelection adds a new item', () => {
      store.getState().select('wall', 'w1')
      store.getState().addToSelection('furniture', 'f1')
      expect(store.getState().selection).toEqual({
        items: [{ kind: 'wall', id: 'w1' }, { kind: 'furniture', id: 'f1' }],
      })
    })

    it('addToSelection on an already-selected item removes it (toggle)', () => {
      store.getState().select('wall', 'w1')
      store.getState().addToSelection('furniture', 'f1')
      store.getState().addToSelection('wall', 'w1')
      expect(store.getState().selection).toEqual({ items: [{ kind: 'furniture', id: 'f1' }] })
    })

    it('addToSelection that removes the last item nulls selection', () => {
      store.getState().select('wall', 'w1')
      store.getState().addToSelection('wall', 'w1')
      expect(store.getState().selection).toBeNull()
    })

    it('setSelectionItems replaces the whole selection', () => {
      store.getState().select('wall', 'w1')
      store.getState().setSelectionItems([
        { kind: 'furniture', id: 'f1' },
        { kind: 'furniture', id: 'f2' },
      ])
      expect(store.getState().selection).toEqual({
        items: [{ kind: 'furniture', id: 'f1' }, { kind: 'furniture', id: 'f2' }],
      })
    })

    it('setSelectionItems with empty array nulls selection', () => {
      store.getState().select('wall', 'w1')
      store.getState().setSelectionItems([])
      expect(store.getState().selection).toBeNull()
    })
  })

  describe('dragGhost', () => {
    it('setDragGhostType seeds position (0, 0)', () => {
      store.getState().setDragGhostType('sofa')
      expect(store.getState().dragGhost).toEqual({
        kind: 'furniture', type: 'sofa', x: 0, y: 0, wallId: null, position: null,
      })
    })

    it('setDragGhostType records the kind for opening ghosts', () => {
      store.getState().setDragGhostType('door', 'opening')
      expect(store.getState().dragGhost).toMatchObject({ kind: 'opening', type: 'door' })
    })

    it('setDragGhostPos updates x/y without losing type', () => {
      store.getState().setDragGhostType('sofa')
      store.getState().setDragGhostPos(100, 200)
      expect(store.getState().dragGhost).toMatchObject({ type: 'sofa', x: 100, y: 200 })
    })

    it('setDragGhostPos can merge extra wall-snap fields', () => {
      store.getState().setDragGhostType('door', 'opening')
      store.getState().setDragGhostPos(50, 0, { wallId: 'w1', position: 0.5 })
      expect(store.getState().dragGhost).toMatchObject({
        kind: 'opening', type: 'door', x: 50, y: 0, wallId: 'w1', position: 0.5,
      })
    })

    it('setDragGhostPos is a no-op when no ghost exists', () => {
      store.getState().setDragGhostPos(100, 200)
      expect(store.getState().dragGhost).toBeNull()
    })

    it('clearDragGhost wipes it', () => {
      store.getState().setDragGhostType('sofa')
      store.getState().clearDragGhost()
      expect(store.getState().dragGhost).toBeNull()
    })
  })

  describe('toast', () => {
    it('pushToast stores message + kind + generated id', () => {
      store.getState().pushToast('hello', 'info')
      const t = store.getState().toast
      expect(t).toMatchObject({ message: 'hello', kind: 'info' })
      expect(t.id).toEqual(expect.any(String))
    })

    it('default kind is info', () => {
      store.getState().pushToast('hi')
      expect(store.getState().toast.kind).toBe('info')
    })

    it('pushToast replaces, dismissToast nulls', () => {
      store.getState().pushToast('a')
      const id1 = store.getState().toast.id
      store.getState().pushToast('b')
      expect(store.getState().toast.message).toBe('b')
      expect(store.getState().toast.id).not.toBe(id1)
      store.getState().dismissToast()
      expect(store.getState().toast).toBeNull()
    })
  })

  describe('aiPanelOpen', () => {
    it('toggleAiPanel flips it', () => {
      expect(store.getState().aiPanelOpen).toBe(false)
      store.getState().toggleAiPanel()
      expect(store.getState().aiPanelOpen).toBe(true)
      store.getState().closeAiPanel()
      expect(store.getState().aiPanelOpen).toBe(false)
    })
  })

  describe('aiProposal', () => {
    it('setAiProposal / discardAiProposal roundtrip', () => {
      const proposal = { proposed: { walls: [], furniture: [], roomMeta: {} }, diff: {} }
      store.getState().setAiProposal(proposal)
      expect(store.getState().aiProposal).toBe(proposal)
      store.getState().discardAiProposal()
      expect(store.getState().aiProposal).toBeNull()
    })
  })
})
