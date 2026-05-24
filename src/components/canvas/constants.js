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

// Snaps the wall endpoint to the nearest 45° multiple from `start`.
// Covers 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°.
export function snapTo45(start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) return end
  const angle = Math.atan2(dy, dx)
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
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

// When drawing a wall from `drawStart` along the direction of `dirPoint`,
// snaps the wall's length to match the nearest parallel existing wall whose
// length is within `threshold` world units of the current cursor distance.
// Returns `dirPoint` unchanged if no match is found.
// Used as a closing-rectangle heuristic: the 4th wall snaps to the 2nd wall's length.
export function snapParallelWallLength(drawStart, dirPoint, walls, threshold) {
  const dx = dirPoint.x - drawStart.x
  const dy = dirPoint.y - drawStart.y
  const currentLen = Math.hypot(dx, dy)
  if (currentLen < 1) return dirPoint
  const ux = dx / currentLen
  const uy = dy / currentLen
  let bestLen = null
  let bestDelta = threshold
  for (const w of walls) {
    const wx = w.x2 - w.x1
    const wy = w.y2 - w.y1
    const wLen = Math.hypot(wx, wy)
    if (wLen < 1) continue
    const wux = wx / wLen
    const wuy = wy / wLen
    if (Math.abs(ux * wux + uy * wuy) < 0.99) continue   // not parallel
    const delta = Math.abs(currentLen - wLen)
    if (delta < bestDelta) { bestDelta = delta; bestLen = wLen }
  }
  if (bestLen === null) return dirPoint
  return { x: drawStart.x + ux * bestLen, y: drawStart.y + uy * bestLen }
}
