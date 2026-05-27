import { GROUND_FLOOR_ID, DEFAULT_LEVEL_HEIGHT } from './slices/levelsSlice'

// Single source of truth for turning a loosely-shaped project payload into
// the canonical project-content state. Used by both `loadProject` (file
// import) and the persist `migrate` so the level-assignment rules can't drift
// between the two paths.
//
// Rules:
//   - Ensure a levels array exists; default to a single ground floor.
//   - Assign legacy items (no levelId) to the first level by order.
//   - Coerce roomMeta / underlay to safe shapes.
export function normalizeProjectData(data) {
  const d = data ?? {}
  const levels = Array.isArray(d.levels) && d.levels.length > 0
    ? d.levels
    : [{ id: GROUND_FLOOR_ID, name: 'Ground Floor', height: DEFAULT_LEVEL_HEIGHT, order: 0 }]
  const firstLevelId = [...levels].sort((a, b) => a.order - b.order)[0].id
  const activeLevel = typeof d.activeLevel === 'string' ? d.activeLevel : firstLevelId
  const withLevel = (arr) =>
    (Array.isArray(arr) ? arr : []).map((item) =>
      item.levelId ? item : { ...item, levelId: firstLevelId },
    )
  return {
    walls: withLevel(d.walls),
    furniture: withLevel(d.furniture),
    openings: withLevel(d.openings),
    areas: withLevel(d.areas),
    roomMeta: d.roomMeta && typeof d.roomMeta === 'object' ? d.roomMeta : {},
    underlay: d.underlay && typeof d.underlay === 'object' ? d.underlay : null,
    levels,
    activeLevel,
  }
}

// Persist-middleware migration. Written as a version chain so future schema
// bumps add their own `if (version < N)` step. Preserves every persisted key
// not touched by a step (Zustand's default merge then fills any slice added
// since this version with its current default).
export function migratePersistedState(state, version) {
  let s = state
  if (version < 2) {
    // v1 had no levels and no per-item levelId — seed the ground floor and
    // backfill legacy items onto it.
    const n = normalizeProjectData(s)
    s = { ...s, walls: n.walls, furniture: n.furniture, openings: n.openings, levels: n.levels, activeLevel: n.activeLevel }
  }
  return s
}
