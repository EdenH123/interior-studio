// Furniture catalog. Dimensions in meters (width × depth × height).
// width  = X extent in the floor plane (left-right when rotation = 0)
// depth  = Y extent in the floor plane (front-back when rotation = 0)
// height = Z extent (used by the 3D viewer; ignored in 2D)
//
// `model` is a URL to a `.glb` mesh. The 3D viewer loads it via GLTFLoader
// and fits the bounding box to width × depth × height. If null (or the load
// fails) the viewer falls back to a colored BoxGeometry.
//
// GLBs live in `src/assets/furniture/`. The Vite `new URL(…, import.meta.url)`
// pattern fingerprints the asset and works in both dev and production.

const glb = (file) => new URL(`../../assets/furniture/${file}`, import.meta.url).href

export const FURNITURE = [
  { type: 'sofa',         label: 'Sofa',         category: 'Seating', width: 2.0,  depth: 0.9,  height: 0.85, color: '#475569', model: glb('sofa.glb') },
  { type: 'armchair',     label: 'Armchair',     category: 'Seating', width: 0.9,  depth: 0.9,  height: 0.85, color: '#64748b', model: glb('armchair.glb') },
  { type: 'chair',        label: 'Chair',        category: 'Seating', width: 0.45, depth: 0.5,  height: 0.85, color: '#94a3b8', model: glb('chair.glb') },

  { type: 'coffee-table', label: 'Coffee table', category: 'Tables',  width: 1.1,  depth: 0.6,  height: 0.45, color: '#a16207', model: glb('coffee-table.glb') },
  { type: 'dining-table', label: 'Dining table', category: 'Tables',  width: 1.6,  depth: 0.9,  height: 0.75, color: '#a16207', model: glb('dining-table.glb') },
  { type: 'desk',         label: 'Desk',         category: 'Tables',  width: 1.4,  depth: 0.7,  height: 0.75, color: '#92400e', model: glb('desk.glb') },

  { type: 'bed',          label: 'Bed',          category: 'Bedroom', width: 2.0,  depth: 1.6,  height: 0.6,  color: '#0f766e', model: glb('bed.glb') },

  { type: 'bookshelf',    label: 'Bookshelf',    category: 'Storage', width: 0.8,  depth: 0.35, height: 1.8,  color: '#78350f', model: glb('bookshelf.glb') },
  { type: 'wardrobe',     label: 'Wardrobe',     category: 'Storage', width: 1.2,  depth: 0.6,  height: 2.0,  color: '#78350f', model: glb('wardrobe.glb') },

  // ── Bathroom ──────────────────────────────────────────────────────────────
  { type: 'toilet',          label: 'Toilet',        category: 'Bathroom', width: 0.38, depth: 0.70, height: 0.80, color: '#d4d0cc', model: glb('toilet.glb') },
  { type: 'basin',           label: 'Basin',          category: 'Bathroom', width: 0.55, depth: 0.45, height: 0.85, color: '#d4d0cc', model: glb('basin.glb') },
  { type: 'bathtub',         label: 'Bathtub',        category: 'Bathroom', width: 1.70, depth: 0.75, height: 0.55, color: '#d4d0cc', model: glb('bathtub.glb') },
  { type: 'shower-tray',     label: 'Shower tray',    category: 'Bathroom', width: 0.90, depth: 0.90, height: 0.15, color: '#d4d0cc', model: glb('shower-tray.glb') },
  { type: 'towel-rack',      label: 'Towel rack',     category: 'Bathroom', width: 0.60, depth: 0.08, height: 0.04, color: '#b0b4b8', model: glb('towel-rack.glb'), wallMounted: true, mountHeight: 1.2 },
  { type: 'bathroom-mirror', label: 'Mirror',         category: 'Bathroom', width: 0.60, depth: 0.05, height: 0.80, color: '#b0b4b8', model: glb('bathroom-mirror.glb'), wallMounted: true, mountHeight: 1.4 },
  { type: 'vanity-unit',     label: 'Vanity unit',    category: 'Bathroom', width: 0.90, depth: 0.50, height: 0.85, color: '#d4d0cc', model: glb('vanity-unit.glb') },
  { type: 'laundry-basket',  label: 'Laundry basket', category: 'Bathroom', width: 0.45, depth: 0.40, height: 0.55, color: '#8b7355', model: glb('laundry-basket.glb') },

  // ── Kitchen ───────────────────────────────────────────────────────────────
  { type: 'kitchen-sink',   label: 'Kitchen sink',   category: 'Kitchen', width: 0.80, depth: 0.60, height: 0.90, color: '#9eaab0', model: glb('kitchen-sink.glb') },
  { type: 'fridge',         label: 'Fridge',         category: 'Kitchen', width: 0.70, depth: 0.70, height: 1.85, color: '#9eaab0', model: glb('fridge.glb') },
  { type: 'oven',           label: 'Oven',           category: 'Kitchen', width: 0.60, depth: 0.60, height: 0.90, color: '#4b5563', model: glb('oven.glb') },
  { type: 'dishwasher',     label: 'Dishwasher',     category: 'Kitchen', width: 0.60, depth: 0.60, height: 0.85, color: '#4b5563', model: glb('dishwasher.glb') },
  { type: 'microwave',      label: 'Microwave',      category: 'Kitchen', width: 0.55, depth: 0.35, height: 0.32, color: '#4b5563', model: glb('microwave.glb'), wallMounted: true, mountHeight: 1.4 },
  { type: 'upper-cabinet',  label: 'Upper cabinet',  category: 'Kitchen', width: 0.60, depth: 0.35, height: 0.70, color: '#c4b49a', model: glb('upper-cabinet.glb'), wallMounted: true, mountHeight: 1.45 },
  { type: 'range-hood',     label: 'Range hood',     category: 'Kitchen', width: 0.60, depth: 0.40, height: 0.35, color: '#9eaab0', model: glb('range-hood.glb'), wallMounted: true, mountHeight: 1.75 },
  { type: 'kitchen-island', label: 'Kitchen island', category: 'Kitchen', width: 1.50, depth: 0.80, height: 0.90, color: '#c4b49a', model: glb('kitchen-island.glb') },
  { type: 'pantry-unit',    label: 'Pantry unit',    category: 'Kitchen', width: 0.60, depth: 0.60, height: 2.00, color: '#c4b49a', model: glb('pantry-unit.glb') },
  { type: 'bar-stool',      label: 'Bar stool',      category: 'Kitchen', width: 0.40, depth: 0.40, height: 0.75, color: '#a16207', model: glb('bar-stool.glb') },

  { type: 'rug',          label: 'Rug',          category: 'Decor',   width: 2.0,  depth: 1.4,  height: 0.01, color: '#b45309', model: glb('rug.glb') },
  { type: 'lamp',         label: 'Lamp',         category: 'Decor',   width: 0.4,  depth: 0.4,  height: 1.5,  color: '#facc15', model: glb('lamp.glb') },
  { type: 'tv',           label: 'TV',           category: 'Decor',   width: 1.2,  depth: 0.15, height: 0.7,  color: '#0f172a', model: glb('tv.glb') },

  // Lighting — each carries extra light properties that are snapshotted into
  // the furniture item by furnitureSlice.addFurniture (all fields prefixed with
  // nothing — they live flat on the item alongside width/depth/height/color).
  {
    type: 'lighting:ceiling-lamp', label: 'Ceiling lamp', category: 'Lighting',
    width: 0.4, depth: 0.4, height: 0.4, color: '#fff8e1',
    model: glb('ceiling-lamp.glb'),
    lightType: 'point', intensity: 1.0, colorTemp: 3000, distance: 8, castShadow: true, on: true,
  },
  {
    type: 'lighting:floor-lamp', label: 'Floor lamp', category: 'Lighting',
    width: 0.4, depth: 0.4, height: 1.8, color: '#fff8e1',
    model: glb('floor-lamp.glb'),
    lightType: 'point', intensity: 0.8, colorTemp: 3000, distance: 5, castShadow: true, on: true,
  },
  {
    type: 'lighting:table-lamp', label: 'Table lamp', category: 'Lighting',
    width: 0.36, depth: 0.36, height: 0.45, color: '#fff8e1',
    model: glb('table-lamp.glb'),
    lightType: 'point', intensity: 0.6, colorTemp: 2700, distance: 3, castShadow: true, on: true,
  },
  {
    type: 'lighting:pendant', label: 'Pendant', category: 'Lighting',
    width: 0.3, depth: 0.3, height: 0.65, color: '#c8a850',
    model: glb('pendant.glb'),
    lightType: 'spot', intensity: 1.2, colorTemp: 3000, distance: 5, castShadow: true, on: true,
  },

  // Architecture — structural elements placed like furniture but rendered with
  // bespoke Three.js geometry (stairs use buildStairsGeometry, not a box).
  {
    type: 'stairs', label: 'Stairs', category: 'Architecture',
    width: 0.9, depth: 3.0, height: 2.7, color: '#8b7355', model: null,
    stairType: true,
  },
]

export const CATEGORIES = ['Architecture', 'Seating', 'Tables', 'Bedroom', 'Storage', 'Bathroom', 'Kitchen', 'Decor', 'Lighting']

const BY_TYPE = Object.fromEntries(FURNITURE.map((f) => [f.type, f]))

export function getFurnitureSpec(type) {
  return BY_TYPE[type] ?? null
}
