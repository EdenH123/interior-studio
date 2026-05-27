import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { temporal } from 'zundo'
import { idbStorage } from './idbStorage'
import { nanoid } from 'nanoid/non-secure'
import { createWallsSlice } from './slices/wallsSlice'
import { createFurnitureSlice } from './slices/furnitureSlice'
import { createOpeningsSlice } from './slices/openingsSlice'
import { createRoomsSlice } from './slices/roomsSlice'
import { createAreasSlice } from './slices/areasSlice'
import { createPoolsSlice } from './slices/poolsSlice'
import { createUnderlaySlice } from './slices/underlaySlice'
import { createViewSlice } from './slices/viewSlice'
import { createUiSlice } from './slices/uiSlice'
import { createLayersSlice } from './slices/layersSlice'
import { createLightingSlice } from './slices/lightingSlice'
import { createWalkthroughSlice } from './slices/walkthroughSlice'
import { createLevelsSlice } from './slices/levelsSlice'
import { createCustomModelsSlice } from './slices/customModelsSlice'
import { createTourSlice } from './slices/tourSlice'
import { createLanguageSlice } from './slices/languageSlice'
import { normalizeProjectData, migratePersistedState } from './normalizeProject'

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
  areas: state.areas,
  pools: state.pools,
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
    ...createAreasSlice(set, get),
    ...createPoolsSlice(set, get),
    ...createUnderlaySlice(set, get),
    ...createViewSlice(set, get),
    ...createUiSlice(set, get),
    ...createLayersSlice(set, get),
    ...createLightingSlice(set, get),
    ...createWalkthroughSlice(set, get),
    ...createLevelsSlice(set, get),
    ...createCustomModelsSlice(set, get),
    ...createTourSlice(set, get),
    ...createLanguageSlice(set),

    // Cross-slice action: hydrate the project from an imported file. Clears
    // transient state so the user lands on a clean view. `show3d` is left
    // alone — window arrangement is a session preference, not project data.
    // Old project files (pre-levels) have no levelId on items; we assign the
    // ground floor id so they're visible on level 0 without data loss.
    loadProject: (data) =>
      set(() => ({
        ...normalizeProjectData(data),
        selection: null,
        drawStart: null,
        areaDraft: null,
        poolDraft: null,
        calibration: null,
        dragGhost: null,
      })),

    // Cross-slice selector. Lives on the composer so callers don't need to
    // know which slice owns selection vs furniture. Returns the furniture item
    // only when exactly one furniture item is selected.
    getSelectedFurniture: () => {
      const items = get().selection?.items ?? []
      if (items.length !== 1 || items[0].kind !== 'furniture') return null
      return get().furniture.find((f) => f.id === items[0].id) ?? null
    },

    // Select all visible items on the active level across layers.
    selectAll: () => {
      const { layers, walls, furniture, openings, underlay, activeLevel } = get()
      const onLevel = (item) => !item.levelId || item.levelId === activeLevel
      const items = []
      if (layers.walls) walls.filter(onLevel).forEach((w) => items.push({ kind: 'wall', id: w.id }))
      if (layers.furniture) furniture.filter(onLevel).forEach((f) => items.push({ kind: 'furniture', id: f.id }))
      if (layers.openings) openings.filter(onLevel).forEach((o) => items.push({ kind: 'opening', id: o.id }))
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

    // Paste clipboard items in one `set` call so undo reverts the entire
    // paste as a single step. Walls are offset +50 px on both axes; openings
    // are only pasted when their source wall was also in the clipboard
    // (otherwise they'd be orphaned). Pasted items become the new selection.
    pasteClipboard: () =>
      set((s) => {
        if (!s.clipboard || s.clipboard.length === 0) return s
        const wallIdMap = {} // oldId → newId for walls in the clipboard
        const newFurniture = []
        const newWalls = []
        const newOpenings = []

        // First pass: create walls (needed to build the id map before openings).
        for (const { kind, item } of s.clipboard) {
          if (kind === 'wall') {
            const newId = nanoid(6)
            wallIdMap[item.id] = newId
            newWalls.push({ ...item, id: newId, x1: item.x1 + 50, y1: item.y1 + 50, x2: item.x2 + 50, y2: item.y2 + 50 })
          }
        }

        // Second pass: furniture and openings.
        for (const { kind, item } of s.clipboard) {
          if (kind === 'furniture') {
            newFurniture.push({ ...item, id: nanoid(6), x: item.x + 50, y: item.y + 50 })
          } else if (kind === 'opening') {
            const newWallId = wallIdMap[item.wallId]
            if (!newWallId) continue // wall not in clipboard — skip
            newOpenings.push({ ...item, id: nanoid(6), wallId: newWallId })
          }
        }

        return {
          furniture: [...s.furniture, ...newFurniture],
          walls: [...s.walls, ...newWalls],
          openings: [...s.openings, ...newOpenings],
          selection: {
            items: [
              ...newFurniture.map((f) => ({ kind: 'furniture', id: f.id })),
              ...newWalls.map((w) => ({ kind: 'wall', id: w.id })),
              ...newOpenings.map((o) => ({ kind: 'opening', id: o.id })),
            ],
          },
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
    version: 2,
    // Persist to IndexedDB (no ~5 MB localStorage cap, so big underlay images
    // and custom GLBs can't blow the budget and lose the whole project). The
    // adapter transparently migrates any existing localStorage payload on
    // first read. Hydration is async; zundo history is cleared in
    // onRehydrateStorage so the first undo doesn't revert the load.
    storage: createJSONStorage(() => idbStorage),
    onRehydrateStorage: () => () => {
      useStore?.temporal?.getState().clear()
    },
    // Migration is a version chain in normalizeProject.js, shared with
    // loadProject so the level-assignment rules can't drift. v1 → v2 seeds
    // levels + backfills levelId on legacy items.
    migrate: migratePersistedState,
    // Only persist project data + layer visibility. Transient UI state
    // (selection, mid-draw, view-mode toggle, drag-ghost, toast) is excluded.
    // solo3d/xrayCeiling are session preferences — not persisted.
    partialize: (state) => ({
      walls: state.walls,
      furniture: state.furniture,
      openings: state.openings,
      areas: state.areas,
      pools: state.pools,
      roomMeta: state.roomMeta,
      underlay: state.underlay,
      layers: state.layers,
      lighting: state.lighting,
      levels: state.levels,
      activeLevel: state.activeLevel,
      customModels: state.customModels,
      language: state.language,
    }),
  },
))

export default useStore
