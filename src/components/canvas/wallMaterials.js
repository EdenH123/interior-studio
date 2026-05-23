// Wall surface materials. Composed from real-world paint catalogs
// (Benjamin Moore + Sherwin-Williams) plus a wood panel option. Each
// entry carries `{ id, label, color, category, code? }` — the `category`
// field is what the MaterialPicker groups by; `code` (paint code) is
// shown in the swatch tooltip.
//
// Backward compatibility: pre-2026-05-21 designs used the ids
// 'painted-white', 'brick', 'concrete', 'wood-panel', 'wallpaper'. Those
// are mapped to current ids through `LEGACY_MIGRATIONS` so persisted
// state hydrates without breakage. `wood-panel` is kept verbatim.

import { BENJAMIN_MOORE } from './benjaminMooreColors'
import { SHERWIN_WILLIAMS } from './sherwinWilliamsColors'

const fromBM = (c) => ({ id: c.id, label: c.name, color: c.hex, code: c.code, category: 'Benjamin Moore' })
const fromSW = (c) => ({ id: c.id, label: c.name, color: c.hex, code: c.code, category: 'Sherwin-Williams' })

const WOOD_PANEL = { id: 'wood-panel', label: 'Wood Panel', color: '#A87852', category: 'Other' }

const STRUCTURAL = [
  { id: 'struct-brick',    label: 'Brick',     color: '#c8714e', category: 'Structural' },
  { id: 'struct-stone',    label: 'Stone',     color: '#b8b4ae', category: 'Structural' },
  { id: 'struct-concrete', label: 'Concrete',  color: '#787880', category: 'Structural' },
]

export const WALL_MATERIALS = [
  ...STRUCTURAL,
  ...BENJAMIN_MOORE.map(fromBM),
  ...SHERWIN_WILLIAMS.map(fromSW),
  WOOD_PANEL,
]

// Legacy id → new id. Pre-2026-05-21 designs used these short names; map
// them to the closest paint analog so old projects render correctly.
const LEGACY_MIGRATIONS = {
  'painted-white': 'bm-decorators-white',
  'brick':         'sw-pottery-red',
  'concrete':      'sw-repose-gray',
  'wallpaper':     'bm-swiss-coffee',
  // 'wood-panel' kept as-is (still in catalog)
}

// Resolve a material id through legacy migrations. Always call this when
// looking up a material by id from stored state.
export function resolveWallMaterialId(id) {
  if (!id) return null
  return LEGACY_MIGRATIONS[id] ?? id
}

export const DEFAULT_WALL_COLOR = '#e5e7eb'

const BY_ID = Object.fromEntries(WALL_MATERIALS.map((m) => [m.id, m]))

export function getWallMaterial(id) {
  const resolved = resolveWallMaterialId(id)
  return resolved ? BY_ID[resolved] ?? null : null
}

export function wallColorFor(wall) {
  if (wall?.material) {
    const m = getWallMaterial(wall.material)
    if (m) return m.color
  }
  return DEFAULT_WALL_COLOR
}
