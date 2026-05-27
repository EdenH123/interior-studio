import { nanoid } from 'nanoid/non-secure'

// Outdoor areas — floor regions WITHOUT walls or ceiling (patios, decks,
// gardens). Drawn by clicking out a polygon. Each area is a stored
// `{ id, verts:[{x,y}], name, floorMaterial, levelId }`.
//
// `areaDraft` is the transient in-progress vertex list while drawing — NOT
// persisted and NOT tracked by undo (only the committed `areas` array is).
export const createAreasSlice = (set) => ({
  areas: [],
  areaDraft: null,

  // Add a fully-specified area (used by the polygon-finish flow + tests).
  addArea: (verts) =>
    set((s) => {
      const id = nanoid(6)
      return {
        areas: [...s.areas, { id, verts, name: '', floorMaterial: null, levelId: s.activeLevel ?? null }],
        selection: { items: [{ kind: 'area', id }] },
        areaDraft: null,
      }
    }),

  updateArea: (id, patch) =>
    set((s) => ({ areas: s.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

  // Move one or more polygon vertices of an area by index. `moves` is
  // [{ index, x, y }]. Used by the drag handles to reshape an area; reading
  // the latest verts inside `set` avoids stale-closure issues during a drag.
  moveAreaVertices: (id, moves) =>
    set((s) => ({
      areas: s.areas.map((a) => {
        if (a.id !== id) return a
        const verts = a.verts.slice()
        for (const m of moves) {
          if (m.index >= 0 && m.index < verts.length) verts[m.index] = { x: m.x, y: m.y }
        }
        return { ...a, verts }
      }),
    })),

  removeArea: (id) =>
    set((s) => ({
      areas: s.areas.filter((a) => a.id !== id),
      selection: (() => {
        const items = (s.selection?.items ?? []).filter((i) => !(i.kind === 'area' && i.id === id))
        return items.length ? { items } : null
      })(),
    })),

  // ── drawing draft (transient) ──────────────────────────────────────────────
  addAreaPoint: (p) => set((s) => ({ areaDraft: [...(s.areaDraft ?? []), p] })),
  cancelAreaDraft: () => set({ areaDraft: null }),
  // Commit the draft into a real area when it has at least 3 points; otherwise
  // just drop it. Returns nothing — callers read the new state if needed.
  finishAreaDraft: () =>
    set((s) => {
      const verts = s.areaDraft ?? []
      if (verts.length < 3) return { areaDraft: null }
      const id = nanoid(6)
      return {
        areas: [...s.areas, { id, verts, name: '', floorMaterial: null, levelId: s.activeLevel ?? null }],
        selection: { items: [{ kind: 'area', id }] },
        areaDraft: null,
      }
    }),
})
