// Ceiling surface materials — a concise paint-focused list.
// Shape matches wall/floor materials: { id, label, color, category }.

export const CEILING_MATERIALS = [
  { id: 'ceiling-white',      label: 'Painted White',    color: '#F8F9FA', category: 'Paint' },
  { id: 'ceiling-off-white',  label: 'Off White',        color: '#EDE8DE', category: 'Paint' },
  { id: 'ceiling-cream',      label: 'Cream',            color: '#E8DFC5', category: 'Paint' },
  { id: 'ceiling-light-gray', label: 'Light Gray',       color: '#C8CBD0', category: 'Paint' },
  { id: 'ceiling-sky',        label: 'Sky Blue',         color: '#BFD7ED', category: 'Paint' },
  { id: 'ceiling-concrete',   label: 'Exposed Concrete', color: '#8A8E94', category: 'Other' },
  { id: 'ceiling-wood',       label: 'Wood Beam',        color: '#A87852', category: 'Other' },
]

export const DEFAULT_CEILING_MATERIAL_ID = 'ceiling-white'
export const DEFAULT_CEILING_COLOR = '#F0F0EE'

const BY_ID = Object.fromEntries(CEILING_MATERIALS.map((m) => [m.id, m]))

export function getCeilingMaterial(id) {
  return BY_ID[id] ?? null
}

export function resolveCeilingMaterialId(id) {
  return id ?? null
}
