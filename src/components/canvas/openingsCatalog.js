// Catalog of placeable wall openings. Unlike furniture, openings live on
// a parent wall — placement requires the cursor to be near a wall and the
// drop snaps to it (see useOpeningDrop). Width is meters; height is also
// meters (for the 3D CSG cut and the visual indicator). sillHeight is the
// distance from the floor to the bottom of the opening — 0 for doors,
// 0.9 m for windows so they sit above counter height.

export const OPENINGS = [
  { type: 'door',   label: 'Door',   width: 0.9, height: 2.1, sillHeight: 0 },
  { type: 'window', label: 'Window', width: 1.2, height: 1.4, sillHeight: 0.9 },
]

const BY_TYPE = Object.fromEntries(OPENINGS.map((o) => [o.type, o]))

export function getOpeningSpec(type) {
  return BY_TYPE[type] ?? null
}

// Used by the drag handler in Sidebar.jsx so the canvas can tell furniture
// drops apart from opening drops without re-checking the catalog.
export const OPENING_DRAG_MIME = 'application/x-interior-studio-opening'
