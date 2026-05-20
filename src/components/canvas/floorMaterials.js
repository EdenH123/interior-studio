// Floor materials applied to detected rooms.
//
// `color` is the opaque base. The 2D Room overlay uses it with low alpha
// (so walls and grid show through); the 3D viewer (future task) uses the
// opaque value on the per-room floor mesh.

export const FLOOR_MATERIALS = [
  { id: 'wood',     label: 'Wood',     color: '#c19058' },
  { id: 'tile',     label: 'Tile',     color: '#b4c8d7' },
  { id: 'carpet',   label: 'Carpet',   color: '#b4645f' },
  { id: 'marble',   label: 'Marble',   color: '#dcd7d2' },
  { id: 'concrete', label: 'Concrete', color: '#787880' },
]

const BY_ID = Object.fromEntries(FLOOR_MATERIALS.map((m) => [m.id, m]))

export function getFloorMaterial(id) {
  return BY_ID[id] ?? null
}

// Default tint when no material has been chosen.
export const DEFAULT_ROOM_FILL = 'rgba(56, 189, 248, 0.10)'

// Convert a material's opaque color to a translucent 2D overlay fill.
// Accepts `#rrggbb`.
export function materialOverlayFill(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, 0.35)`
}
