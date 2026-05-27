import { nanoid } from 'nanoid/non-secure'

// Pools — a dedicated water feature. Like an outdoor area it's a drawn polygon
// `{ id, verts:[{x,y}], name, depth, levelId }`, but it renders in 3D as a
// sunken basin (walls + bottom) with a translucent water surface, and in 2D
// as a water-blue fill. `depth` is metres below the surrounding ground.
//
// `poolDraft` is the transient in-progress vertex list while drawing — NOT
// persisted and NOT tracked by undo (only the committed `pools` array is).
const DEFAULT_POOL_DEPTH = 1.5

export const createPoolsSlice = (set) => ({
  pools: [],
  poolDraft: null,

  addPool: (verts) =>
    set((s) => {
      const id = nanoid(6)
      return {
        pools: [...s.pools, { id, verts, name: '', depth: DEFAULT_POOL_DEPTH, levelId: s.activeLevel ?? null }],
        selection: { items: [{ kind: 'pool', id }] },
        poolDraft: null,
      }
    }),

  updatePool: (id, patch) =>
    set((s) => ({ pools: s.pools.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

  removePool: (id) =>
    set((s) => ({
      pools: s.pools.filter((p) => p.id !== id),
      selection: (() => {
        const items = (s.selection?.items ?? []).filter((i) => !(i.kind === 'pool' && i.id === id))
        return items.length ? { items } : null
      })(),
    })),

  // Move polygon vertices by index — drives the reshape handles. `moves` is
  // [{ index, x, y }]. Reads latest verts inside set (no stale-closure mid-drag).
  movePoolVertices: (id, moves) =>
    set((s) => ({
      pools: s.pools.map((p) => {
        if (p.id !== id) return p
        const verts = p.verts.slice()
        for (const m of moves) {
          if (m.index >= 0 && m.index < verts.length) verts[m.index] = { x: m.x, y: m.y }
        }
        return { ...p, verts }
      }),
    })),

  // ── drawing draft (transient) ──────────────────────────────────────────────
  addPoolPoint: (pt) => set((s) => ({ poolDraft: [...(s.poolDraft ?? []), pt] })),
  cancelPoolDraft: () => set({ poolDraft: null }),
  finishPoolDraft: () =>
    set((s) => {
      const verts = s.poolDraft ?? []
      if (verts.length < 3) return { poolDraft: null }
      const id = nanoid(6)
      return {
        pools: [...s.pools, { id, verts, name: '', depth: DEFAULT_POOL_DEPTH, levelId: s.activeLevel ?? null }],
        selection: { items: [{ kind: 'pool', id }] },
        poolDraft: null,
      }
    }),
})
