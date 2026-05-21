import * as THREE from 'three'

// Procedural railing geometry for wood, metal, and cable styles.
// All geometry spans y=[0..height] — no centering — consistent with stairs.
// Width = run length, height = railing height, depth = ignored (very thin).
export function buildRailingGeometry(width, height, style) {
  const parts = []

  if (style === 'wood') buildWoodRailing(parts, width, height)
  else if (style === 'metal') buildMetalRailing(parts, width, height)
  else if (style === 'cable') buildCableRailing(parts, width, height)

  return mergeGeos(parts)
}

// ─── Wood ─────────────────────────────────────────────────────────────────────
// Chunky square balusters + wide top handrail.
function buildWoodRailing(parts, W, H) {
  const railH   = 0.05   // handrail height
  const railD   = 0.06   // handrail depth
  const balW    = 0.04   // baluster width/depth
  const count   = Math.max(2, Math.round(W / 0.14))  // one per ~140mm
  const balH    = H - railH

  // Top handrail
  parts.push(box(W, railH, railD, 0, H - railH, 0))

  // Bottom plate
  parts.push(box(W, 0.04, 0.04, 0, 0, 0))

  // Balusters
  for (let i = 0; i <= count; i++) {
    const x = -W/2 + (W / count) * i
    parts.push(box(balW, balH, balW, x, 0, 0))
  }
}

// ─── Metal ────────────────────────────────────────────────────────────────────
// Sleek round-ish posts + slim round handrail.
function buildMetalRailing(parts, W, H) {
  const railH  = 0.04
  const railD  = 0.04
  const postW  = 0.015
  const count  = Math.max(2, Math.round(W / 0.10))
  const postH  = H - railH

  // Handrail
  parts.push(box(W, railH, railD, 0, H - railH, 0))

  // Horizontal mid-rail at ~50% height
  if (H >= 0.7) {
    parts.push(box(W, 0.02, 0.02, 0, H * 0.5, 0))
  }

  // Posts
  for (let i = 0; i <= count; i++) {
    const x = -W/2 + (W / count) * i
    parts.push(box(postW, postH, postW, x, 0, 0))
  }
}

// ─── Cable ────────────────────────────────────────────────────────────────────
// Sturdy end/mid posts + horizontal cables.
function buildCableRailing(parts, W, H) {
  const postW    = 0.05
  const postD    = 0.05
  const railH    = 0.04
  const cableD   = 0.012
  const numCab   = Math.max(3, Math.round((H - 0.15) / 0.18))
  const numPosts = W > 1.8 ? 3 : 2

  // Top handrail
  parts.push(box(W, railH, postD, 0, H - railH, 0))

  // Vertical posts
  for (let i = 0; i < numPosts; i++) {
    const x = -W/2 + (W / (numPosts - 1)) * i
    parts.push(box(postW, H, postD, x, 0, 0))
  }

  // Horizontal cables
  for (let c = 0; c < numCab; c++) {
    const y = 0.10 + c * ((H - 0.15 - railH) / Math.max(1, numCab - 1))
    parts.push(box(W - postW, cableD, cableD, 0, y, 0))
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// BoxGeometry centered at (cx, cy + h/2, cz), sitting on y=cy with height h.
function box(w, h, d, cx, cy, cz) {
  const geo = new THREE.BoxGeometry(w, h, d)
  geo.translate(cx, cy + h / 2, cz)
  return geo
}

function mergeGeos(geos) {
  const positions = [], normals = [], indices = []
  let off = 0
  for (const geo of geos) {
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
