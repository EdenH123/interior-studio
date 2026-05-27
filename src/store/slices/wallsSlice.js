import { nanoid } from 'nanoid/non-secure'

// Walls live as flat `{ id, x1, y1, x2, y2, material? }` records. Cross-slice
// touch: `removeWall` clears the UI selection when the removed wall was
// selected — `set` merges into the root state regardless of which slice
// declared a given key.
export const createWallsSlice = (set) => ({
  walls: [],
  addWall: (x1, y1, x2, y2) =>
    set((s) => ({ walls: [...s.walls, { id: nanoid(6), x1, y1, x2, y2, levelId: s.activeLevel ?? null }] })),
  updateWall: (id, patch) =>
    set((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
  removeWall: (id) =>
    set((s) => {
      const openings = s.openings ? s.openings.filter((o) => o.wallId !== id) : s.openings
      const removedOpeningIds = new Set(
        (s.openings ?? []).filter((o) => o.wallId === id).map((o) => o.id),
      )
      // Railings mounted on this wall are meaningless without it — cascade.
      const removedFurnIds = new Set(
        (s.furniture ?? []).filter((f) => f.mountWallId === id).map((f) => f.id),
      )
      const furniture = removedFurnIds.size
        ? s.furniture.filter((f) => !removedFurnIds.has(f.id))
        : s.furniture
      // Selection clears any reference to the removed wall, its openings, or
      // its cascaded furniture.
      const prevItems = s.selection?.items ?? []
      const nextItems = prevItems.filter(
        (i) => !(i.kind === 'wall' && i.id === id) &&
               !(i.kind === 'opening' && removedOpeningIds.has(i.id)) &&
               !(i.kind === 'furniture' && removedFurnIds.has(i.id)),
      )
      const selection = nextItems.length === prevItems.length
        ? s.selection
        : nextItems.length ? { items: nextItems } : null
      return {
        walls: s.walls.filter((w) => w.id !== id),
        openings,
        furniture,
        selection,
      }
    }),
})
