import * as THREE from 'three'

// ─── Stair railing (slope-following) ─────────────────────────────────────────
// Handrail follows the stair angle; balusters are vertical and step up with the
// treads. All geometry spans y=[0..stairHeight], same origin as stairsGeometry.
//
// W = stair width, D = stair depth, H = stair height, N = step count, style =
// 'wood' | 'metal' | 'cable' | 'glass'. `sides` selects which sides of the
// staircase get railings — pass [-1] or [1] to skip the side that's against a
// wall (default both sides).
export function buildStairRailingGeometry(W, D, H, N, style, sides = [-1, 1]) {
  const parts = []
  if      (style === 'wood')  buildStairWoodRailing(parts, W, D, H, N, sides)
  else if (style === 'metal') buildStairMetalRailing(parts, W, D, H, N, sides)
  else if (style === 'cable') buildStairCableRailing(parts, W, D, H, N, sides)
  else if (style === 'glass') buildStairGlassRailing(parts, W, D, H, N, sides)
  return mergeGeos(parts)
}

// Spiral stair railing — vertical outer posts + straight handrail segments
// approximating the helix.
export function buildSpiralRailingGeometry(W, D, H, N, style) {
  const radius = Math.min(W, D) / 2
  const rOuter = radius
  const stepH  = H / N
  const stepAng = (2 * Math.PI) / N
  const RAILING_H = 0.90
  const POST_W = style === 'wood' ? 0.05 : 0.018
  const RAIL_T = 0.04
  const RAIL_W = style === 'wood' ? 0.06 : 0.035
  const parts  = []

  // Outer posts (one per step)
  for (let i = 0; i <= N; i++) {
    const ang = i * stepAng
    const px  = rOuter * Math.cos(ang)
    const pz  = rOuter * Math.sin(ang)
    const py  = i * stepH
    parts.push(box(POST_W, RAILING_H, POST_W, px, py, pz))
  }

  // Handrail segments connecting post tops
  for (let i = 0; i < N; i++) {
    const a1 = i * stepAng
    const a2 = (i + 1) * stepAng
    const p1 = new THREE.Vector3(rOuter * Math.cos(a1), i * stepH + RAILING_H,       rOuter * Math.sin(a1))
    const p2 = new THREE.Vector3(rOuter * Math.cos(a2), (i + 1) * stepH + RAILING_H, rOuter * Math.sin(a2))
    parts.push(boxBetween(p1, p2, RAIL_W, RAIL_T))
  }

  return mergeGeos(parts)
}

// ─── Stair railing styles ─────────────────────────────────────────────────────

// Wood: chunky square balusters (one per step) + wide diagonal handrail + newels.
function buildStairWoodRailing(parts, W, D, H, N, sides) {
  const RAILING_H = 0.90
  const RAIL_T    = 0.06   // handrail cross-section height (perpendicular to slope)
  const RAIL_W    = 0.07   // handrail cross-section width in X
  const BAL_W     = 0.045  // baluster cross-section
  const NEWEL_W   = 0.10   // newel post cross-section
  const NEWEL_EX  = 0.06   // newel extends above handrail top
  const slopeLen  = Math.sqrt(D * D + H * H)
  const theta     = Math.atan2(H, D)
  const stepD     = D / N
  const stepH     = H / N
  const balH      = RAILING_H - RAIL_T  // baluster height from step to handrail bottom

  for (const side of sides) {
    const sx = side * (W / 2 - RAIL_W / 2 - 0.01)

    // Diagonal handrail slab
    parts.push(slopeBox(RAIL_W, RAIL_T, slopeLen, theta, sx, H / 2 + RAILING_H - RAIL_T / 2))

    // Newel posts (slightly taller than handrail, at stair start and end)
    parts.push(box(NEWEL_W, RAILING_H + NEWEL_EX, NEWEL_W, sx, 0, -D / 2))
    parts.push(box(NEWEL_W, RAILING_H + NEWEL_EX, NEWEL_W, sx, H, D / 2))

    // Vertical balusters at each step nosing (skip first/last — covered by newels)
    for (let i = 1; i < N; i++) {
      const bz = -D / 2 + i * stepD
      const by = i * stepH
      parts.push(box(BAL_W, balH, BAL_W, sx, by, bz))
    }
  }
}

// Metal: thin posts every step + slim diagonal handrail + diagonal mid-rail.
function buildStairMetalRailing(parts, W, D, H, N, sides) {
  const RAILING_H = 0.90
  const RAIL_T    = 0.035
  const RAIL_W    = 0.04
  const POST_W    = 0.015
  const NEWEL_W   = 0.04
  const NEWEL_EX  = 0.05
  const slopeLen  = Math.sqrt(D * D + H * H)
  const theta     = Math.atan2(H, D)
  const stepD     = D / N
  const stepH     = H / N
  const postH     = RAILING_H - RAIL_T

  for (const side of sides) {
    const sx = side * (W / 2 - RAIL_W / 2 - 0.01)

    // Main handrail
    parts.push(slopeBox(RAIL_W, RAIL_T, slopeLen, theta, sx, H / 2 + RAILING_H - RAIL_T / 2))

    // Diagonal mid-rail at ~50% railing height
    parts.push(slopeBox(RAIL_W * 0.7, RAIL_T * 0.8, slopeLen, theta, sx, H / 2 + RAILING_H * 0.5 - RAIL_T * 0.4))

    // Newel posts (thicker)
    parts.push(box(NEWEL_W * 2.5, RAILING_H + NEWEL_EX, NEWEL_W * 2.5, sx, 0, -D / 2))
    parts.push(box(NEWEL_W * 2.5, RAILING_H + NEWEL_EX, NEWEL_W * 2.5, sx, H, D / 2))

    // Thin posts at each step nosing
    for (let i = 1; i < N; i++) {
      const bz = -D / 2 + i * stepD
      const by = i * stepH
      parts.push(box(POST_W, postH, POST_W, sx, by, bz))
    }
  }
}

// Cable: stout end/mid posts + diagonal cables parallel to handrail.
function buildStairCableRailing(parts, W, D, H, N, sides) {
  const RAILING_H  = 0.90
  const RAIL_T     = 0.035
  const RAIL_W     = 0.04
  const POST_W     = 0.05
  const CABLE_D    = 0.014
  const NUM_CABLES = 5
  const NEWEL_EX   = 0.05
  const slopeLen   = Math.sqrt(D * D + H * H)
  const theta      = Math.atan2(H, D)
  const numPosts   = N > 8 ? 3 : 2

  for (const side of sides) {
    const sx = side * (W / 2 - RAIL_W / 2 - 0.01)

    // Main handrail cap
    parts.push(slopeBox(RAIL_W, RAIL_T, slopeLen, theta, sx, H / 2 + RAILING_H - RAIL_T / 2))

    // Vertical posts (start, end, and optional mid)
    for (let p = 0; p < numPosts; p++) {
      const t  = p / (numPosts - 1)
      const pz = -D / 2 + t * D
      const py = t * H
      parts.push(box(POST_W, RAILING_H + NEWEL_EX, POST_W, sx, py, pz))
    }

    // Diagonal cables (parallel to handrail, evenly spaced vertically)
    for (let c = 0; c < NUM_CABLES; c++) {
      const frac       = (c + 1) / (NUM_CABLES + 1)
      const cableCenterY = H / 2 + frac * (RAILING_H - RAIL_T)
      parts.push(slopeBox(CABLE_D, CABLE_D, slopeLen, theta, sx, cableCenterY))
    }
  }
}

// Glass: continuous glass panels per step (vertical) + diagonal metal cap.
function buildStairGlassRailing(parts, W, D, H, N, sides) {
  const RAILING_H = 0.90
  const CAP_T     = 0.04   // metal handrail cap
  const CAP_W     = 0.05
  const GLASS_T   = 0.014
  const GLASS_GAP = 0.004  // small gap between panels
  const slopeLen  = Math.sqrt(D * D + H * H)
  const theta     = Math.atan2(H, D)
  const stepD     = D / N
  const stepH     = H / N
  const panelH    = RAILING_H - CAP_T

  for (const side of sides) {
    const sx = side * (W / 2 - GLASS_T / 2 - 0.02)

    // Diagonal metal handrail cap
    parts.push(slopeBox(CAP_W, CAP_T, slopeLen, theta, sx, H / 2 + RAILING_H - CAP_T / 2))

    // Vertical glass panels — one per step, rising from tread to cap bottom
    const panelD = stepD - GLASS_GAP * 2
    for (let i = 0; i < N; i++) {
      const pz = -D / 2 + i * stepD + stepD / 2  // panel centered at step midpoint
      const py = i * stepH
      parts.push(box(GLASS_T, panelH, panelD, sx, py, pz))
    }
  }
}

// ─── Standalone horizontal railing (existing catalog items) ──────────────────
// Width = run length, height = railing height, depth = ignored.
export function buildRailingGeometry(width, height, style) {
  const parts = []
  if      (style === 'wood')  buildWoodRailing(parts, width, height)
  else if (style === 'metal') buildMetalRailing(parts, width, height)
  else if (style === 'cable') buildCableRailing(parts, width, height)
  return mergeGeos(parts)
}

function buildWoodRailing(parts, W, H) {
  const railH  = 0.05
  const railD  = 0.06
  const balW   = 0.04
  const count  = Math.max(2, Math.round(W / 0.14))
  const balH   = H - railH
  parts.push(box(W, railH, railD, 0, H - railH, 0))
  parts.push(box(W, 0.04, 0.04, 0, 0, 0))
  for (let i = 0; i <= count; i++) {
    parts.push(box(balW, balH, balW, -W / 2 + (W / count) * i, 0, 0))
  }
}

function buildMetalRailing(parts, W, H) {
  const railH  = 0.04
  const railD  = 0.04
  const postW  = 0.015
  const count  = Math.max(2, Math.round(W / 0.10))
  const postH  = H - railH
  parts.push(box(W, railH, railD, 0, H - railH, 0))
  if (H >= 0.7) parts.push(box(W, 0.02, 0.02, 0, H * 0.5, 0))
  for (let i = 0; i <= count; i++) {
    parts.push(box(postW, postH, postW, -W / 2 + (W / count) * i, 0, 0))
  }
}

function buildCableRailing(parts, W, H) {
  const postW    = 0.05
  const postD    = 0.05
  const railH    = 0.04
  const cableD   = 0.012
  const numCab   = Math.max(3, Math.round((H - 0.15) / 0.18))
  const numPosts = W > 1.8 ? 3 : 2
  parts.push(box(W, railH, postD, 0, H - railH, 0))
  for (let i = 0; i < numPosts; i++) {
    parts.push(box(postW, H, postD, -W / 2 + (W / (numPosts - 1)) * i, 0, 0))
  }
  for (let c = 0; c < numCab; c++) {
    const y = 0.10 + c * ((H - 0.15 - railH) / Math.max(1, numCab - 1))
    parts.push(box(W - postW, cableD, cableD, 0, y, 0))
  }
}

// ─── geometry helpers ─────────────────────────────────────────────────────────

// Box with bottom-center at (cx, cy, cz).
function box(w, h, d, cx, cy, cz) {
  const geo = new THREE.BoxGeometry(w, h, d)
  geo.translate(cx, cy + h / 2, cz)
  return geo
}

// Diagonal box: rotated around X so it follows the stair slope.
// Stair steps rise from z=-D/2 (y=0) to z=+D/2 (y=H), so positive-Z must
// map to higher-Y. RotationX(-theta) achieves this: a point at +Z rotates
// to +Y*sin(theta), matching the stair ascent direction.
// centerY is the Y coordinate of the box centre at the stair mid-run (Z=0).
function slopeBox(w, h, len, theta, cx, centerY) {
  const geo = new THREE.BoxGeometry(w, h, len)
  geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-theta))
  geo.translate(cx, centerY, 0)
  return geo
}

// Box connecting two 3D points (for spiral handrail segments).
function boxBetween(p1, p2, w, h) {
  const dir = new THREE.Vector3().subVectors(p2, p1)
  const len = dir.length()
  if (len < 0.001) return new THREE.BufferGeometry()
  const geo = new THREE.BoxGeometry(w, h, len)
  const from = new THREE.Vector3(0, 0, 1)
  const to   = dir.clone().normalize()
  // Guard against anti-parallel vectors
  if (from.dot(to) < -0.9999) {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI))
  } else {
    const quat = new THREE.Quaternion().setFromUnitVectors(from, to)
    geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quat))
  }
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
  geo.translate(mid.x, mid.y, mid.z)
  return geo
}

function mergeGeos(geos) {
  const positions = [], normals = [], indices = []
  let off = 0
  for (const geo of geos) {
    if (!geo || geo.attributes?.position?.count === 0) continue
    geo.computeVertexNormals()
    const pos  = geo.getAttribute('position')
    const norm = geo.getAttribute('normal')
    const idx  = geo.getIndex()
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (norm) normals.push(norm.getX(i), norm.getY(i), norm.getZ(i))
    }
    if (idx) for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + off)
    else     for (let i = 0; i < pos.count; i++) indices.push(i + off)
    off += pos.count
    geo.dispose()
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  if (normals.length) merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  merged.setIndex(indices)
  return merged
}
