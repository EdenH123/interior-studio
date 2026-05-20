import { nanoid } from 'nanoid/non-secure'

// Walls live as flat `{ id, x1, y1, x2, y2, material? }` records. Cross-slice
// touch: `removeWall` clears the UI selection when the removed wall was
// selected — `set` merges into the root state regardless of which slice
// declared a given key.
export const createWallsSlice = (set) => ({
  walls: [],
  addWall: (x1, y1, x2, y2) =>
    set((s) => ({ walls: [...s.walls, { id: nanoid(6), x1, y1, x2, y2 }] })),
  updateWall: (id, patch) =>
    set((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
  removeWall: (id) =>
    set((s) => {
      const openings = s.openings ? s.openings.filter((o) => o.wallId !== id) : s.openings
      const removedOpeningIds = new Set(
        (s.openings ?? []).filter((o) => o.wallId === id).map((o) => o.id),
      )
      // Selection clears if it pointed at the wall itself OR at an
      // opening that lived on it.
      let selection = s.selection
      if (selection?.id === id) selection = null
      else if (selection?.kind === 'opening' && removedOpeningIds.has(selection.id)) selection = null
      return {
        walls: s.walls.filter((w) => w.id !== id),
        openings,
        selection,
      }
    }),
})
