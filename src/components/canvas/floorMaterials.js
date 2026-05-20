// Floor materials applied to detected rooms.
//
// `color` is the opaque base. The 2D Room overlay uses it with low alpha
// (so walls and grid show through); the 3D viewer uses the opaque value
// on the per-room floor mesh.
//
// Composed from the wood finish catalog plus tile / carpet / concrete /
// marble (kept from the original simple catalog).
//
// Backward compatibility: pre-2026-05-21 designs used ids 'wood', 'tile',
// 'carpet', 'marble', 'concrete'. Mapped through `LEGACY_MIGRATIONS`.

import { WOOD_FINISHES } from './woodFinishes'

const fromWood = (w) => ({ id: w.id, label: w.name, color: w.hex, category: 'Wood Finish' })

const OTHER_FLOORS = [
  { id: 'tile',     label: 'Tile',     color: '#B4C8D7', category: 'Other Materials' },
  { id: 'marble',   label: 'Marble',   color: '#DCD7D2', category: 'Other Materials' },
  { id: 'concrete', label: 'Concrete', color: '#787880', category: 'Other Materials' },
  { id: 'carpet',   label: 'Carpet',   color: '#B4645F', category: 'Other Materials' },
]

export const FLOOR_MATERIALS = [
  ...WOOD_FINISHES.map(fromWood),
  ...OTHER_FLOORS,
]

const LEGACY_MIGRATIONS = {
  'wood': 'wood-honey-oak',
  // 'tile', 'carpet', 'marble', 'concrete' kept as-is (still in catalog)
}

export function resolveFloorMaterialId(id) {
  if (!id) return null
  return LEGACY_MIGRATIONS[id] ?? id
}

const BY_ID = Object.fromEntries(FLOOR_MATERIALS.map((m) => [m.id, m]))

export function getFloorMaterial(id) {
  const resolved = resolveFloorMaterialId(id)
  return resolved ? BY_ID[resolved] ?? null : null
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
