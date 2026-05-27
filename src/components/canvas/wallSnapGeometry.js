// Snap furniture flush against the nearest wall face within threshold.
// All coordinates are in Konva world pixels.
//
// Returns { x, y, rotation } for the snapped centroid, or null if no wall
// is close enough.
//
// How it works:
//   1. For each wall, project the item centroid onto the infinite wall line.
//   2. Clamp the projection to the wall segment.
//   3. Compute the distance from item centroid to the clamped point.
//   4. If within threshold, pick the interior side: sign of
//      cross(wallDir, centroid - wallPoint) tells us which side.
//   5. The snapped centroid is at wallPoint + normal * (halfDepth + WALL_HALF_THICK).
//   6. Rotation = wall angle so the furniture face is flush.

import { PIXELS_PER_METER, WALL_THICKNESS } from './constants'

const WALL_HALF_THICK = WALL_THICKNESS / 2

// Wraps an angle in degrees to the range [0, 360).
export function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360
}

// Snap furniture flush against the nearest wall face within threshold.
//
// item    : { x, y, width, depth, rotation?, wallMounted? }
// walls   : array of { id, x1, y1, x2, y2 }
// scale   : current viewport scale (view.scale) for threshold conversion
// thresholdScreen : snap distance in screen pixels (default 60)
//
// Returns { x, y, rotation } or null.
export function findWallSnap(item, walls, scale, thresholdScreen = 60) {
  if (!walls || walls.length === 0) return null

  const thresholdWorld = thresholdScreen / scale
  const cx = item.x
  const cy = item.y
  const hw = (item.width * PIXELS_PER_METER) / 2
  const hd = (item.depth * PIXELS_PER_METER) / 2
  // Use current item rotation so the correct face snaps flush — don't force rotation.
  const rot = ((item.rotation ?? 0) * Math.PI) / 180
  const cosR = Math.cos(rot)
  const sinR = Math.sin(rot)

  let bestDist = thresholdWorld
  let bestSnap = null

  for (const w of walls) {
    const dx = w.x2 - w.x1
    const dy = w.y2 - w.y1
    const len = Math.hypot(dx, dy)
    if (len < 1) continue

    const ux = dx / len
    const uy = dy / len

    // Project centroid onto the wall line.
    const t = Math.max(0, Math.min(len, (cx - w.x1) * ux + (cy - w.y1) * uy))

    // Closest point on wall segment.
    const px = w.x1 + t * ux
    const py = w.y1 + t * uy

    const dist = Math.hypot(cx - px, cy - py)
    if (dist > bestDist) continue

    // Wall normal (left-hand perpendicular in screen coords).
    const nx = -uy
    const ny = ux

    // Determine which side of the wall the item is on.
    const dot = (cx - px) * nx + (cy - py) * ny
    const side = dot === 0 ? 1 : Math.sign(dot)

    // Half-extent of the rotated rectangle projected onto the wall normal.
    // This is the support function of the OBB: picks the correct face regardless
    // of which way the item is currently rotated.
    const halfExtent = hw * Math.abs(cosR * nx + sinR * ny)
                     + hd * Math.abs(-sinR * nx + cosR * ny)

    const snapX = px + side * nx * (halfExtent + WALL_HALF_THICK + 1)
    const snapY = py + side * ny * (halfExtent + WALL_HALF_THICK + 1)

    bestDist = dist
    // rotation: null → preserve item's current rotation, only reposition.
    bestSnap = { x: snapX, y: snapY, rotation: null }
  }

  return bestSnap
}

// Placement for a railing sitting ON TOP of a wall: centered on the wall
// centerline at normalised position `t`, aligned ALONG the wall, with its base
// at the wall's height. (Distinct from findWallSnap, which puts items flush
// against a wall face, perpendicular.)
export function railingWallPlacement(wall, t = 0.5) {
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  return {
    x: wall.x1 + dx * t,
    y: wall.y1 + dy * t,
    rotation: normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI),
    mountHeight: wall.height ?? 2.4,
  }
}

// Resolves a wall-bound railing's live transform from its mounted wall, so it
// follows the wall when moved / resized / re-heighted. Returns the item
// unchanged when it isn't wall-bound (or its wall is gone). `wallMounted: true`
// is injected so the 3D reconciler lifts it to `mountHeight`.
export function resolveRailingMount(item, walls) {
  if (!item?.mountWallId) return item
  const wall = walls.find((w) => w.id === item.mountWallId)
  if (!wall) return item
  const p = railingWallPlacement(wall, item.position ?? 0.5)
  return { ...item, x: p.x, y: p.y, rotation: p.rotation, wallMounted: true, mountHeight: p.mountHeight }
}
