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
  // Move one or more wall vertices. `moves` is [{ from:{x,y}, to:{x,y} }].
  // Every active-level wall endpoint coincident with a `from` point (within
  // EPS) is set to the matching `to` — so dragging a shared corner moves all
  // the walls meeting there and the room stays closed. Matching is against the
  // pre-move coords so multiple moves in one call can't chain into each other.
  moveWallVertices: (moves) =>
    set((s) => {
      const EPS = 1.5
      const active = s.activeLevel ?? null
      const onLevel = (w) => !w.levelId || w.levelId === active
      const walls = s.walls.map((w) => {
        if (!onLevel(w)) return w
        let { x1, y1, x2, y2 } = w
        for (const m of moves) {
          if (Math.hypot(w.x1 - m.from.x, w.y1 - m.from.y) <= EPS) { x1 = m.to.x; y1 = m.to.y }
          if (Math.hypot(w.x2 - m.from.x, w.y2 - m.from.y) <= EPS) { x2 = m.to.x; y2 = m.to.y }
        }
        return (x1 !== w.x1 || y1 !== w.y1 || x2 !== w.x2 || y2 !== w.y2)
          ? { ...w, x1, y1, x2, y2 }
          : w
      })
      return { walls }
    }),
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
