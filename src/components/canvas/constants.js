export const PIXELS_PER_METER = 50
export const GRID_SIZE = 50
export const WORLD_HALF = 5000
export const WALL_THICKNESS = 10
export const MIN_SCALE = 0.2
export const MAX_SCALE = 5
export const ZOOM_STEP = 1.1

// Snap radius in *screen* pixels — divide by view.scale to compare against
// world distances. Keeps the snap "feel" constant as the user zooms.
export const SNAP_RADIUS_SCREEN = 14

export function snapTo90(start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) return end
  const angle = Math.atan2(dy, dx)
  const snapped = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2)
  const dist = Math.hypot(dx, dy)
  return {
    x: start.x + Math.cos(snapped) * dist,
    y: start.y + Math.sin(snapped) * dist,
  }
}

export function formatMeters(px) {
  return `${(px / PIXELS_PER_METER).toFixed(2)} m`
}

// Finds the nearest wall endpoint or midpoint within `worldThreshold` of
// `cursor`. Returns { x, y, kind } where kind is 'endpoint' or 'midpoint',
// or null if nothing's in range. Endpoints win ties over midpoints.
export function findNearestSnapPoint(cursor, walls, worldThreshold) {
  let best = null
  let bestDist = worldThreshold
  for (const w of walls) {
    const points = [
      { x: w.x1, y: w.y1, kind: 'endpoint' },
      { x: w.x2, y: w.y2, kind: 'endpoint' },
      { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2, kind: 'midpoint' },
    ]
    for (const p of points) {
      const d = Math.hypot(p.x - cursor.x, p.y - cursor.y)
      if (d < bestDist) { best = p; bestDist = d }
    }
  }
  return best
}
