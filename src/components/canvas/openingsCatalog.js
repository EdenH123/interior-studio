// Catalog of placeable wall openings. Unlike furniture, openings live on
// a parent wall — placement requires the cursor to be near a wall and the
// drop snaps to it (see useOpeningDrop). Width is meters; height is also
// meters (for the 3D CSG cut and the visual indicator). sillHeight is the
// distance from the floor to the bottom of the opening — 0 for doors,
// 0.9 m for windows so they sit above counter height.

export const OPENINGS = [
  { type: 'door',            label: 'Hinged Door',   width: 0.9, height: 2.1, sillHeight: 0   },
  { type: 'door-double',     label: 'Double Door',   width: 1.6, height: 2.1, sillHeight: 0   },
  { type: 'door-sliding',    label: 'Sliding Door',  width: 1.2, height: 2.1, sillHeight: 0   },
  { type: 'door-pivot',      label: 'Pivot Door',    width: 1.0, height: 2.1, sillHeight: 0   },
  { type: 'window',          label: 'Window',        width: 1.2, height: 1.4, sillHeight: 0.9 },
  { type: 'window-fixed',    label: 'Fixed Window',  width: 1.5, height: 1.2, sillHeight: 0.9 },
  { type: 'window-casement', label: 'Casement',      width: 1.0, height: 1.2, sillHeight: 0.9 },
  { type: 'window-arched',   label: 'Arched Window', width: 1.0, height: 1.4, sillHeight: 0.9 },
  { type: 'opening',         label: 'Open Arch',     width: 1.2, height: 2.1, sillHeight: 0   },
  { type: 'opening-wide',    label: 'Wide Opening',  width: 2.4, height: 2.2, sillHeight: 0   },
]

const BY_TYPE = Object.fromEntries(OPENINGS.map((o) => [o.type, o]))

export function getOpeningSpec(type) {
  return BY_TYPE[type] ?? null
}

// Used by the drag handler in Sidebar.jsx so the canvas can tell furniture
// drops apart from opening drops without re-checking the catalog.
export const OPENING_DRAG_MIME = 'application/x-interior-studio-opening'
