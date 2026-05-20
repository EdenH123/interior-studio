// Detects rooms (enclosed regions) from a list of walls.
//
// Approach: treat the wall network as a planar graph and find its faces via
// half-edge traversal. Each undirected wall becomes two directed half-edges;
// at each node, half-edges are sorted by angle, and the "next" half-edge in
// face traversal is the one immediately CW from the incoming twin (i.e., a
// consistent right-hand turn). Tracing yields one face per closed region —
// including the unbounded outer face, which we drop by signed-area sign.
//
// In Konva's screen-y-down coordinate system, this traversal traces inner
// rooms clockwise on screen (positive signed area) and the outer face
// counter-clockwise (negative). We keep faces with positive signed area
// above a minimum threshold so single triangles of dust from float-precision
// quirks don't become "rooms".

import { PIXELS_PER_METER } from './constants'

const NODE_EPSILON = 1000 // round coords to 1/1000 px when keying nodes
const MIN_ROOM_AREA = 25 * 25 // 0.5 m × 0.5 m — smaller than this isn't a room

export function detectRooms(walls) {
  if (!walls || walls.length < 3) return []

  const nodes = new Map() // key -> { x, y, halfEdges: [] }
  const getNode = (x, y) => {
    const k = `${Math.round(x * NODE_EPSILON)},${Math.round(y * NODE_EPSILON)}`
    let n = nodes.get(k)
    if (!n) { n = { x, y, halfEdges: [] }; nodes.set(k, n) }
    return n
  }

  const halfEdges = []
  for (const w of walls) {
    const a = getNode(w.x1, w.y1)
    const b = getNode(w.x2, w.y2)
    if (a === b) continue
    const angleAB = normAngle(Math.atan2(b.y - a.y, b.x - a.x))
    const angleBA = normAngle(angleAB + Math.PI)
    const eAB = { from: a, to: b, angle: angleAB, visited: false }
    const eBA = { from: b, to: a, angle: angleBA, visited: false }
    eAB.twin = eBA
    eBA.twin = eAB
    a.halfEdges.push(eAB)
    b.halfEdges.push(eBA)
    halfEdges.push(eAB, eBA)
  }

  for (const n of nodes.values()) {
    n.halfEdges.sort((p, q) => p.angle - q.angle)
  }

  for (const h of halfEdges) {
    const v = h.to
    const idx = v.halfEdges.indexOf(h.twin)
    // "next" = the outgoing half-edge immediately BEFORE the incoming twin
    // in the angle-sorted list (wrapping). Equivalently: pick the half-edge
    // turning as far right as possible at this node, which is what keeps
    // an inner face on a consistent side at T-junctions. (Picking the
    // next-after-twin gave wrong rotations at 3-way junctions and traced
    // the union of rooms as one outer perimeter.)
    h.next = v.halfEdges[(idx - 1 + v.halfEdges.length) % v.halfEdges.length]
  }

  const faces = []
  for (const start of halfEdges) {
    if (start.visited) continue
    const verts = []
    let h = start
    let safety = 0
    while (!h.visited && safety < halfEdges.length + 1) {
      h.visited = true
      verts.push({ x: h.from.x, y: h.from.y })
      h = h.next
      safety++
    }
    if (verts.length >= 3) faces.push(verts)
  }

  return faces
    .filter((verts) => signedArea(verts) > MIN_ROOM_AREA)
    .map((verts) => ({
      id: fingerprint(verts),
      verts,
      centroid: areaWeightedCentroid(verts),
    }))
}

function normAngle(a) {
  const TAU = Math.PI * 2
  return ((a % TAU) + TAU) % TAU
}

export function polygonAreaM2(verts) {
  return signedArea(verts) / (PIXELS_PER_METER * PIXELS_PER_METER)
}

function signedArea(verts) {
  let s = 0
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i]
    const b = verts[(i + 1) % verts.length]
    s += a.x * b.y - b.x * a.y
  }
  return s / 2
}

// Stable identity for a room across re-detections. Hash the *set* of
// vertex coordinates (sorted lexicographically). In a connected planar
// graph, a face is uniquely determined by its vertex set, so this is
// invariant to which half-edge starts the trace or which direction it goes.
function fingerprint(verts) {
  return verts
    .map((v) => `${Math.round(v.x * NODE_EPSILON)},${Math.round(v.y * NODE_EPSILON)}`)
    .sort()
    .join('|')
}

// Area-weighted centroid — stays inside non-convex polygons like L-shapes
// where the simple vertex average falls outside the polygon.
function areaWeightedCentroid(verts) {
  let cx = 0
  let cy = 0
  let a2 = 0
  for (let i = 0; i < verts.length; i++) {
    const p = verts[i]
    const q = verts[(i + 1) % verts.length]
    const cross = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
    a2 += cross
  }
  const denom = 3 * a2
  return { x: cx / denom, y: cy / denom }
}
