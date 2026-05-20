// Furniture catalog. Dimensions in meters (width × depth × height).
// width  = X extent in the floor plane (left-right when rotation = 0)
// depth  = Y extent in the floor plane (front-back when rotation = 0)
// height = Z extent (used by the 3D viewer; ignored in 2D)
//
// `model` is a URL/path to a `.glb` mesh. When set, the 3D viewer attempts
// to load it via `GLTFLoader` and scales the bounding box to width×depth×
// height. When null (or the load fails), the viewer falls back to a
// colored BoxGeometry sized to the same dimensions, per the `three-scene`
// skill's BoxGeometry-fallback rule.
//
// Drop GLBs into `src/assets/furniture/` and reference them with the Vite
// asset URL pattern (e.g. `model: new URL('../../assets/furniture/sofa.glb',
// import.meta.url).href`). Left as null for now — fallback path renders.
//
// Add new items here; the sidebar groups by `category` automatically.

export const FURNITURE = [
  { type: 'sofa',         label: 'Sofa',         category: 'Seating', width: 2.0, depth: 0.9, height: 0.85, color: '#475569', model: null },
  { type: 'armchair',     label: 'Armchair',     category: 'Seating', width: 0.9, depth: 0.9, height: 0.85, color: '#64748b', model: null },
  { type: 'chair',        label: 'Chair',        category: 'Seating', width: 0.45, depth: 0.5, height: 0.85, color: '#94a3b8', model: null },

  { type: 'coffee-table', label: 'Coffee table', category: 'Tables',  width: 1.1, depth: 0.6, height: 0.45, color: '#a16207', model: null },
  { type: 'dining-table', label: 'Dining table', category: 'Tables',  width: 1.6, depth: 0.9, height: 0.75, color: '#a16207', model: null },
  { type: 'desk',         label: 'Desk',         category: 'Tables',  width: 1.4, depth: 0.7, height: 0.75, color: '#92400e', model: null },

  { type: 'bed',          label: 'Bed',          category: 'Bedroom', width: 2.0, depth: 1.6, height: 0.6,  color: '#0f766e', model: null },

  { type: 'bookshelf',    label: 'Bookshelf',    category: 'Storage', width: 0.8, depth: 0.35, height: 1.8, color: '#78350f', model: null },
  { type: 'wardrobe',     label: 'Wardrobe',     category: 'Storage', width: 1.2, depth: 0.6, height: 2.0, color: '#78350f', model: null },

  { type: 'rug',          label: 'Rug',          category: 'Decor',   width: 2.0, depth: 1.4, height: 0.01, color: '#b45309', model: null },
  { type: 'lamp',         label: 'Lamp',         category: 'Decor',   width: 0.4, depth: 0.4, height: 1.5,  color: '#facc15', model: null },
  { type: 'tv',           label: 'TV',           category: 'Decor',   width: 1.2, depth: 0.15, height: 0.7, color: '#0f172a', model: null },
]

export const CATEGORIES = ['Seating', 'Tables', 'Bedroom', 'Storage', 'Decor']

const BY_TYPE = Object.fromEntries(FURNITURE.map((f) => [f.type, f]))

export function getFurnitureSpec(type) {
  return BY_TYPE[type] ?? null
}
