import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'
import { createWallsSlice } from './slices/wallsSlice'
import { createFurnitureSlice } from './slices/furnitureSlice'
import { createOpeningsSlice } from './slices/openingsSlice'
import { createRoomsSlice } from './slices/roomsSlice'
import { createUnderlaySlice } from './slices/underlaySlice'
import { createViewSlice } from './slices/viewSlice'
import { createUiSlice } from './slices/uiSlice'
import { createLayersSlice } from './slices/layersSlice'
import { createLightingSlice } from './slices/lightingSlice'

// Tiny debounce — used by zundo's handleSet so a continuous flow (rotation
// drag, name typing) collapses into one history entry per pause instead
// of one per micro-update.
function debounce(fn, ms) {
  let t
  return function debounced(...args) {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

// Tracked by undo/redo. Same shape as `persist.partialize`, but kept
// separate so future code can diverge if needed (e.g. tracking history of
// state the user wouldn't want persisted).
const HISTORY_SLICE = (state) => ({
  walls: state.walls,
  furniture: state.furniture,
  openings: state.openings,
  roomMeta: state.roomMeta,
  underlay: state.underlay,
})

// Composer for the project's single Zustand store. Each slice owns a
// related cluster of state + actions (see `slices/`); this file glues them
// together, holds the cross-slice actions (loadProject, getSelectedFurniture),
// and wraps the whole thing in the `persist` middleware.
//
// `set` and `get` are shared across all slices — Zustand merges any slice's
// `set` call into the single root state, so a slice can legally touch
// another slice's keys when there's an obvious linkage (e.g. removeWall
// clears the matching selection in the UI slice).
//
// Schema version: bump in lockstep with `utils/projectIO.js` whenever the
// persisted slice shapes change.
//
// Middleware order is persist(outer) → temporal(inner): undo restores a
// past state via temporal's internal set, persist then writes that state
// to localStorage. So undo + reload = the undone state survives. History
// itself is session-only (rebuilt fresh on each page load).
const useStore = create(persist(
  temporal((set, get) => ({
    ...createWallsSlice(set, get),
    ...createFurnitureSlice(set, get),
    ...createOpeningsSlice(set, get),
    ...createRoomsSlice(set, get),
    ...createUnderlaySlice(set, get),
    ...createViewSlice(set, get),
    ...createUiSlice(set, get),
    ...createLayersSlice(set, get),
    ...createLightingSlice(set, get),

    // Cross-slice action: hydrate the project from an imported file. Clears
    // transient state so the user lands on a clean view. `show3d` is left
    // alone — window arrangement is a session preference, not project data.
    loadProject: (data) =>
      set({
        walls: Array.isArray(data?.walls) ? data.walls : [],
        furniture: Array.isArray(data?.furniture) ? data.furniture : [],
        openings: Array.isArray(data?.openings) ? data.openings : [],
        roomMeta: data?.roomMeta && typeof data.roomMeta === 'object' ? data.roomMeta : {},
        underlay: data?.underlay && typeof data.underlay === 'object' ? data.underlay : null,
        selection: null,
        drawStart: null,
        calibration: null,
        dragGhost: null,
      }),

    // Cross-slice selector. Lives on the composer so callers don't need to
    // know which slice owns selection vs furniture. Returns the furniture item
    // only when exactly one furniture item is selected.
    getSelectedFurniture: () => {
      const items = get().selection?.items ?? []
      if (items.length !== 1 || items[0].kind !== 'furniture') return null
      return get().furniture.find((f) => f.id === items[0].id) ?? null
    },

    // Select all visible items across layers. Walls, furniture, openings,
    // and underlay (if present) based on the current layer visibility flags.
    selectAll: () => {
      const { layers, walls, furniture, openings, underlay } = get()
      const items = []
      if (layers.walls) walls.forEach((w) => items.push({ kind: 'wall', id: w.id }))
      if (layers.furniture) furniture.forEach((f) => items.push({ kind: 'furniture', id: f.id }))
      if (layers.openings) openings.forEach((o) => items.push({ kind: 'opening', id: o.id }))
      if (layers.underlay && underlay) items.push({ kind: 'underlay', id: 'underlay' })
      set({ selection: items.length ? { items } : null })
    },

    // Commit the current AI proposal in one `set` call so it lands as a
    // single history entry — one Cmd+Z reverts the entire AI change.
    // Underlay is preserved (out of the AI's scope); transient state is
    // cleared (consistent with loadProject).
    applyAiProposal: () =>
      set((s) => {
        if (!s.aiProposal) return s
        const { walls, furniture, roomMeta, openings } = s.aiProposal.proposed
        return {
          walls,
          furniture,
          // Openings are optional in the proposal — fall back to current to
          // preserve them when the AI didn't author any.
          openings: Array.isArray(openings) ? openings : s.openings,
          roomMeta,
          selection: null,
          drawStart: null,
          calibration: null,
          dragGhost: null,
          aiProposal: null,
        }
      }),
  }), {
    limit: 50,
    partialize: HISTORY_SLICE,
    // Snapshot only on quiet pauses, so a rotation drag (60 updates/sec)
    // or typing in the room-name field becomes one history entry, not
    // dozens. Trailing-only is fine — the state itself updates immediately,
    // it's just the history capture that's delayed.
    handleSet: (handleSet) => debounce(handleSet, 300),
  }),
  {
    name: 'interior-studio',
    version: 1,
    // Only persist project data + layer visibility. Transient UI state
    // (selection, mid-draw, view-mode toggle, drag-ghost, toast) is excluded.
    partialize: (state) => ({
      walls: state.walls,
      furniture: state.furniture,
      openings: state.openings,
      roomMeta: state.roomMeta,
      underlay: state.underlay,
      layers: state.layers,
      lighting: state.lighting,
    }),
  },
))

export default useStore
