import { PIXELS_PER_METER } from './constants'

// Pure geometry helpers for placing + dragging openings along walls.
// No React, no Konva, no Zustand. Coordinates are canvas pixels.

export function wallLengthPx(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1)
}

// Half-extent of an opening along its wall, in normalised [0,1] units.
function halfExtentNorm(opening, wallLen) {
  if (wallLen <= 0) return 0
  return (opening.width * PIXELS_PER_METER) / 2 / wallLen
}

// Projects a world point onto a wall's infinite line, clamped to the
// segment. Returns the projected point (px) + the parameter t ∈ [0, 1].
export function projectOntoWall(p, wall) {
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return { x: wall.x1, y: wall.y1, t: 0 }
  const tRaw = ((p.x - wall.x1) * dx + (p.y - wall.y1) * dy) / len2
  const t = Math.max(0, Math.min(1, tRaw))
  return { x: wall.x1 + dx * t, y: wall.y1 + dy * t, t }
}

// Given a world point + the wall list, returns the nearest wall snap
// info or null if no wall is within `screenThreshold / scale` pixels.
// Threshold is in world pixels — callers compute it from a screen-px
// budget divided by the current view scale.
export function nearestWallSnap(p, walls, worldThreshold) {
  let best = null
  let bestDist = worldThreshold
  for (const w of walls) {
    const proj = projectOntoWall(p, w)
    const d = Math.hypot(p.x - proj.x, p.y - proj.y)
    if (d < bestDist) {
      best = { wallId: w.id, wall: w, point: { x: proj.x, y: proj.y }, position: proj.t, distance: d }
      bestDist = d
    }
  }
  return best
}

// Clamps an opening's normalised position so the full footprint
// [position - half, position + half] sits inside [0, 1]. If the opening
// is wider than the wall, returns null (caller should refuse the drop).
export function clampPosition(opening, wall) {
  const len = wallLengthPx(wall)
  const half = halfExtentNorm(opening, len)
  if (half >= 0.5) return null
  return Math.max(half, Math.min(1 - half, opening.position))
}

// True when two openings on the same wall would overlap. Uses
// half-extents in normalised units — tolerant of opening pairs whose
// edges just touch.
export function openingsOverlap(a, b, wall) {
  const len = wallLengthPx(wall)
  const ha = halfExtentNorm(a, len)
  const hb = halfExtentNorm(b, len)
  return Math.abs(a.position - b.position) < ha + hb
}

// Sorts a wall's openings by position and returns the wall as a list of
// solid segments interleaved with gap definitions. Used by Wall.jsx to
// render the wall around its openings.
export function wallSegmentsForRendering(wall, openings) {
  const own = openings
    .filter((o) => o.wallId === wall.id)
    .sort((a, b) => a.position - b.position)
  const len = wallLengthPx(wall)
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  const at = (t) => ({ x: wall.x1 + dx * t, y: wall.y1 + dy * t })

  const segments = []
  let cursor = 0
  for (const o of own) {
    const half = halfExtentNorm(o, len)
    const startT = Math.max(0, o.position - half)
    const endT = Math.min(1, o.position + half)
    if (startT > cursor) {
      const a = at(cursor), b = at(startT)
      segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
    cursor = Math.max(cursor, endT)
  }
  if (cursor < 1) {
    const a = at(cursor), b = at(1)
    segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }
  return segments
}

// Given a nearestWallSnap result and the item's depth (metres), compute
// the 2D world center {x, y} and Konva rotation (degrees CW) for a
// wall-mounted item so it sits flush against the wall on the side the
// drop point is on. `worldPoint` is the raw cursor position.
export function wallMountedPlacement(snap, depthMetres, worldPoint) {
  const wall = snap.wall
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  // Left-hand normal of the wall direction.
  const nx = -uy, ny = ux
  // Pick the normal side that the drop point sits on.
  const dot = (worldPoint.x - snap.point.x) * nx + (worldPoint.y - snap.point.y) * ny
  const normX = dot >= 0 ? nx : -nx
  const normY = dot >= 0 ? ny : -ny
  // Center = projection + normal × (depth/2 in pixels).
  const halfDepthPx = depthMetres * PIXELS_PER_METER / 2
  const x = snap.point.x + normX * halfDepthPx
  const y = snap.point.y + normY * halfDepthPx
  // Rotation: Konva CW degrees. Formula maps normal direction to the angle
  // where the item's local −Y axis (its "front") faces away from the wall.
  //   norm (0,−1) → 0°, (1,0) → 90°, (0,1) → 180°, (−1,0) → 270°
  const rotation = ((Math.atan2(normX, -normY) * 180 / Math.PI) + 360) % 360
  return { x, y, rotation }
}

// World-space placement info for one opening on its wall — used by 2D
// rendering and by drag-along-wall logic.
export function openingPlacement(opening, wall) {
  const len = wallLengthPx(wall)
  const ux = (wall.x2 - wall.x1) / (len || 1)
  const uy = (wall.y2 - wall.y1) / (len || 1)
  const cx = wall.x1 + (wall.x2 - wall.x1) * opening.position
  const cy = wall.y1 + (wall.y2 - wall.y1) * opening.position
  return {
    centerX: cx, centerY: cy,
    ux, uy, // unit vector along the wall
    nx: -uy, ny: ux, // unit normal (left-hand)
    widthPx: opening.width * PIXELS_PER_METER,
    angleRad: Math.atan2(uy, ux),
  }
}
