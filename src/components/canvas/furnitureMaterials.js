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

// Velvet — very matte, deep saturated colours (roughness 0.95 applied in 3D)
const VELVET_TONES = [
  { id: 'velvet-emerald',    label: 'Emerald',    color: '#2A6048', category: 'Velvet' },
  { id: 'velvet-cobalt',     label: 'Cobalt',     color: '#1B3880', category: 'Velvet' },
  { id: 'velvet-rose',       label: 'Dusty Rose', color: '#C05070', category: 'Velvet' },
  { id: 'velvet-mauve',      label: 'Mauve',      color: '#8A5070', category: 'Velvet' },
  { id: 'velvet-ochre',      label: 'Ochre',      color: '#C87830', category: 'Velvet' },
  { id: 'velvet-midnight',   label: 'Midnight',   color: '#1E2040', category: 'Velvet' },
  { id: 'velvet-forest',     label: 'Forest',     color: '#2A4438', category: 'Velvet' },
  { id: 'velvet-terracotta', label: 'Terracotta', color: '#B84830', category: 'Velvet' },
]

// Leather — semi-smooth, warm tones (roughness 0.38 applied in 3D)
const LEATHER_TONES = [
  { id: 'leather-cognac',    label: 'Cognac',     color: '#9C4418', category: 'Leather' },
  { id: 'leather-caramel',   label: 'Caramel',    color: '#B87028', category: 'Leather' },
  { id: 'leather-chocolate', label: 'Chocolate',  color: '#4A2010', category: 'Leather' },
  { id: 'leather-cream',     label: 'Cream',      color: '#E0D4B8', category: 'Leather' },
  { id: 'leather-black',     label: 'Black',      color: '#181818', category: 'Leather' },
  { id: 'leather-tan',       label: 'Tan',        color: '#C09860', category: 'Leather' },
  { id: 'leather-bordeaux',  label: 'Bordeaux',   color: '#681820', category: 'Leather' },
]

export const FURNITURE_MATERIALS = [
  ...WOOD_FINISHES.map(fromWood),
  ...ALL_PAINTS,
  ...FABRIC_TONES,
  ...VELVET_TONES,
  ...LEATHER_TONES,
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

// Returns { roughness, metallic, fabricOnly } overrides for the selected
// material, or null for Wood/Paint (keep the GLB's own roughness).
// fabricOnly=true → tint only upholstery meshes, leave legs/frame unchanged.
export function furnitureMaterialPropsFor(item) {
  if (!item?.material) return null
  const m = getFurnitureMaterial(item.material)
  if (!m) return null
  if (m.category === 'Velvet')  return { roughness: 0.95, metallic: 0.0, fabricOnly: true }
  if (m.category === 'Leather') return { roughness: 0.38, metallic: 0.0, fabricOnly: true }
  if (m.category === 'Fabric')  return { roughness: 0.88, metallic: 0.0, fabricOnly: true }
  return null
}
