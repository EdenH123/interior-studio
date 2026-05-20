import { nanoid } from 'nanoid/non-secure'

export const GROUND_FLOOR_ID = 'L00000'
export const DEFAULT_LEVEL_HEIGHT = 2.7

const DEFAULT_LEVELS = [
  { id: GROUND_FLOOR_ID, name: 'Ground Floor', height: DEFAULT_LEVEL_HEIGHT, order: 0 },
]

// Returns Map<levelId, Y_base_metres> sorted by order.
export function computeLevelOffsets(levels) {
  const sorted = [...levels].sort((a, b) => a.order - b.order)
  const map = new Map()
  let acc = 0
  for (const lv of sorted) { map.set(lv.id, acc); acc += lv.height }
  return map
}

export const createLevelsSlice = (set, get) => ({
  levels: DEFAULT_LEVELS,
  activeLevel: GROUND_FLOOR_ID,
  solo3d: false,       // show only active level in 3D
  xrayCeiling: false,  // make levels above active 30% transparent

  addLevel: () => {
    const id = nanoid(6)
    const cur = get().levels
    const maxOrder = cur.length ? Math.max(...cur.map((l) => l.order)) : -1
    set((s) => ({
      levels: [
        ...s.levels,
        { id, name: `Floor ${maxOrder + 1}`, height: DEFAULT_LEVEL_HEIGHT, order: maxOrder + 1 },
      ],
    }))
    return id
  },

  removeLevel: (id) =>
    set((s) => {
      if (s.levels.length <= 1) return s
      const next = s.levels.filter((l) => l.id !== id)
      const nextActive = s.activeLevel === id
        ? [...next].sort((a, b) => a.order - b.order)[0].id
        : s.activeLevel
      return { levels: next, activeLevel: nextActive }
    }),

  renameLevel: (id, name) =>
    set((s) => ({ levels: s.levels.map((l) => (l.id === id ? { ...l, name } : l)) })),

  setLevelHeight: (id, height) =>
    set((s) => ({
      levels: s.levels.map((l) => (l.id === id ? { ...l, height: Math.max(0.1, height) } : l)),
    })),

  setActiveLevel: (id) => set({ activeLevel: id }),
  setSolo3d: (v) => set({ solo3d: Boolean(v) }),
  setXrayCeiling: (v) => set({ xrayCeiling: Boolean(v) }),
})
