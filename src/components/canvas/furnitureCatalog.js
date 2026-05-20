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

export const CATEGORIES = ['Architecture', 'Seating', 'Tables', 'Bedroom', 'Storage', 'Decor', 'Lighting']

const BY_TYPE = Object.fromEntries(FURNITURE.map((f) => [f.type, f]))

export function getFurnitureSpec(type) {
  return BY_TYPE[type] ?? null
}
