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
  const halfDepth = (item.depth * PIXELS_PER_METER) / 2

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

    // Snapped centroid: wall face + halfDepth offset outward.
    const snapX = px + side * nx * (halfDepth + WALL_HALF_THICK + 1)
    const snapY = py + side * ny * (halfDepth + WALL_HALF_THICK + 1)

    // Rotation: furniture face flush against wall.
    const wallAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI)
    const rotation = normalizeAngle(wallAngleDeg + (side > 0 ? 90 : -90))

    bestDist = dist
    bestSnap = { x: snapX, y: snapY, rotation }
  }

  return bestSnap
}
