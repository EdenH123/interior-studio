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
import { createVoidsSlice } from './slices/voidsSlice'
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
  voids: state.voids,
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
    ...createVoidsSlice(set, get),
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
        voidDraft: null,
        pendingPaste: null,
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

    // Bulk-translate every selected item by (dx, dy) in one set — used by the
    // "drag a selected wall to move the whole selection" interaction so a
    // pasted cluster (walls + furniture + openings + areas/pools/voids) moves
    // as a rigid group. Openings have positions normalised along their wall,
    // so they naturally ride the wall without being touched here.
    translateSelection: (dx, dy) =>
      set((s) => {
        const items = s.selection?.items ?? []
        if (items.length === 0 || (dx === 0 && dy === 0)) return s
        const wIds = new Set(), fIds = new Set(), aIds = new Set(), pIds = new Set(), vIds = new Set()
        for (const it of items) {
          if (it.kind === 'wall')      wIds.add(it.id)
          else if (it.kind === 'furniture') fIds.add(it.id)
          else if (it.kind === 'area')      aIds.add(it.id)
          else if (it.kind === 'pool')      pIds.add(it.id)
          else if (it.kind === 'void')      vIds.add(it.id)
        }
        const shift = (v) => ({ x: v.x + dx, y: v.y + dy })
        return {
          walls: wIds.size ? s.walls.map((w) => wIds.has(w.id)
            ? { ...w, x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy } : w) : s.walls,
          furniture: fIds.size ? s.furniture.map((f) => fIds.has(f.id)
            ? { ...f, x: f.x + dx, y: f.y + dy } : f) : s.furniture,
          areas: aIds.size ? s.areas.map((a) => aIds.has(a.id)
            ? { ...a, verts: a.verts.map(shift) } : a) : s.areas,
          pools: pIds.size ? s.pools.map((p) => pIds.has(p.id)
            ? { ...p, verts: p.verts.map(shift) } : p) : s.pools,
          voids: vIds.size ? s.voids.map((v) => vIds.has(v.id)
            ? { ...v, verts: v.verts.map(shift) } : v) : s.voids,
        }
      }),

    // Cmd+V enters a "pending paste" mode: a ghost preview follows the cursor
    // and a canvas click drops the items there. The anchor is the bbox centre
    // of all furniture positions + wall endpoints; openings ride their walls
    // (skipped from anchoring, kept relative). Pressing Cmd+V again before
    // committing just refreshes the snapshot from the current clipboard.
    pasteClipboard: () =>
      set((s) => {
        if (!s.clipboard || s.clipboard.length === 0) return s
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        let n = 0
        for (const { kind, item } of s.clipboard) {
          if (kind === 'furniture') {
            if (item.x < minX) minX = item.x; if (item.x > maxX) maxX = item.x
            if (item.y < minY) minY = item.y; if (item.y > maxY) maxY = item.y
            n++
          } else if (kind === 'wall') {
            for (const [x, y] of [[item.x1, item.y1], [item.x2, item.y2]]) {
              if (x < minX) minX = x; if (x > maxX) maxX = x
              if (y < minY) minY = y; if (y > maxY) maxY = y
              n++
            }
          }
        }
        const anchor = n > 0 ? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } : { x: 0, y: 0 }
        return { pendingPaste: { items: s.clipboard, anchor }, pendingPlacement: null }
      }),

    // Commit the pending paste at the given world point. All clipboard
    // positions are offset by (worldPoint − anchor); openings keep their
    // position-along-wall and only land if their source wall is also being
    // pasted (otherwise orphaned and skipped). Wrapped in one `set` so undo
    // reverts the whole paste in a single step.
    commitPaste: ({ x: cx, y: cy }) =>
      set((s) => {
        const pp = s.pendingPaste
        if (!pp || !pp.items || pp.items.length === 0) return s
        const dx = cx - pp.anchor.x, dy = cy - pp.anchor.y
        const wallIdMap = {}
        const newFurniture = []
        const newWalls = []
        const newOpenings = []
        for (const { kind, item } of pp.items) {
          if (kind === 'wall') {
            const newId = nanoid(6)
            wallIdMap[item.id] = newId
            newWalls.push({ ...item, id: newId, x1: item.x1 + dx, y1: item.y1 + dy, x2: item.x2 + dx, y2: item.y2 + dy })
          }
        }
        for (const { kind, item } of pp.items) {
          if (kind === 'furniture') {
            newFurniture.push({ ...item, id: nanoid(6), x: item.x + dx, y: item.y + dy })
          } else if (kind === 'opening') {
            const newWallId = wallIdMap[item.wallId]
            if (!newWallId) continue
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
          pendingPaste: null,
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
      voids: state.voids,
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
