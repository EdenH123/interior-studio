// Wall surface materials. The 2D wall stroke and the 3D wall mesh both
// read color from here, keyed by the wall's optional `material` id. When
// a wall has `material: null` (or unrecognised id), it renders with
// `DEFAULT_WALL_COLOR` — the same neutral gray walls have always used.

export const WALL_MATERIALS = [
  { id: 'painted-white', label: 'Painted White', color: '#f5f4ef' },
  { id: 'brick',         label: 'Brick',         color: '#a14a3a' },
  { id: 'concrete',      label: 'Concrete',      color: '#a8a8aa' },
  { id: 'wood-panel',    label: 'Wood Panel',    color: '#a87852' },
  { id: 'wallpaper',     label: 'Wallpaper',     color: '#d6c5b3' },
]

export const DEFAULT_WALL_COLOR = '#e5e7eb'

const BY_ID = Object.fromEntries(WALL_MATERIALS.map((m) => [m.id, m]))

export function getWallMaterial(id) {
  return BY_ID[id] ?? null
}

export function wallColorFor(wall) {
  if (wall?.material) {
    const m = BY_ID[wall.material]
    if (m) return m.color
  }
  return DEFAULT_WALL_COLOR
}
