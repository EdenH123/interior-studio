#!/usr/bin/env node
// scripts/generate-bathroom-kitchen-glbs.mjs
// Generates procedural GLB models for bathroom (8) and kitchen (10) fixtures.
//
// Conventions (same as generate-furniture-glbs.mjs):
//   X = [-W/2, W/2]   Y = [0, H]   Z = [-D/2, D/2]
//   -Z is back (wall-side); origin at floor/mount bottom-centre.
//
// Run:  node scripts/generate-bathroom-kitchen-glbs.mjs

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/assets/furniture')
mkdirSync(OUT, { recursive: true })

// ─── primitive helpers (copied from generate-furniture-glbs.mjs) ──────────────

function box(x1, y1, z1, x2, y2, z2) {
  const p = []
  const n = []
  p.push(x2,y1,z1, x2,y2,z1, x2,y2,z2, x2,y1,z2); n.push(1,0,0, 1,0,0, 1,0,0, 1,0,0)
  p.push(x1,y1,z2, x1,y2,z2, x1,y2,z1, x1,y1,z1); n.push(-1,0,0, -1,0,0, -1,0,0, -1,0,0)
  p.push(x1,y2,z2, x2,y2,z2, x2,y2,z1, x1,y2,z1); n.push(0,1,0, 0,1,0, 0,1,0, 0,1,0)
  p.push(x1,y1,z1, x2,y1,z1, x2,y1,z2, x1,y1,z2); n.push(0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0)
  p.push(x2,y1,z2, x2,y2,z2, x1,y2,z2, x1,y1,z2); n.push(0,0,1, 0,0,1, 0,0,1, 0,0,1)
  p.push(x1,y1,z1, x1,y2,z1, x2,y2,z1, x2,y1,z1); n.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1)
  const idx = []
  for (let f = 0; f < 6; f++) {
    const b = f * 4
    idx.push(b, b+1, b+2, b, b+2, b+3)
  }
  return { positions: p, normals: n, indices: idx }
}

// Upright cylinder (along Y). cx, cz = center X/Z.
function cyl(cx, cz, y1, y2, r, segs = 8, smooth = true) {
  const p = [], n = [], idx = []
  const step = (2 * Math.PI) / segs
  const cos = Array.from({ length: segs + 1 }, (_, i) => Math.cos(i * step))
  const sin = Array.from({ length: segs + 1 }, (_, i) => Math.sin(i * step))

  for (let i = 0; i < segs; i++) {
    const midA = (i + 0.5) * step
    const nx = smooth ? cos[i] : Math.cos(midA)
    const nz = smooth ? sin[i] : Math.sin(midA)
    const nx1 = smooth ? cos[i + 1] : Math.cos(midA)
    const nz1 = smooth ? sin[i + 1] : Math.sin(midA)
    const b = p.length / 3
    p.push(cx + r*cos[i],  y1, cz + r*sin[i])
    p.push(cx + r*cos[i+1],y1, cz + r*sin[i+1])
    p.push(cx + r*cos[i+1],y2, cz + r*sin[i+1])
    p.push(cx + r*cos[i],  y2, cz + r*sin[i])
    n.push(nx, 0, nz,  nx1, 0, nz1,  nx1, 0, nz1,  nx, 0, nz)
    idx.push(b, b+1, b+2, b, b+2, b+3)
  }

  const bc = p.length / 3
  p.push(cx, y1, cz); n.push(0, -1, 0)
  for (let i = 0; i < segs; i++) { p.push(cx + r*cos[i], y1, cz + r*sin[i]); n.push(0, -1, 0) }
  for (let i = 0; i < segs; i++) { idx.push(bc, bc + 1 + ((i + 1) % segs), bc + 1 + i) }

  const tc = p.length / 3
  p.push(cx, y2, cz); n.push(0, 1, 0)
  for (let i = 0; i < segs; i++) { p.push(cx + r*cos[i], y2, cz + r*sin[i]); n.push(0, 1, 0) }
  for (let i = 0; i < segs; i++) { idx.push(tc, tc + 1 + i, tc + 1 + ((i + 1) % segs)) }

  return { positions: p, normals: n, indices: idx }
}

function merge(parts) {
  const positions = [], normals = [], indices = []
  let offset = 0
  for (const part of parts) {
    positions.push(...part.positions)
    normals.push(...part.normals)
    for (const i of part.indices) indices.push(i + offset)
    offset += part.positions.length / 3
  }
  return { positions, normals, indices }
}

function cushion(x1, y1, z1, x2, y2, z2, bulge = 0.04, nX = 6, nZ = 4) {
  const pos = [], nor = [], idx = []
  const w = x2 - x1, d = z2 - z1
  const stride = nX + 1
  const verts = []
  for (let iz = 0; iz <= nZ; iz++) {
    for (let ix = 0; ix <= nX; ix++) {
      const u = ix / nX, v = iz / nZ
      const b    = bulge * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
      const dfdx = bulge * (Math.PI / w) * Math.cos(Math.PI * u) * Math.sin(Math.PI * v)
      const dfdz = bulge * (Math.PI / d) * Math.sin(Math.PI * u) * Math.cos(Math.PI * v)
      const ilen = 1 / Math.sqrt(dfdx * dfdx + 1 + dfdz * dfdz)
      verts.push(x1 + u * w, y2 + b, z1 + v * d, -dfdx * ilen, ilen, -dfdz * ilen)
    }
  }
  const V = (i) => verts.slice(i * 6, i * 6 + 6)
  for (let iz = 0; iz < nZ; iz++) {
    for (let ix = 0; ix < nX; ix++) {
      const i00 = iz * stride + ix, i01 = i00 + 1
      const i10 = (iz + 1) * stride + ix, i11 = i10 + 1
      const b = pos.length / 3
      for (const i of [i00, i01, i11, i10]) {
        const v = V(i); pos.push(v[0], v[1], v[2]); nor.push(v[3], v[4], v[5])
      }
      idx.push(b, b+1, b+2, b, b+2, b+3)
    }
  }
  const flat = (pts, n) => {
    const b = pos.length / 3
    pts.forEach(p => pos.push(...p))
    for (let i = 0; i < 4; i++) nor.push(...n)
    idx.push(b, b+1, b+2, b, b+2, b+3)
  }
  flat([[x2,y1,z1],[x2,y2,z1],[x2,y2,z2],[x2,y1,z2]], [1,0,0])
  flat([[x1,y1,z2],[x1,y2,z2],[x1,y2,z1],[x1,y1,z1]], [-1,0,0])
  flat([[x1,y1,z2],[x2,y1,z2],[x2,y1,z1],[x1,y1,z1]], [0,-1,0])
  flat([[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]], [0,0,1])
  flat([[x2,y1,z1],[x1,y1,z1],[x1,y2,z1],[x2,y2,z1]], [0,0,-1])
  return { positions: pos, normals: nor, indices: idx }
}

// ─── Multi-material GLB writer ────────────────────────────────────────────────
// groups: Array of { parts: [...primitives], color: [r,g,b,a], roughness?, metallic?, name? }
// Legacy single-material: writeGLB(name, parts[], color) is auto-wrapped.
function writeGLB(name, partsOrGroups, legacyColor) {
  const groups = (Array.isArray(partsOrGroups) && partsOrGroups[0]?.parts !== undefined)
    ? partsOrGroups
    : [{ parts: Array.isArray(partsOrGroups) ? partsOrGroups : [partsOrGroups],
         color: legacyColor ?? [0.72, 0.65, 0.57, 1.0] }]

  const primitives = []
  const materials  = []
  const accessors  = []
  const bufViews   = []
  const chunks     = []
  let byteOffset   = 0
  let totalTris    = 0

  for (const { parts, color, roughness = 0.70, metallic = 0.0, name: matNameProp } of groups) {
    const { positions, normals, indices } = merge(Array.isArray(parts) ? parts : [parts])

    const posF32 = new Float32Array(positions)
    const nrmF32 = new Float32Array(normals)
    const idxU16 = new Uint16Array(indices)

    const posBytes = posF32.byteLength
    const nrmBytes = nrmF32.byteLength
    const idxBytes = idxU16.byteLength
    const idxPad   = (4 - (idxBytes % 4)) % 4

    const pMin = [Infinity, Infinity, Infinity]
    const pMax = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < positions.length; i += 3) {
      for (let c = 0; c < 3; c++) {
        pMin[c] = Math.min(pMin[c], positions[i + c])
        pMax[c] = Math.max(pMax[c], positions[i + c])
      }
    }
    const r4 = (v) => Math.round(v * 10000) / 10000
    const vc = positions.length / 3
    const ic = indices.length
    totalTris += ic / 3

    const posAcc = accessors.length
    accessors.push({ bufferView: bufViews.length, componentType: 5126, count: vc, type: 'VEC3', min: pMin.map(r4), max: pMax.map(r4) })
    bufViews.push({ buffer: 0, byteOffset, byteLength: posBytes, target: 34962 })
    byteOffset += posBytes

    const nrmAcc = accessors.length
    accessors.push({ bufferView: bufViews.length, componentType: 5126, count: vc, type: 'VEC3' })
    bufViews.push({ buffer: 0, byteOffset, byteLength: nrmBytes, target: 34962 })
    byteOffset += nrmBytes

    const idxAcc = accessors.length
    accessors.push({ bufferView: bufViews.length, componentType: 5123, count: ic, type: 'SCALAR' })
    bufViews.push({ buffer: 0, byteOffset, byteLength: idxBytes, target: 34963 })
    byteOffset += idxBytes + idxPad

    const matName = matNameProp ?? `part${materials.length}`
    materials.push({ name: matName, pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: metallic, roughnessFactor: roughness }, doubleSided: false })
    primitives.push({ attributes: { POSITION: posAcc, NORMAL: nrmAcc }, indices: idxAcc, material: materials.length - 1, mode: 4 })
    chunks.push({ posF32, nrmF32, idxU16, idxPad })
  }

  const bin = Buffer.alloc(byteOffset)
  let off = 0
  for (const { posF32, nrmF32, idxU16, idxPad } of chunks) {
    Buffer.from(posF32.buffer).copy(bin, off); off += posF32.byteLength
    Buffer.from(nrmF32.buffer).copy(bin, off); off += nrmF32.byteLength
    Buffer.from(idxU16.buffer).copy(bin, off); off += idxU16.byteLength
    off += idxPad
  }

  const gltfJson = {
    asset: { version: '2.0', generator: 'interior-studio-bathroom-kitchen' },
    scenes: [{ nodes: [0] }], scene: 0,
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives }],
    materials, accessors,
    bufferViews: bufViews,
    buffers: [{ byteLength: byteOffset }],
  }

  const jsonBuf   = Buffer.from(JSON.stringify(gltfJson), 'utf8')
  const jsonPad   = (jsonBuf.length + 3) & ~3
  const jsonChunk = Buffer.alloc(jsonPad, 0x20)
  jsonBuf.copy(jsonChunk)

  const totalLen = 12 + 8 + jsonPad + 8 + byteOffset
  const out = Buffer.alloc(totalLen)
  let o = 0
  out.writeUInt32LE(0x46546C67, o); o += 4
  out.writeUInt32LE(2,          o); o += 4
  out.writeUInt32LE(totalLen,   o); o += 4
  out.writeUInt32LE(jsonPad,    o); o += 4
  out.writeUInt32LE(0x4E4F534A, o); o += 4
  jsonChunk.copy(out, o); o += jsonPad
  out.writeUInt32LE(byteOffset, o); o += 4
  out.writeUInt32LE(0x004E4942, o); o += 4
  bin.copy(out, o)

  const path = resolve(OUT, name + '.glb')
  writeFileSync(path, out)
  console.log(`  ✓  ${(name + '.glb').padEnd(26)}  ${(totalLen / 1024).toFixed(1).padStart(6)} kB  ${totalTris} tris`)
}

// Elliptical cylinder (oval in XZ, rx ≠ rz). Outward normals.
function ellipse(cx, cz, y1, y2, rx, rz, segs = 16) {
  const p = [], n = [], idx = []
  const step = (2 * Math.PI) / segs
  const angles = Array.from({ length: segs + 1 }, (_, i) => i * step)
  for (let i = 0; i < segs; i++) {
    const a0 = angles[i], a1 = angles[i + 1]
    let nx0 = Math.cos(a0) / rx, nz0 = Math.sin(a0) / rz
    let l0 = Math.sqrt(nx0*nx0 + nz0*nz0); nx0 /= l0; nz0 /= l0
    let nx1 = Math.cos(a1) / rx, nz1 = Math.sin(a1) / rz
    let l1 = Math.sqrt(nx1*nx1 + nz1*nz1); nx1 /= l1; nz1 /= l1
    const b = p.length / 3
    p.push(cx + rx*Math.cos(a0), y1, cz + rz*Math.sin(a0))
    p.push(cx + rx*Math.cos(a1), y1, cz + rz*Math.sin(a1))
    p.push(cx + rx*Math.cos(a1), y2, cz + rz*Math.sin(a1))
    p.push(cx + rx*Math.cos(a0), y2, cz + rz*Math.sin(a0))
    n.push(nx0, 0, nz0, nx1, 0, nz1, nx1, 0, nz1, nx0, 0, nz0)
    idx.push(b, b+1, b+2, b, b+2, b+3)
  }
  // bottom cap
  const bc = p.length / 3
  p.push(cx, y1, cz); n.push(0, -1, 0)
  for (let i = 0; i < segs; i++) { p.push(cx + rx*Math.cos(angles[i]), y1, cz + rz*Math.sin(angles[i])); n.push(0, -1, 0) }
  for (let i = 0; i < segs; i++) { idx.push(bc, bc + 1 + ((i+1)%segs), bc + 1 + i) }
  // top cap
  const tc = p.length / 3
  p.push(cx, y2, cz); n.push(0, 1, 0)
  for (let i = 0; i < segs; i++) { p.push(cx + rx*Math.cos(angles[i]), y2, cz + rz*Math.sin(angles[i])); n.push(0, 1, 0) }
  for (let i = 0; i < segs; i++) { idx.push(tc, tc + 1 + i, tc + 1 + ((i+1)%segs)) }
  return { positions: p, normals: n, indices: idx }
}

// Like ellipse but normals point inward — use for visible bowl interiors.
function innerEllipse(cx, cz, y1, y2, rx, rz, segs = 16) {
  const p = [], n = [], idx = []
  const step = (2 * Math.PI) / segs
  const angles = Array.from({ length: segs + 1 }, (_, i) => i * step)
  for (let i = 0; i < segs; i++) {
    const a0 = angles[i], a1 = angles[i + 1]
    let nx0 = -Math.cos(a0) / rx, nz0 = -Math.sin(a0) / rz
    let l0 = Math.sqrt(nx0*nx0 + nz0*nz0); nx0 /= l0; nz0 /= l0
    let nx1 = -Math.cos(a1) / rx, nz1 = -Math.sin(a1) / rz
    let l1 = Math.sqrt(nx1*nx1 + nz1*nz1); nx1 /= l1; nz1 /= l1
    const b = p.length / 3
    // reversed winding for inward face
    p.push(cx + rx*Math.cos(a1), y1, cz + rz*Math.sin(a1))
    p.push(cx + rx*Math.cos(a0), y1, cz + rz*Math.sin(a0))
    p.push(cx + rx*Math.cos(a0), y2, cz + rz*Math.sin(a0))
    p.push(cx + rx*Math.cos(a1), y2, cz + rz*Math.sin(a1))
    n.push(nx1, 0, nz1, nx0, 0, nz0, nx0, 0, nz0, nx1, 0, nz1)
    idx.push(b, b+1, b+2, b, b+2, b+3)
  }
  return { positions: p, normals: n, indices: idx }
}

// Flat elliptical disk — top face (normal up). Matches cyl top-cap winding.
function disk(cx, cz, y, rx, rz, segs = 16) {
  const p = [], n = [], idx = []
  const step = (2 * Math.PI) / segs
  const tc = 0
  p.push(cx, y, cz); n.push(0, 1, 0)
  for (let i = 0; i < segs; i++) { p.push(cx + rx*Math.cos(i*step), y, cz + rz*Math.sin(i*step)); n.push(0, 1, 0) }
  for (let i = 0; i < segs; i++) { idx.push(tc, tc + 1 + i, tc + 1 + ((i+1)%segs)) }
  return { positions: p, normals: n, indices: idx }
}

// Flat annular ring — top face (normal up) between outer and inner ellipses.
function ring(cx, cz, y, rxO, rzO, rxI, rzI, segs = 16) {
  const p = [], n = [], idx = []
  const step = (2 * Math.PI) / segs
  for (let i = 0; i < segs; i++) {
    const a0 = i * step, a1 = (i+1) * step
    const b = p.length / 3
    p.push(cx + rxO*Math.cos(a0), y, cz + rzO*Math.sin(a0))
    p.push(cx + rxO*Math.cos(a1), y, cz + rzO*Math.sin(a1))
    p.push(cx + rxI*Math.cos(a1), y, cz + rzI*Math.sin(a1))
    p.push(cx + rxI*Math.cos(a0), y, cz + rzI*Math.sin(a0))
    n.push(0,1,0, 0,1,0, 0,1,0, 0,1,0)
    idx.push(b, b+1, b+2, b, b+2, b+3)
  }
  return { positions: p, normals: n, indices: idx }
}

// ─── Color palette (linear sRGB) ──────────────────────────────────────────────
const C_WHITE    = [0.95, 0.95, 0.95, 1]   // ceramic white
const C_CHROME   = [0.82, 0.82, 0.85, 1]   // chrome / stainless
const C_CABINET  = [0.90, 0.87, 0.80, 1]   // off-white cabinet
const C_DARK_GRY = [0.18, 0.19, 0.21, 1]   // dark grey appliances
const C_MIRROR   = [0.78, 0.86, 0.90, 1]   // mirror blue-grey
const C_WICKER   = [0.56, 0.43, 0.28, 1]   // wicker / rattan
const C_STAINLESS= [0.55, 0.60, 0.63, 1]   // brushed steel
const C_WOOD_LT  = [0.60, 0.42, 0.22, 1]   // light oak (reused from main script)

console.log('Generating bathroom & kitchen GLBs…\n')

// ─── BATHROOM ─────────────────────────────────────────────────────────────────

// TOILET  0.38W × 0.70D × 0.80H   (-Z = wall / tank side)
// Bowl is an oval ellipse; seat is a flat ring; tank is a box at back.
writeGLB('toilet', [
  { parts: [
    ellipse(0, 0.09, 0.00, 0.09, 0.15, 0.12, 14),       // oval pedestal base
    ellipse(0, 0.09, 0.09, 0.37, 0.17, 0.22, 18),       // oval bowl body
    box(-0.13, 0.35, -0.35,  0.13, 0.77, -0.09),        // tank body
    box(-0.14, 0.75, -0.36,  0.14, 0.80, -0.08),        // tank lid
  ], color: C_WHITE, roughness: 0.12, name: 'body' },
  { parts: [
    ring(0, 0.09, 0.38, 0.18, 0.23, 0.10, 0.17, 18),   // seat top ring
    ellipse(0, 0.09, 0.37, 0.38, 0.18, 0.23, 18),       // seat outer rim wall (thin)
  ], color: [0.97, 0.97, 0.97, 1], roughness: 0.22, name: 'seat' },
])

// BASIN  0.55W × 0.45D × 0.85H
// Round pedestal + wide oval bowl with visible inner surface.
writeGLB('basin', [
  { parts: [
    cyl(0, 0, 0.00, 0.04, 0.14, 14),                    // base flare
    cyl(0, 0, 0.04, 0.67, 0.055, 12),                   // column shaft
    cyl(0, 0, 0.67, 0.71, 0.14, 14),                    // column-bowl transition
    ellipse(0, 0, 0.71, 0.85, 0.25, 0.20, 20),          // bowl outer wall
    ring(0, 0, 0.85, 0.25, 0.20, 0.21, 0.16, 20),       // bowl rim
  ], color: C_WHITE, roughness: 0.12, name: 'body' },
  { parts: [
    innerEllipse(0, 0, 0.74, 0.85, 0.21, 0.16, 20),     // bowl inner wall (visible from above)
    disk(0, 0, 0.74, 0.21, 0.16, 20),                   // bowl floor
  ], color: [0.88, 0.90, 0.92, 1], roughness: 0.10, name: 'inner' },
  { parts: [
    cyl(0, -0.11, 0.83, 0.91, 0.013, 8),                // tap riser
    box(-0.007, 0.90, -0.11, 0.007, 0.92, -0.03),       // tap spout
    box( 0.04, 0.875, -0.14,  0.08, 0.890, -0.10),      // hot handle
    box(-0.08, 0.875, -0.14, -0.04, 0.890, -0.10),      // cold handle
  ], color: C_CHROME, roughness: 0.15, metallic: 0.85, name: 'taps' },
])

// BATHTUB  1.70W × 0.75D × 0.55H  (-Z = wall side)
// Outer shell + visible inner basin + headrest + chrome fittings.
writeGLB('bathtub', [
  { parts: [
    box(-0.85, 0.00, -0.375,  0.85, 0.07,  0.375),      // base slab
    box(-0.85, 0.07, -0.375, -0.79, 0.55,  0.375),      // left outer wall
    box( 0.79, 0.07, -0.375,  0.85, 0.55,  0.375),      // right outer wall
    box(-0.85, 0.07, -0.375,  0.85, 0.55, -0.315),      // back outer wall
    box(-0.85, 0.07,  0.315,  0.85, 0.55,  0.375),      // front outer wall
    box(-0.85, 0.50, -0.375,  0.85, 0.55,  0.375),      // rim cap
  ], color: C_WHITE, roughness: 0.12, name: 'body' },
  { parts: [
    // Inner basin (slightly inset — creates visible depth)
    box(-0.79, 0.08, -0.315, -0.73, 0.50,  0.315),      // inner left wall
    box( 0.73, 0.08, -0.315,  0.79, 0.50,  0.315),      // inner right wall
    box(-0.79, 0.08, -0.315,  0.79, 0.50, -0.255),      // inner back wall
    box(-0.79, 0.08,  0.255,  0.79, 0.50,  0.315),      // inner front wall
    box(-0.79, 0.08, -0.315,  0.79, 0.13,  0.315),      // inner floor
    // Headrest slope at one end
    box( 0.62, 0.13,  -0.28,  0.79, 0.45,  0.28),       // headrest cushion end
  ], color: [0.93, 0.94, 0.95, 1], roughness: 0.10, name: 'inner' },
  { parts: [
    cyl( 0.55, -0.28, 0.46, 0.53, 0.018, 8),            // hot tap riser
    cyl( 0.38, -0.28, 0.46, 0.53, 0.018, 8),            // cold tap riser
    cyl( 0.00, -0.28, 0.48, 0.51, 0.010, 8),            // drain
  ], color: C_CHROME, roughness: 0.15, metallic: 0.85, name: 'taps' },
])

// SHOWER TRAY  0.90W × 0.90D × 0.15H
writeGLB('shower-tray', [
  { parts: [
    box(-0.45, 0.00, -0.45,  0.45, 0.06,  0.45),        // base
    box(-0.45, 0.06, -0.45, -0.41, 0.15,  0.45),        // left rim
    box( 0.41, 0.06, -0.45,  0.45, 0.15,  0.45),        // right rim
    box(-0.45, 0.06, -0.45,  0.45, 0.15, -0.41),        // back rim
    box(-0.45, 0.06,  0.41,  0.45, 0.15,  0.45),        // front rim
  ], color: C_WHITE, roughness: 0.12, name: 'body' },
  { parts: [
    cyl(0, 0, 0.06, 0.07, 0.030, 10),                   // drain
  ], color: C_CHROME, roughness: 0.15, metallic: 0.85, name: 'drain' },
])

// TOWEL RACK  0.60 × 0.08 × 0.04  wallMounted  (-Z = wall)
writeGLB('towel-rack', [
  { parts: [
    box(-0.30, 0.005, -0.04, -0.26, 0.035,  0.03),      // left bracket
    box( 0.26, 0.005, -0.04,  0.30, 0.035,  0.03),      // right bracket
    cyl(-0.26, 0.025, 0.007, 0.033, 0.010, 8),          // left joint
    cyl( 0.26, 0.025, 0.007, 0.033, 0.010, 8),          // right joint
    box(-0.26, 0.014, 0.024,  0.26, 0.026, 0.038),      // main bar
  ], color: C_CHROME, roughness: 0.15, metallic: 0.85, name: 'body' },
])

// BATHROOM MIRROR  0.60 × 0.05 × 0.80  wallMounted  (-Z = wall)
writeGLB('bathroom-mirror', [
  { parts: [
    box(-0.30, 0.00, -0.025, 0.30, 0.80,  0.010),       // backing / frame
  ], color: C_CHROME, roughness: 0.25, metallic: 0.55, name: 'frame' },
  { parts: [
    box(-0.27, 0.03,  0.008, 0.27, 0.77, 0.018),        // mirror face
  ], color: C_MIRROR, roughness: 0.04, metallic: 0.92, name: 'mirror' },
])

// VANITY UNIT  0.90W × 0.50D × 0.85H
// Cabinet with doors + oval integrated basin on countertop.
writeGLB('vanity-unit', [
  { parts: [
    box(-0.45, 0.00, -0.25,  0.45, 0.72,  0.25),        // cabinet body
    box(-0.45, 0.72, -0.25,  0.45, 0.77,  0.25),        // countertop
    box(-0.43, 0.02,  0.24, -0.03, 0.70,  0.26),        // left door
    box( 0.03, 0.02,  0.24,  0.43, 0.70,  0.26),        // right door
    box(-0.45, 0.72, -0.25,  0.45, 0.85, -0.22),        // backsplash
    ellipse(0, 0, 0.77, 0.85, 0.18, 0.13, 18),          // oval basin outer wall
    ring(0, 0, 0.85, 0.18, 0.13, 0.15, 0.10, 18),       // basin rim
  ], color: C_WHITE, roughness: 0.15, name: 'body' },
  { parts: [
    innerEllipse(0, 0, 0.79, 0.85, 0.15, 0.10, 18),     // basin inner wall
    disk(0, 0, 0.79, 0.15, 0.10, 18),                   // basin floor
  ], color: [0.88, 0.90, 0.92, 1], roughness: 0.10, name: 'inner' },
  { parts: [
    box(-0.25, 0.34,  0.25, -0.14, 0.36,  0.27),        // left handle
    box( 0.14, 0.34,  0.25,  0.25, 0.36,  0.27),        // right handle
  ], color: C_CHROME, roughness: 0.15, metallic: 0.85, name: 'handles' },
])

// LAUNDRY BASKET  0.45W × 0.40D × 0.55H  oval wicker shape
writeGLB('laundry-basket', [
  { parts: [
    ellipse(0, 0, 0.00, 0.05, 0.20, 0.18, 14),          // oval base
    ellipse(0, 0, 0.05, 0.50, 0.22, 0.20, 14),          // body (slightly wider than base)
    ring(0, 0, 0.10, 0.22, 0.20, 0.19, 0.17, 14),       // weave band 1 (rim detail)
    ring(0, 0, 0.23, 0.22, 0.20, 0.19, 0.17, 14),       // weave band 2
    ring(0, 0, 0.36, 0.22, 0.20, 0.19, 0.17, 14),       // weave band 3
    ring(0, 0, 0.48, 0.22, 0.20, 0.19, 0.17, 14),       // top rim
  ], color: C_WICKER, roughness: 0.92, name: 'body' },
  { parts: [
    ellipse(0, 0, 0.49, 0.55, 0.22, 0.20, 14),          // lid outer rim
    disk(0, 0, 0.55, 0.22, 0.20, 14),                   // lid top face
    cyl(0, 0, 0.55, 0.59, 0.040, 10),                   // lid knob
  ], color: [0.62, 0.48, 0.32, 1], roughness: 0.88, name: 'lid' },
])

// ─── KITCHEN ──────────────────────────────────────────────────────────────────

// KITCHEN SINK  0.80 × 0.60 × 0.90
writeGLB('kitchen-sink', [
  { parts: [
    box(-0.40, 0,    -0.30,  0.40, 0.82,  0.30),        // cabinet body
    box(-0.38, 0.02,  0.29,  0.38, 0.80,  0.31),        // cabinet door
    box(-0.40, 0.82, -0.30,  0.40, 0.86,  0.30),        // countertop
    box(-0.32, 0.84, -0.22,  0.32, 0.90,  0.18),        // sink basin
  ], color: C_STAINLESS, roughness: 0.30, metallic: 0.6, name: 'body' },
  { parts: [
    box(-0.16, 0.40,  0.30,  0.16, 0.42,  0.32),        // door handle
    cyl(0, -0.16, 0.85, 0.93, 0.013, 8),                // tap riser
    box(-0.007, 0.92, -0.16, 0.007, 0.94, -0.06),       // tap spout
  ], color: C_CHROME, roughness: 0.15, metallic: 0.9, name: 'fittings' },
])

// FRIDGE  0.70 × 0.70 × 1.85
writeGLB('fridge', [
  { parts: [
    box(-0.35, 0,    -0.35,  0.35, 1.85,  0.35),        // body
    box(-0.33, 0.02,  0.34,  0.33, 0.85,  0.36),        // lower fridge door
    box(-0.33, 0.87,  0.34,  0.33, 1.83,  0.36),        // upper freezer door
  ], color: C_CHROME, roughness: 0.20, metallic: 0.7, name: 'body' },
  { parts: [
    box( 0.18, 0.40,  0.35,  0.22, 0.60,  0.38),        // lower handle
    box( 0.18, 1.20,  0.35,  0.22, 1.40,  0.38),        // upper handle
  ], color: C_STAINLESS, roughness: 0.15, metallic: 0.9, name: 'handles' },
])

// OVEN  0.60 × 0.60 × 0.90
writeGLB('oven', [
  { parts: [
    box(-0.30, 0,    -0.30,  0.30, 0.90,  0.30),        // body
    box(-0.28, 0.02,  0.29,  0.28, 0.72,  0.31),        // oven door
    box(-0.28, 0.72,  0.28,  0.28, 0.85,  0.31),        // control panel
  ], color: C_DARK_GRY, roughness: 0.40, name: 'body' },
  { parts: [
    box(-0.22, 0.08,  0.30,  0.22, 0.60,  0.32),        // glass window
  ], color: [0.05, 0.05, 0.07, 1], roughness: 0.05, metallic: 0.1, name: 'glass' },
  { parts: [
    box(-0.18, 0.64,  0.30,  0.18, 0.66,  0.33),        // door handle
    cyl(-0.12, -0.12, 0.87, 0.90, 0.068, 12),           // hob ring BL
    cyl( 0.12, -0.12, 0.87, 0.90, 0.068, 12),           // hob ring BR
    cyl(-0.12,  0.12, 0.87, 0.90, 0.068, 12),           // hob ring FL
    cyl( 0.12,  0.12, 0.87, 0.90, 0.068, 12),           // hob ring FR
  ], color: C_STAINLESS, roughness: 0.25, metallic: 0.7, name: 'accents' },
])

// DISHWASHER  0.60 × 0.60 × 0.85
writeGLB('dishwasher', [
  { parts: [
    box(-0.30, 0,    -0.30,  0.30, 0.85,  0.30),        // body
    box(-0.28, 0.02,  0.29,  0.28, 0.80,  0.31),        // door panel
    box(-0.28, 0.80,  0.28,  0.28, 0.85,  0.31),        // control strip
  ], color: C_DARK_GRY, roughness: 0.40, name: 'body' },
  { parts: [
    box(-0.18, 0.74,  0.30,  0.18, 0.76,  0.32),        // handle
  ], color: C_STAINLESS, roughness: 0.20, metallic: 0.8, name: 'handle' },
])

// MICROWAVE  0.55 × 0.35 × 0.32  wallMounted  (-Z = wall)
writeGLB('microwave', [
  { parts: [
    box(-0.27, 0,    -0.175, 0.27, 0.32,  0.175),       // body
    box( 0.09, 0.03,  0.165, 0.25, 0.29,  0.185),       // control panel
  ], color: C_DARK_GRY, roughness: 0.40, name: 'body' },
  { parts: [
    box(-0.25, 0.03,  0.165, 0.07, 0.29,  0.185),       // glass door window
  ], color: [0.05, 0.05, 0.07, 1], roughness: 0.05, metallic: 0.1, name: 'glass' },
  { parts: [
    box(-0.23, 0.00,  0.175, 0.05, 0.02,  0.195),       // door handle
  ], color: C_STAINLESS, roughness: 0.20, metallic: 0.8, name: 'handle' },
])

// UPPER CABINET  0.60 × 0.35 × 0.70  wallMounted  (-Z = wall)
writeGLB('upper-cabinet', [
  { parts: [
    box(-0.30, 0,    -0.175, 0.30, 0.70,  0.175),       // body
    box(-0.28, 0.02,  0.165, 0.28, 0.68,  0.185),       // door
  ], color: C_CABINET, roughness: 0.35, name: 'body' },
  { parts: [
    box(-0.14, 0.33,  0.175, 0.14, 0.35,  0.195),       // handle
  ], color: C_CHROME, roughness: 0.20, metallic: 0.8, name: 'handle' },
])

// RANGE HOOD  0.60 × 0.40 × 0.35  wallMounted  (-Z = wall)
writeGLB('range-hood', [
  { parts: [
    box(-0.30, 0.12, -0.20,  0.30, 0.35,  0.20),        // upper hood box
    box(-0.24, 0.00, -0.16,  0.24, 0.12,  0.16),        // lower funnel
    box(-0.28, 0.12,  0.18,  0.28, 0.33,  0.21),        // front panel
  ], color: C_STAINLESS, roughness: 0.25, metallic: 0.7, name: 'body' },
  { parts: [
    box(-0.22, 0.01, -0.15,  0.22, 0.03,  0.15),        // filter grille
  ], color: C_DARK_GRY, roughness: 0.50, name: 'grille' },
])

// KITCHEN ISLAND  1.50 × 0.80 × 0.90
writeGLB('kitchen-island', [
  { parts: [
    box(-0.75, 0,    -0.40,  0.75, 0.82,  0.40),        // cabinet body
    box(-0.77, 0.82, -0.42,  0.77, 0.90,  0.42),        // countertop (slight overhang)
    box(-0.73, 0.02,  0.39, -0.03, 0.80,  0.41),        // front left door
    box( 0.03, 0.02,  0.39,  0.73, 0.80,  0.41),        // front right door
    box(-0.73, 0.02, -0.41, -0.03, 0.80, -0.39),        // back left door
    box( 0.03, 0.02, -0.41,  0.73, 0.80, -0.39),        // back right door
  ], color: C_CABINET, roughness: 0.35, name: 'body' },
  { parts: [
    box(-0.60, 0.39,  0.40, -0.50, 0.41,  0.42),        // front handle L
    box( 0.50, 0.39,  0.40,  0.60, 0.41,  0.42),        // front handle R
  ], color: C_CHROME, roughness: 0.20, metallic: 0.8, name: 'handles' },
])

// PANTRY UNIT  0.60 × 0.60 × 2.00
writeGLB('pantry-unit', [
  { parts: [
    box(-0.30, 0,    -0.30,  0.30, 2.00,  0.30),        // carcass
    box(-0.28, 0.02,  0.29,  0.28, 0.98,  0.31),        // lower door
    box(-0.28, 1.02,  0.29,  0.28, 1.98,  0.31),        // upper door
    box(-0.30, 0.98,  0.28,  0.30, 1.02,  0.31),        // middle rail
  ], color: C_CABINET, roughness: 0.35, name: 'body' },
  { parts: [
    box( 0.15, 0.48,  0.30,  0.23, 0.50,  0.32),        // lower handle
    box( 0.15, 1.48,  0.30,  0.23, 1.50,  0.32),        // upper handle
  ], color: C_CHROME, roughness: 0.20, metallic: 0.8, name: 'handles' },
])

// BAR STOOL  0.40 × 0.40 × 0.75
writeGLB('bar-stool', [
  { parts: [
    cushion(-0.185, 0.68, -0.185, 0.185, 0.75, 0.185, 0.018, 6, 6), // seat pad with dome
  ], color: [0.72, 0.65, 0.57, 1], roughness: 0.85, name: 'seat' },
  { parts: [
    cyl(0, 0, 0.06, 0.68, 0.033,  8),                   // central column
    box(-0.19, 0,    -0.025, 0.19, 0.055,  0.025),      // base X arm
    box(-0.025, 0,   -0.19,  0.025, 0.055, 0.19),       // base Z arm
    box(-0.13, 0.35, -0.018, 0.13, 0.375,  0.018),      // foot-rest X
    box(-0.018, 0.35,-0.13,  0.018, 0.375, 0.13),       // foot-rest Z
  ], color: C_WOOD_LT, roughness: 0.65, name: 'base' },
])

console.log('\nDone — 18 GLBs written.')
