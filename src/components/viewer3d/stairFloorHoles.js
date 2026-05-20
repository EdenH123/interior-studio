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
