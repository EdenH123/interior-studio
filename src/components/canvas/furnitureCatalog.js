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

// Parts define the named material groups in the GLB. Keys match material names
// baked into the file by the generator scripts. Users can override per-part colors.
const SEAT_PARTS    = [{ key: 'fabric', label: 'Fabric' }, { key: 'legs', label: 'Legs' }]
const TABLE_PARTS   = [{ key: 'top',    label: 'Top'    }, { key: 'legs', label: 'Legs' }]
const BED_PARTS     = [{ key: 'frame',  label: 'Frame'  }, { key: 'mattress', label: 'Mattress' }]

export const FURNITURE = [
  // ── Seating ───────────────────────────────────────────────────────────────
  { type: 'sofa',         label: 'Sofa',          category: 'Seating', width: 2.0,  depth: 0.9,  height: 0.85, color: '#475569', model: glb('sofa.glb'),         parts: SEAT_PARTS },
  { type: 'loveseat',     label: 'Loveseat',       category: 'Seating', width: 1.4,  depth: 0.85, height: 0.85, color: '#64748b', model: glb('loveseat.glb'),     parts: SEAT_PARTS },
  { type: 'chaise',       label: 'Chaise lounge',  category: 'Seating', width: 1.8,  depth: 0.80, height: 0.85, color: '#94a3b8', model: glb('chaise.glb'),       parts: SEAT_PARTS },
  { type: 'armchair',     label: 'Armchair',       category: 'Seating', width: 0.9,  depth: 0.9,  height: 0.85, color: '#64748b', model: glb('armchair.glb'),     parts: SEAT_PARTS },
  { type: 'chair',        label: 'Chair',          category: 'Seating', width: 0.45, depth: 0.5,  height: 0.85, color: '#94a3b8', model: glb('chair.glb') },
  { type: 'dining-chair', label: 'Dining chair',   category: 'Seating', width: 0.48, depth: 0.50, height: 0.90, color: '#a16207', model: glb('dining-chair.glb'), parts: [{ key: 'seat', label: 'Seat' }, { key: 'frame', label: 'Frame' }] },
  { type: 'bench',        label: 'Bench',          category: 'Seating', width: 1.2,  depth: 0.45, height: 0.48, color: '#92400e', model: glb('bench.glb'),        parts: [{ key: 'seat', label: 'Seat' }, { key: 'frame', label: 'Frame' }] },
  { type: 'ottoman',      label: 'Ottoman',        category: 'Seating', width: 0.65, depth: 0.65, height: 0.42, color: '#78716c', model: glb('ottoman.glb'),      parts: SEAT_PARTS },
  { type: 'pouf',         label: 'Pouf',           category: 'Seating', width: 0.65, depth: 0.65, height: 0.40, color: '#a8937a', model: glb('pouf.glb'),         parts: [{ key: 'body', label: 'Body' }, { key: 'top', label: 'Top' }] },

  // ── Tables ────────────────────────────────────────────────────────────────
  { type: 'coffee-table',   label: 'Coffee table',   category: 'Tables', width: 1.1,  depth: 0.6,  height: 0.45, color: '#a16207', model: glb('coffee-table.glb'),  parts: TABLE_PARTS },
  { type: 'dining-table',   label: 'Dining table',   category: 'Tables', width: 1.6,  depth: 0.9,  height: 0.75, color: '#a16207', model: glb('dining-table.glb'),  parts: TABLE_PARTS },
  { type: 'desk',           label: 'Desk',           category: 'Tables', width: 1.4,  depth: 0.7,  height: 0.75, color: '#92400e', model: glb('desk.glb'),          parts: [{ key: 'body', label: 'Body' }, { key: 'legs', label: 'Legs' }] },
  { type: 'console-table',  label: 'Console table',  category: 'Tables', width: 1.2,  depth: 0.35, height: 0.80, color: '#a16207', model: glb('console-table.glb'), parts: TABLE_PARTS },
  { type: 'side-table',     label: 'Side table',     category: 'Tables', width: 0.55, depth: 0.55, height: 0.55, color: '#e7e0d8', model: glb('side-table.glb'),    parts: [{ key: 'top', label: 'Top' }, { key: 'base', label: 'Base' }] },
  { type: 'nightstand',     label: 'Nightstand',     category: 'Tables', width: 0.50, depth: 0.40, height: 0.55, color: '#92400e', model: glb('nightstand.glb'),    parts: [{ key: 'body', label: 'Body' }, { key: 'handle', label: 'Handle' }] },

  // ── Bedroom ───────────────────────────────────────────────────────────────
  { type: 'bed',         label: 'Bed (double)',  category: 'Bedroom', width: 2.0,  depth: 1.6,  height: 0.6,  color: '#0f766e', model: glb('bed.glb'),        parts: BED_PARTS },
  { type: 'single-bed',  label: 'Bed (single)',  category: 'Bedroom', width: 1.1,  depth: 2.0,  height: 0.6,  color: '#0f766e', model: glb('single-bed.glb'), parts: BED_PARTS },

  // ── Office ────────────────────────────────────────────────────────────────
  { type: 'office-chair', label: 'Office chair', category: 'Office', width: 0.65, depth: 0.65, height: 1.15, color: '#1c1917', model: glb('office-chair.glb'), parts: [{ key: 'fabric', label: 'Fabric' }, { key: 'base', label: 'Base' }] },

  // ── Storage ───────────────────────────────────────────────────────────────
  { type: 'bookshelf', label: 'Bookshelf', category: 'Storage', width: 0.8,  depth: 0.35, height: 1.8, color: '#78350f', model: glb('bookshelf.glb'), parts: [{ key: 'frame', label: 'Frame' }, { key: 'books', label: 'Books' }] },
  { type: 'wardrobe',  label: 'Wardrobe',  category: 'Storage', width: 1.2,  depth: 0.6,  height: 2.0, color: '#78350f', model: glb('wardrobe.glb'),  parts: [{ key: 'body', label: 'Body' }, { key: 'handles', label: 'Handles' }] },

  // ── Bathroom ──────────────────────────────────────────────────────────────
  { type: 'toilet',          label: 'Toilet',         category: 'Bathroom', width: 0.38, depth: 0.70, height: 0.80, color: '#d4d0cc', model: glb('toilet.glb'),          parts: [{ key: 'body', label: 'Body' }, { key: 'seat', label: 'Seat' }] },
  { type: 'basin',           label: 'Basin',          category: 'Bathroom', width: 0.55, depth: 0.45, height: 0.85, color: '#d4d0cc', model: glb('basin.glb'),           parts: [{ key: 'body', label: 'Basin' }, { key: 'legs', label: 'Pedestal' }] },
  { type: 'bathtub',         label: 'Bathtub',        category: 'Bathroom', width: 1.70, depth: 0.75, height: 0.55, color: '#d4d0cc', model: glb('bathtub.glb'),         parts: [{ key: 'body', label: 'Body' }, { key: 'inside', label: 'Inside' }] },
  { type: 'shower-tray',     label: 'Shower tray',    category: 'Bathroom', width: 0.90, depth: 0.90, height: 0.15, color: '#d4d0cc', model: glb('shower-tray.glb') },
  { type: 'towel-rack',      label: 'Towel rack',     category: 'Bathroom', width: 0.60, depth: 0.08, height: 0.04, color: '#b0b4b8', model: glb('towel-rack.glb'),      wallMounted: true, mountHeight: 1.2 },
  { type: 'bathroom-mirror', label: 'Mirror',         category: 'Bathroom', width: 0.60, depth: 0.05, height: 0.80, color: '#b0b4b8', model: glb('bathroom-mirror.glb'), wallMounted: true, mountHeight: 1.4 },
  { type: 'vanity-unit',     label: 'Vanity unit',    category: 'Bathroom', width: 0.90, depth: 0.50, height: 0.85, color: '#d4d0cc', model: glb('vanity-unit.glb'),     parts: [{ key: 'body', label: 'Body' }, { key: 'top', label: 'Top' }] },
  { type: 'laundry-basket',  label: 'Laundry basket', category: 'Bathroom', width: 0.45, depth: 0.40, height: 0.55, color: '#8b7355', model: glb('laundry-basket.glb') },

  // ── Kitchen ───────────────────────────────────────────────────────────────
  { type: 'kitchen-sink',   label: 'Kitchen sink',   category: 'Kitchen', width: 0.80, depth: 0.60, height: 0.90, color: '#9eaab0', model: glb('kitchen-sink.glb'),   parts: [{ key: 'body', label: 'Cabinet' }, { key: 'sink', label: 'Sink' }] },
  { type: 'fridge',         label: 'Fridge',         category: 'Kitchen', width: 0.70, depth: 0.70, height: 1.85, color: '#9eaab0', model: glb('fridge.glb'),         parts: [{ key: 'body', label: 'Body' }, { key: 'door', label: 'Door' }] },
  { type: 'oven',           label: 'Oven',           category: 'Kitchen', width: 0.60, depth: 0.60, height: 0.90, color: '#4b5563', model: glb('oven.glb'),           parts: [{ key: 'body', label: 'Body' }, { key: 'door', label: 'Door' }] },
  { type: 'dishwasher',     label: 'Dishwasher',     category: 'Kitchen', width: 0.60, depth: 0.60, height: 0.85, color: '#4b5563', model: glb('dishwasher.glb'),     parts: [{ key: 'body', label: 'Body' }, { key: 'door', label: 'Door' }] },
  { type: 'microwave',      label: 'Microwave',      category: 'Kitchen', width: 0.55, depth: 0.35, height: 0.32, color: '#4b5563', model: glb('microwave.glb'),      wallMounted: true, mountHeight: 1.4 },
  { type: 'upper-cabinet',  label: 'Upper cabinet',  category: 'Kitchen', width: 0.60, depth: 0.35, height: 0.70, color: '#c4b49a', model: glb('upper-cabinet.glb'), wallMounted: true, mountHeight: 1.45, parts: [{ key: 'body', label: 'Body' }, { key: 'door', label: 'Door' }] },
  { type: 'range-hood',     label: 'Range hood',     category: 'Kitchen', width: 0.60, depth: 0.40, height: 0.35, color: '#9eaab0', model: glb('range-hood.glb'),     wallMounted: true, mountHeight: 1.75 },
  { type: 'kitchen-island', label: 'Kitchen island', category: 'Kitchen', width: 1.50, depth: 0.80, height: 0.90, color: '#c4b49a', model: glb('kitchen-island.glb'), parts: [{ key: 'body', label: 'Body' }, { key: 'top', label: 'Top' }] },
  { type: 'pantry-unit',    label: 'Pantry unit',    category: 'Kitchen', width: 0.60, depth: 0.60, height: 2.00, color: '#c4b49a', model: glb('pantry-unit.glb'),    parts: [{ key: 'body', label: 'Body' }, { key: 'door', label: 'Door' }] },
  { type: 'bar-stool',      label: 'Bar stool',      category: 'Kitchen', width: 0.40, depth: 0.40, height: 0.75, color: '#a16207', model: glb('bar-stool.glb'),      parts: [{ key: 'seat', label: 'Seat' }, { key: 'legs', label: 'Legs' }] },

  // ── IKEA Living ───────────────────────────────────────────────────────────
  { type: 'ikea-ektorp-2',    label: 'EKTORP 2-seat',     category: 'IKEA Living', width: 1.80, depth: 0.88, height: 0.88, color: '#d4c5a0', model: glb('ikea-ektorp-2.glb'),    parts: SEAT_PARTS },
  { type: 'ikea-ektorp-3',    label: 'EKTORP 3-seat',     category: 'IKEA Living', width: 2.18, depth: 0.88, height: 0.88, color: '#d4c5a0', model: glb('ikea-ektorp-3.glb'),    parts: SEAT_PARTS },
  { type: 'ikea-klippan',     label: 'KLIPPAN loveseat',  category: 'IKEA Living', width: 1.80, depth: 0.88, height: 0.66, color: '#d4c5a0', model: glb('ikea-klippan.glb'),     parts: SEAT_PARTS },
  { type: 'ikea-soderhamn-3', label: 'SÖDERHAMN 3-seat',  category: 'IKEA Living', width: 2.34, depth: 0.99, height: 0.83, color: '#c8b89a', model: glb('ikea-soderhamn-3.glb'), parts: [{ key: 'fabric', label: 'Fabric' }, { key: 'base', label: 'Base' }] },
  { type: 'ikea-poang',       label: 'POÄNG armchair',    category: 'IKEA Living', width: 0.82, depth: 0.82, height: 1.00, color: '#c4a882', model: glb('ikea-poang.glb'),       parts: [{ key: 'fabric', label: 'Fabric' }, { key: 'frame', label: 'Frame' }] },
  { type: 'ikea-lack-side',   label: 'LACK side table',   category: 'IKEA Living', width: 0.45, depth: 0.45, height: 0.55, color: '#f0ede8', model: glb('ikea-lack-side.glb'),   parts: [{ key: 'body', label: 'Body' }] },
  { type: 'ikea-lack-coffee', label: 'LACK coffee table', category: 'IKEA Living', width: 0.90, depth: 0.55, height: 0.45, color: '#f0ede8', model: glb('ikea-lack-coffee.glb'), parts: [{ key: 'body', label: 'Body' }] },
  { type: 'ikea-besta-120',   label: 'BESTÅ 120 TV unit', category: 'IKEA Living', width: 1.20, depth: 0.40, height: 0.64, color: '#f0ede8', model: glb('ikea-besta-120.glb'),   parts: [{ key: 'body', label: 'Body' }, { key: 'door', label: 'Door' }] },
  { type: 'ikea-besta-180',   label: 'BESTÅ 180 TV unit', category: 'IKEA Living', width: 1.80, depth: 0.40, height: 0.64, color: '#f0ede8', model: glb('ikea-besta-180.glb'),   parts: [{ key: 'body', label: 'Body' }, { key: 'door', label: 'Door' }] },
  { type: 'ikea-lisabo-desk', label: 'LISABO desk',       category: 'IKEA Living', width: 1.40, depth: 0.65, height: 0.74, color: '#c8a870', model: glb('ikea-lisabo-desk.glb'), parts: TABLE_PARTS },

  // ── IKEA Bedroom ──────────────────────────────────────────────────────────
  { type: 'ikea-malm-bed-140',  label: 'MALM bed 140',          category: 'IKEA Bedroom', width: 1.60, depth: 2.09, height: 0.90, color: '#c8b899', model: glb('ikea-malm-bed-140.glb'),  parts: BED_PARTS },
  { type: 'ikea-malm-bed-160',  label: 'MALM bed 160',          category: 'IKEA Bedroom', width: 1.75, depth: 2.09, height: 0.90, color: '#c8b899', model: glb('ikea-malm-bed-160.glb'),  parts: BED_PARTS },
  { type: 'ikea-malm-dresser',  label: 'MALM dresser 6-drawer', category: 'IKEA Bedroom', width: 0.80, depth: 0.48, height: 1.23, color: '#c8b899', model: glb('ikea-malm-dresser.glb'),  parts: [{ key: 'body', label: 'Body' }, { key: 'handles', label: 'Handles' }] },
  { type: 'ikea-hemnes-dresser',label: 'HEMNES dresser 8-drawer',category: 'IKEA Bedroom',width: 1.60, depth: 0.50, height: 0.99, color: '#e0dbd0', model: glb('ikea-hemnes-dresser.glb'),parts: [{ key: 'body', label: 'Body' }, { key: 'handles', label: 'Handles' }] },
  { type: 'ikea-hemnes-daybed', label: 'HEMNES daybed',         category: 'IKEA Bedroom', width: 0.80, depth: 2.05, height: 0.83, color: '#e0dbd0', model: glb('ikea-hemnes-daybed.glb'), parts: BED_PARTS },

  // ── IKEA Storage ──────────────────────────────────────────────────────────
  { type: 'ikea-kallax-2x2', label: 'KALLAX 2×2',       category: 'IKEA Storage', width: 0.77, depth: 0.39, height: 0.77, color: '#f5f4f0', model: glb('ikea-kallax-2x2.glb'), parts: [{ key: 'body', label: 'Body' }] },
  { type: 'ikea-kallax-4x2', label: 'KALLAX 4×2',       category: 'IKEA Storage', width: 1.47, depth: 0.39, height: 0.77, color: '#f5f4f0', model: glb('ikea-kallax-4x2.glb'), parts: [{ key: 'body', label: 'Body' }] },
  { type: 'ikea-kallax-1x4', label: 'KALLAX 1×4 tower', category: 'IKEA Storage', width: 0.39, depth: 0.39, height: 1.47, color: '#f5f4f0', model: glb('ikea-kallax-1x4.glb'), parts: [{ key: 'body', label: 'Body' }] },
  { type: 'ikea-billy',      label: 'BILLY bookcase',   category: 'IKEA Storage', width: 0.80, depth: 0.28, height: 2.02, color: '#c8b899', model: glb('ikea-billy.glb'),      parts: [{ key: 'frame', label: 'Frame' }, { key: 'books', label: 'Books' }] },
  { type: 'ikea-pax-100',    label: 'PAX wardrobe 100', category: 'IKEA Storage', width: 1.00, depth: 0.58, height: 2.01, color: '#f5f4f0', model: glb('ikea-pax-100.glb'),    parts: [{ key: 'body', label: 'Body' }, { key: 'door', label: 'Door' }] },
  { type: 'ikea-alex',       label: 'ALEX drawer unit', category: 'IKEA Storage', width: 0.36, depth: 0.58, height: 0.70, color: '#f5f4f0', model: glb('ikea-alex.glb'),       parts: [{ key: 'body', label: 'Body' }, { key: 'handles', label: 'Handles' }] },

  // ── Decor ─────────────────────────────────────────────────────────────────
  { type: 'rug',           label: 'Rug',           category: 'Decor', width: 2.0,  depth: 1.4,  height: 0.01, color: '#b45309', model: glb('rug.glb'),           parts: [{ key: 'field', label: 'Field' }, { key: 'border', label: 'Border' }] },
  { type: 'lamp',          label: 'Floor lamp',    category: 'Decor', width: 0.4,  depth: 0.4,  height: 1.5,  color: '#facc15', model: glb('lamp.glb'),          parts: [{ key: 'base', label: 'Base' }, { key: 'shade', label: 'Shade' }] },
  { type: 'tv',            label: 'TV',            category: 'Decor', width: 1.2,  depth: 0.15, height: 0.7,  color: '#0f172a', model: glb('tv.glb'),            parts: [{ key: 'frame', label: 'Frame' }, { key: 'screen', label: 'Screen' }] },
  { type: 'plant-large',   label: 'Plant (large)', category: 'Decor', width: 0.5,  depth: 0.5,  height: 1.5,  color: '#166534', model: glb('plant-large.glb'),   parts: [{ key: 'pot', label: 'Pot' }, { key: 'foliage', label: 'Foliage' }] },
  { type: 'plant-small',   label: 'Plant (small)', category: 'Decor', width: 0.25, depth: 0.25, height: 0.40, color: '#166534', model: glb('plant-small.glb'),   parts: [{ key: 'pot', label: 'Pot' }, { key: 'foliage', label: 'Foliage' }] },
  { type: 'fireplace',     label: 'Fireplace',     category: 'Decor', width: 1.2,  depth: 0.30, height: 1.00, color: '#78716c', model: glb('fireplace.glb'),     parts: [{ key: 'surround', label: 'Surround' }, { key: 'firebox', label: 'Firebox' }] },
  { type: 'radiator',      label: 'Radiator',      category: 'Decor', width: 0.80, depth: 0.08, height: 0.60, color: '#e5e7eb', model: glb('radiator.glb'),      wallMounted: true, mountHeight: 0.10, parts: [{ key: 'body', label: 'Body' }] },
  { type: 'picture-frame', label: 'Picture',       category: 'Decor', width: 0.80, depth: 0.04, height: 0.60, color: '#44342a', model: glb('picture-frame.glb'), wallMounted: true, mountHeight: 1.20, parts: [{ key: 'frame', label: 'Frame' }, { key: 'canvas', label: 'Canvas' }] },

  // ── Lighting ──────────────────────────────────────────────────────────────
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

  // ── Architecture ──────────────────────────────────────────────────────────
  {
    type: 'stairs', label: 'Stairs', category: 'Architecture',
    width: 0.9, depth: 3.0, height: 2.7, color: '#8b7355', model: null,
    stairType: true,
  },
]

export const CATEGORIES = [
  'Architecture', 'Seating', 'Tables', 'Bedroom', 'Office', 'Storage',
  'Bathroom', 'Kitchen',
  'IKEA Living', 'IKEA Bedroom', 'IKEA Storage',
  'Decor', 'Lighting',
]

const BY_TYPE = Object.fromEntries(FURNITURE.map((f) => [f.type, f]))

export function getFurnitureSpec(type) {
  return BY_TYPE[type] ?? null
}
