import { nanoid } from 'nanoid/non-secure'
import { getOpeningSpec } from '../../components/canvas/openingsCatalog'
import { wallLengthPx, clampPosition, openingsOverlap } from '../../components/canvas/openingGeometry'
import { PIXELS_PER_METER } from '../../components/canvas/constants'

// Openings live on walls (doors + windows). Each carries:
//   id, type, wallId, position (0–1 along wall), width, height, sillHeight
//
// Width/height/sillHeight default from the catalog and can be edited per
// piece (e.g. a wider double door). Position is normalised — kept stable
// when the wall is resized, but clamped so the opening's footprint stays
// inside the wall.
//
// Placement guard: `addOpening` refuses if the opening wouldn't fit
// (returns null + a reason) or would overlap an existing opening on the
// same wall. Callers (the drop hook) translate the null return into a
// toast message.
export const createOpeningsSlice = (set, get) => ({
  openings: [],

  // `overrides` lets a caller place the opening at a non-catalog width — used
  // by the "Resize to fit" toast action, which retries with a width the wall
  // can actually take. Failures carry a `code` so callers can decide whether
  // to offer that retry ('too-short' / 'overlap').
  addOpening: (type, wallId, positionT, overrides = null) => {
    const spec = getOpeningSpec(type)
    if (!spec) return { ok: false, reason: `Unknown opening type "${type}".` }
    const state = get()
    const wall = state.walls.find((w) => w.id === wallId)
    if (!wall) return { ok: false, reason: 'Opening must be placed on a wall.' }

    const candidate = {
      id: nanoid(6), type, wallId,
      position: positionT,
      width: overrides?.width ?? spec.width, height: spec.height, sillHeight: spec.sillHeight,
      levelId: wall.levelId ?? state.activeLevel ?? null,
      ...(type.startsWith('door') ? { open: false, swingDir: 'left', openSide: 'front' } :
         type === 'window-casement' ? { open: false } : {}),
    }
    const wallLen = wallLengthPx(wall)
    if (candidate.width * PIXELS_PER_METER >= wallLen) {
      return { ok: false, reason: `Wall is too short for a ${spec.label.toLowerCase()}.`, code: 'too-short' }
    }
    const clamped = clampPosition(candidate, wall)
    if (clamped === null) return { ok: false, reason: 'Wall is too short for this opening.', code: 'too-short' }
    candidate.position = clamped

    const collides = state.openings.some(
      (o) => o.wallId === wallId && openingsOverlap(o, candidate, wall),
    )
    if (collides) return { ok: false, reason: 'Opening would overlap another on this wall.', code: 'overlap' }

    set((s) => ({
      openings: [...s.openings, candidate],
      selection: { items: [{ kind: 'opening', id: candidate.id }] },
    }))
    return { ok: true, id: candidate.id }
  },

  // Patch-style update. The `position` field is re-clamped against the
  // parent wall + checked for overlap; rejected updates leave state alone
  // and return false so callers can decide whether to toast.
  updateOpening: (id, patch) => {
    let accepted = true
    set((s) => {
      const idx = s.openings.findIndex((o) => o.id === id)
      if (idx === -1) { accepted = false; return s }
      const current = s.openings[idx]
      const merged = { ...current, ...patch }
      const wall = s.walls.find((w) => w.id === merged.wallId)
      if (wall) {
        if (merged.width * PIXELS_PER_METER >= wallLengthPx(wall)) {
          accepted = false; return s
        }
        const clamped = clampPosition(merged, wall)
        if (clamped === null) { accepted = false; return s }
        merged.position = clamped
        const collides = s.openings.some(
          (o, i) => i !== idx && o.wallId === merged.wallId && openingsOverlap(o, merged, wall),
        )
        if (collides) { accepted = false; return s }
      }
      const openings = s.openings.slice()
      openings[idx] = merged
      return { openings }
    })
    return accepted
  },

  toggleDoorOpen: (id) =>
    set((s) => {
      const idx = s.openings.findIndex((o) => o.id === id && o.type.startsWith('door'))
      if (idx === -1) return s
      const openings = s.openings.slice()
      openings[idx] = { ...openings[idx], open: !openings[idx].open }
      return { openings }
    }),

  toggleWindowOpen: (id) =>
    set((s) => {
      const idx = s.openings.findIndex((o) => o.id === id && o.type === 'window-casement')
      if (idx === -1) return s
      const openings = s.openings.slice()
      openings[idx] = { ...openings[idx], open: !openings[idx].open }
      return { openings }
    }),

  removeOpening: (id) =>
    set((s) => ({
      openings: s.openings.filter((o) => o.id !== id),
      selection: (() => {
        const items = (s.selection?.items ?? []).filter((i) => !(i.kind === 'opening' && i.id === id))
        return items.length ? { items } : null
      })(),
    })),
})
