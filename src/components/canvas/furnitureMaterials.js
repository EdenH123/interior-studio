// Per-piece colour overrides for furniture. When a furniture item has
// `material: <id>`, that material's hex replaces the catalog default
// (`item.color`). When `material` is null/undefined, the catalog colour
// renders. Same pattern as wallMaterials + floorMaterials.
//
// Composed from: all wood finishes, a curated subset of paint colors that
// are useful for painted furniture (whites, neutrals, blacks, navy), and
// a small fabric-tone palette for upholstered pieces.
//
// The override applies only to the 2D footprint and the 3D BoxGeometry
// fallback. Loaded GLB models keep their authored materials.
//
// Backward compatibility: pre-2026-05-21 designs used the ids
// 'light-wood', 'dark-wood', 'white', 'black', 'linen', 'navy', 'forest'.
// Mapped through `LEGACY_MIGRATIONS`.

import { WOOD_FINISHES } from './woodFinishes'
import { BENJAMIN_MOORE } from './benjaminMooreColors'
import { SHERWIN_WILLIAMS } from './sherwinWilliamsColors'

const fromWood = (w) => ({ id: w.id, label: w.name, color: w.hex, category: 'Wood Finish' })

// Curated paints suitable for painted furniture (cabinets, tables, etc.).
// Keep this list tight; the wall catalog is already exhaustive.
const PAINT_IDS_FOR_FURNITURE = new Set([
  'bm-decorators-white', 'bm-white-dove', 'bm-chantilly-lace',
  'bm-revere-pewter', 'bm-chelsea-gray',
  'bm-hale-navy', 'bm-hunter-green',
  'bm-wrought-iron', 'bm-black-iron',
  'sw-pure-white', 'sw-alabaster',
  'sw-agreeable-gray', 'sw-iron-ore',
  'sw-naval', 'sw-evergreen-fog', 'sw-urbane-bronze',
  'sw-tricorn-black',
])

const ALL_PAINTS = [...BENJAMIN_MOORE, ...SHERWIN_WILLIAMS]
  .filter((c) => PAINT_IDS_FOR_FURNITURE.has(c.id))
  .map((c) => ({ id: c.id, label: c.name, color: c.hex, code: c.code, category: 'Paint' }))

// Fabric / upholstery tones — designed-for-furniture neutrals + accents.
// No supplier code; these are abstract palette entries.
const FABRIC_TONES = [
  { id: 'fabric-ivory',         label: 'Ivory',          color: '#EFE7D3', category: 'Fabric' },
  { id: 'fabric-cream-linen',   label: 'Cream Linen',    color: '#D6C5B3', category: 'Fabric' },
  { id: 'fabric-warm-gray',     label: 'Warm Gray',      color: '#A89C8E', category: 'Fabric' },
  { id: 'fabric-charcoal',      label: 'Charcoal',       color: '#3F3F44', category: 'Fabric' },
  { id: 'fabric-sage',          label: 'Sage',           color: '#9CA98C', category: 'Fabric' },
  { id: 'fabric-mustard',       label: 'Mustard',        color: '#B68A3C', category: 'Fabric' },
  { id: 'fabric-rust',          label: 'Rust',           color: '#A8553A', category: 'Fabric' },
  { id: 'fabric-deep-navy',     label: 'Deep Navy',      color: '#26334A', category: 'Fabric' },
]

export const FURNITURE_MATERIALS = [
  ...WOOD_FINISHES.map(fromWood),
  ...ALL_PAINTS,
  ...FABRIC_TONES,
]

const LEGACY_MIGRATIONS = {
  'light-wood': 'wood-honey-oak',
  'dark-wood':  'wood-walnut',
  'white':      'bm-decorators-white',
  'black':      'sw-tricorn-black',
  'linen':      'fabric-cream-linen',
  'navy':       'fabric-deep-navy',
  'forest':     'bm-hunter-green',
}

export function resolveFurnitureMaterialId(id) {
  if (!id) return null
  return LEGACY_MIGRATIONS[id] ?? id
}

const BY_ID = Object.fromEntries(FURNITURE_MATERIALS.map((m) => [m.id, m]))

export function getFurnitureMaterial(id) {
  const resolved = resolveFurnitureMaterialId(id)
  return resolved ? BY_ID[resolved] ?? null : null
}

// Resolved colour: material override wins; otherwise the catalog default
// snapshotted onto the piece at add-time.
export function furnitureColorFor(item) {
  if (item?.material) {
    const m = getFurnitureMaterial(item.material)
    if (m) return m.color
  }
  return item?.color ?? '#888'
}
