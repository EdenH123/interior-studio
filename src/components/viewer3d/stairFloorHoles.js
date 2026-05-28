// Pure geometry utilities for stair floor holes.
//
// Coordinate systems used here:
//   Konva space  — pixels, x=right, y=down (screen Y-down, CW rotation positive)
//   Shape space  — metres (×KONVA_TO_THREE), same XY orientation as Konva space.
//                  The THREE.Shape for floor meshes lives here; after
//                  mesh.rotation.x = π/2 the shape-x maps to world-x and
//                  shape-y maps to world-z.
//
// Furniture x/y are in Konva pixels; width/depth/height are in metres.

const K2T = 0.02  // 1 Konva pixel = 0.02 Three.js metres

// Returns the four corners of a stair's footprint in shape space (metres).
// Uses the CW-rotation formula for canvas/Konva Y-down coordinates:
//   x' = cx + lx·cos(θ) − ly·sin(θ)
//   y' = cy + lx·sin(θ) + ly·cos(θ)
export function stairHoleCorners(stair) {
  const cx = stair.x * K2T
  const cy = stair.y * K2T
  const hw = stair.width  / 2  // already metres
  const hd = stair.depth  / 2  // already metres
  const θ = stair.rotation * Math.PI / 180
  const cosθ = Math.cos(θ)
  const sinθ = Math.sin(θ)
  return [
    [-hw, -hd],
    [ hw, -hd],
    [ hw,  hd],
    [-hw,  hd],
  ].map(([lx, ly]) => ({
    x: cx + lx * cosθ - ly * sinθ,
    y: cy + lx * sinθ + ly * cosθ,
  }))
}

// Stable string fingerprint for a list of hole corner arrays.
// Used by reconcileRooms to detect when geometry needs to be rebuilt.
export function holesFp(stairHoles) {
  if (!stairHoles?.length) return ''
  return stairHoles
    .map((corners) => corners.map((c) => `${c.x.toFixed(3)},${c.y.toFixed(3)}`).join('|'))
    .sort()
    .join(';')
}

// Ray-casting point-in-polygon test (2D).
function pointInPolygon(px, py, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// Returns Map<roomId, Array<cornerArrays>> for all rooms.
// A room gets a hole for each stair whose center falls inside its polygon.
//
// `rooms`  — [{ id, verts: [{x,y}] }] — verts in Konva pixels.
// `stairs` — furniture items with type='stairs' whose toLevel matches this level.
export function computeStairHolesForRooms(rooms, stairs) {
  const result = new Map()
  for (const room of rooms) {
    const holes = []
    // Convert room verts to shape space for the PIP test.
    const scaledVerts = room.verts.map((v) => ({ x: v.x * K2T, y: v.y * K2T }))
    for (const stair of stairs) {
      const cx = stair.x * K2T
      const cy = stair.y * K2T
      if (pointInPolygon(cx, cy, scaledVerts)) {
        holes.push(stairHoleCorners(stair))
      }
    }
    result.set(room.id, holes)
  }
  return result
}

// Returns Map<roomId, Array<cornerArrays>> for void (open-to-above) regions.
// Each void whose centroid falls inside a room contributes its full outline
// (converted to shape-space metres) as a hole in that room's floor/ceiling.
//
// `rooms` — [{ id, verts:[{x,y}] }] (Konva px). `voids` — [{ verts:[{x,y}] }].
export function computeVoidHolesForRooms(rooms, voids) {
  const result = new Map()
  for (const room of rooms) {
    const holes = []
    const scaledVerts = room.verts.map((v) => ({ x: v.x * K2T, y: v.y * K2T }))
    for (const vd of voids) {
      if (!vd.verts || vd.verts.length < 3) continue
      const n = vd.verts.length
      const cx = (vd.verts.reduce((s, v) => s + v.x, 0) / n) * K2T
      const cy = (vd.verts.reduce((s, v) => s + v.y, 0) / n) * K2T
      if (pointInPolygon(cx, cy, scaledVerts)) {
        holes.push(vd.verts.map((v) => ({ x: v.x * K2T, y: v.y * K2T })))
      }
    }
    result.set(room.id, holes)
  }
  return result
}

// Which long sides of a stair are NOT against a wall — used to skip railings
// on the wall-attached side. Returns a subset of [-1, 1] (local-x sign).
//
// `stair` carries x,y (Konva px), width/depth (m), rotation (deg).
// `walls` are wall segments in Konva px (same active level — caller filters).
// `thresholdPx` is how close a wall must be to the side edge to count as
// "attached" (default 15 px ≈ 0.30 m — wall thickness + a small slack).
const PPM = 50  // PIXELS_PER_METER — match canvas/constants.js
const DEFAULT_SIDE_WALL_THRESHOLD_PX = 15

function pointToSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-6) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  const cx = x1 + t * dx, cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

export function stairOpenSides(stair, walls, thresholdPx = DEFAULT_SIDE_WALL_THRESHOLD_PX) {
  const θ = (stair.rotation * Math.PI) / 180
  const hwPx = (stair.width / 2) * PPM
  const hdPx = (stair.depth / 2) * PPM
  const cosθ = Math.cos(θ), sinθ = Math.sin(θ)
  const open = []
  for (const side of [-1, 1]) {
    // Sample 3 points along this side edge: at -d/2 (top of run), 0 (mid), +d/2 (bottom).
    // The side is "attached" when ALL three are close to some wall — avoids
    // false positives where just one corner brushes a perpendicular wall.
    let attached = true
    for (const ly of [-hdPx, 0, hdPx]) {
      const lx = side * hwPx
      const px = stair.x + lx * cosθ - ly * sinθ
      const py = stair.y + lx * sinθ + ly * cosθ
      let nearest = Infinity
      for (const w of walls) {
        const d = pointToSegDist(px, py, w.x1, w.y1, w.x2, w.y2)
        if (d < nearest) nearest = d
      }
      if (nearest > thresholdPx) { attached = false; break }
    }
    if (!attached) open.push(side)
  }
  return open
}
