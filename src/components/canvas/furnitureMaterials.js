// Per-piece colour overrides for furniture. When a furniture item has
// `material: <id>`, that material's hex replaces the catalog default
// (`item.color`). When `material` is null/undefined, the catalog colour
// renders. Same pattern as wallMaterials.js + floorMaterials.js.
//
// The override applies only to the 2D footprint and the 3D BoxGeometry
// fallback. Loaded GLB models keep their authored materials — colouring
// them per-piece is a future enhancement.

export const FURNITURE_MATERIALS = [
  { id: 'light-wood', label: 'Light Wood', color: '#c8a878' },
  { id: 'dark-wood',  label: 'Dark Wood',  color: '#6b4a2a' },
  { id: 'white',      label: 'White',      color: '#f5f4ef' },
  { id: 'black',      label: 'Black',      color: '#1f2937' },
  { id: 'linen',      label: 'Linen',      color: '#d6c5b3' },
  { id: 'navy',       label: 'Navy',       color: '#334e7d' },
  { id: 'forest',     label: 'Forest',     color: '#3a5e44' },
]

const BY_ID = Object.fromEntries(FURNITURE_MATERIALS.map((m) => [m.id, m]))

export function getFurnitureMaterial(id) {
  return BY_ID[id] ?? null
}

// Resolved colour: material override wins; otherwise the catalog default
// snapshotted onto the piece at add-time.
export function furnitureColorFor(item) {
  if (item?.material) {
    const m = BY_ID[item.material]
    if (m) return m.color
  }
  return item?.color ?? '#888'
}
