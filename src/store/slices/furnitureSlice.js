import { nanoid } from 'nanoid/non-secure'
import { getFurnitureSpec } from '../../components/canvas/furnitureCatalog'

// Furniture is fully self-contained per piece — width/depth/height/color/
// model are snapshotted from the catalog spec at add-time so catalog edits
// don't retroactively reshape existing pieces. Cross-slice writes:
//   • addFurniture auto-selects the new piece
//   • removeFurniture clears the selection if it matched
export const createFurnitureSlice = (set) => ({
  furniture: [],
  addFurniture: (type, x, y) => {
    const spec = getFurnitureSpec(type)
    if (!spec) return null
    const id = nanoid(6)
    // Snapshot light-specific fields so changes to the catalog don't mutate
    // already-placed items. Non-lighting types leave these fields undefined.
    const lightFields = spec.lightType != null ? {
      lightType: spec.lightType,
      intensity: spec.intensity,
      colorTemp: spec.colorTemp,
      distance: spec.distance,
      castShadow: spec.castShadow,
      on: spec.on,
    } : {}
    set((s) => {
      const activeLevel = s.activeLevel ?? null
      // Stairs connect the active level to the one directly above it.
      let stairFields = {}
      if (spec.stairType) {
        const sorted = [...(s.levels ?? [])].sort((a, b) => a.order - b.order)
        const idx = sorted.findIndex((l) => l.id === activeLevel)
        const nextLevel = idx >= 0 && idx + 1 < sorted.length ? sorted[idx + 1] : null
        stairFields = { fromLevel: activeLevel, toLevel: nextLevel?.id ?? null }
      }
      return {
        furniture: [
          ...s.furniture,
          {
            id, type, x, y, rotation: 0,
            width: spec.width, depth: spec.depth, height: spec.height,
            color: spec.color,
            model: spec.model ?? null,
            levelId: activeLevel,
            ...lightFields,
            ...stairFields,
          },
        ],
        selection: { items: [{ kind: 'furniture', id }] },
      }
    })
    return id
  },
  updateFurniture: (id, patch) =>
    set((s) => ({ furniture: s.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
  rotateFurniture: (id, deltaDeg) =>
    set((s) => ({
      furniture: s.furniture.map((f) =>
        f.id === id ? { ...f, rotation: (f.rotation + deltaDeg + 360) % 360 } : f,
      ),
    })),
  removeFurniture: (id) =>
    set((s) => ({
      furniture: s.furniture.filter((f) => f.id !== id),
      selection: (() => {
        const items = (s.selection?.items ?? []).filter((i) => !(i.kind === 'furniture' && i.id === id))
        return items.length ? { items } : null
      })(),
    })),
})
