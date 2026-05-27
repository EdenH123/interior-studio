import { nanoid } from 'nanoid/non-secure'

// Voids — "open to above" regions for double-height spaces. A void is a drawn
// polygon `{ id, verts, name, levelId }` on level X that cuts a hole in level
// X's ceiling AND the floor of the level directly above (X+1), so that part of
// the room rises up into the level above. No material — the hole IS the render.
//
// `voidDraft` is the transient in-progress vertex list while drawing — NOT
// persisted and NOT tracked by undo (only the committed `voids` array is).
export const createVoidsSlice = (set) => ({
  voids: [],
  voidDraft: null,

  addVoid: (verts) =>
    set((s) => {
      const id = nanoid(6)
      return {
        voids: [...s.voids, { id, verts, name: '', levelId: s.activeLevel ?? null }],
        selection: { items: [{ kind: 'void', id }] },
        voidDraft: null,
      }
    }),

  updateVoid: (id, patch) =>
    set((s) => ({ voids: s.voids.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),

  removeVoid: (id) =>
    set((s) => ({
      voids: s.voids.filter((v) => v.id !== id),
      selection: (() => {
        const items = (s.selection?.items ?? []).filter((i) => !(i.kind === 'void' && i.id === id))
        return items.length ? { items } : null
      })(),
    })),

  // Move polygon vertices by index — drives the reshape handles.
  moveVoidVertices: (id, moves) =>
    set((s) => ({
      voids: s.voids.map((v) => {
        if (v.id !== id) return v
        const verts = v.verts.slice()
        for (const m of moves) {
          if (m.index >= 0 && m.index < verts.length) verts[m.index] = { x: m.x, y: m.y }
        }
        return { ...v, verts }
      }),
    })),

  // ── drawing draft (transient) ──────────────────────────────────────────────
  addVoidPoint: (pt) => set((s) => ({ voidDraft: [...(s.voidDraft ?? []), pt] })),
  cancelVoidDraft: () => set({ voidDraft: null }),
  finishVoidDraft: () =>
    set((s) => {
      const verts = s.voidDraft ?? []
      if (verts.length < 3) return { voidDraft: null }
      const id = nanoid(6)
      return {
        voids: [...s.voids, { id, verts, name: '', levelId: s.activeLevel ?? null }],
        selection: { items: [{ kind: 'void', id }] },
        voidDraft: null,
      }
    }),
})
