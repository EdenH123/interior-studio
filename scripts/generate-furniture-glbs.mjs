#!/usr/bin/env node
// scripts/generate-furniture-glbs.mjs  (v2 — high-detail procedural)
// Generates CC0 furniture GLB models. Replaces v1 (box-only, 12–96 triangles)
// with multi-part meshes using cylinder legs, cushion geometry, and proper
// proportions — 200–800 triangles per model.
//
// Conventions (identical to v1 so fitToBox() contract is unchanged):
//   X = [-W/2, W/2]   Y = [0, H]   Z = [-D/2, D/2]
//   -Z is back (wall-side); origin at floor bottom-centre.
//
// Run:  node scripts/generate-furniture-glbs.mjs
// NOTE: chair.glb is NOT generated here — it is produced by
//       scripts/process-sheenchair.mjs (real CC0 geometry from three.js).

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/assets/furniture')
mkdirSync(OUT, { recursive: true })

// ─── primitive helpers ────────────────────────────────────────────────────────

// Returns { positions, normals, indices } for one axis-aligned box.
function box(x1, y1, z1, x2, y2, z2) {
  const p = []
  const n = []
  // +X
  p.push(x2,y1,z1, x2,y2,z1, x2,y2,z2, x2,y1,z2); n.push(1,0,0, 1,0,0, 1,0,0, 1,0,0)
  // -X
  p.push(x1,y1,z2, x1,y2,z2, x1,y2,z1, x1,y1,z1); n.push(-1,0,0, -1,0,0, -1,0,0, -1,0,0)
  // +Y
  p.push(x1,y2,z2, x2,y2,z2, x2,y2,z1, x1,y2,z1); n.push(0,1,0, 0,1,0, 0,1,0, 0,1,0)
  // -Y
  p.push(x1,y1,z1, x2,y1,z1, x2,y1,z2, x1,y1,z2); n.push(0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0)
  // +Z
  p.push(x2,y1,z2, x2,y2,z2, x1,y2,z2, x1,y1,z2); n.push(0,0,1, 0,0,1, 0,0,1, 0,0,1)
  // -Z
  p.push(x1,y1,z1, x1,y2,z1, x2,y2,z1, x2,y1,z1); n.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1)
  const idx = []
  for (let f = 0; f < 6; f++) {
    const b = f * 4
    idx.push(b, b+1, b+2, b, b+2, b+3)
  }
  return { positions: p, normals: n, indices: idx }
}

// Upright cylinder from y1→y2, centred at (cx, cz).
// segs: number of side segments (8 → decent round look, 12 → smooth).
// smooth: use smooth (vertex) normals on the side (true) or flat per-face (false).
function cyl(cx, cz, y1, y2, r, segs = 8, smooth = true) {
  const p = [], n = [], idx = []
  const step = (2 * Math.PI) / segs
  const cos = Array.from({ length: segs + 1 }, (_, i) => Math.cos(i * step))
  const sin = Array.from({ length: segs + 1 }, (_, i) => Math.sin(i * step))

  // — side faces —
  for (let i = 0; i < segs; i++) {
    const midA = (i + 0.5) * step
    const nx = smooth ? cos[i] : Math.cos(midA)
    const nz = smooth ? sin[i] : Math.sin(midA)
    const nx1 = smooth ? cos[i + 1] : Math.cos(midA)
    const nz1 = smooth ? sin[i + 1] : Math.sin(midA)
    const b = p.length / 3
    p.push(cx + r*cos[i],  y1, cz + r*sin[i])   // BL
    p.push(cx + r*cos[i+1],y1, cz + r*sin[i+1]) // BR
    p.push(cx + r*cos[i+1],y2, cz + r*sin[i+1]) // TR
    p.push(cx + r*cos[i],  y2, cz + r*sin[i])   // TL
    n.push(nx, 0, nz,  nx1, 0, nz1,  nx1, 0, nz1,  nx, 0, nz)
    idx.push(b, b+1, b+2, b, b+2, b+3)
  }

  // — bottom cap (CCW from -Y) —
  const bc = p.length / 3
  p.push(cx, y1, cz); n.push(0, -1, 0)
  for (let i = 0; i < segs; i++) {
    p.push(cx + r*cos[i], y1, cz + r*sin[i]); n.push(0, -1, 0)
  }
  for (let i = 0; i < segs; i++) {
    idx.push(bc, bc + 1 + ((i + 1) % segs), bc + 1 + i)
  }

  // — top cap (CCW from +Y) —
  const tc = p.length / 3
  p.push(cx, y2, cz); n.push(0, 1, 0)
  for (let i = 0; i < segs; i++) {
    p.push(cx + r*cos[i], y2, cz + r*sin[i]); n.push(0, 1, 0)
  }
  for (let i = 0; i < segs; i++) {
    idx.push(tc, tc + 1 + i, tc + 1 + ((i + 1) % segs))
  }
  return { positions: p, normals: n, indices: idx }
}

// 4 legs at the corners of a rectangle [x1,z1]→[x2,z2], from floor to legTop.
// r = leg radius.  Each leg is a cylinder.
function fourLegs(x1, z1, x2, z2, legTop, r, segs = 8) {
  const inset = r * 0.5
  const lx1 = x1 + inset, lz1 = z1 + inset
  const lx2 = x2 - inset, lz2 = z2 - inset
  return [
    cyl(lx1, lz1, 0, legTop, r, segs),
    cyl(lx2, lz1, 0, legTop, r, segs),
    cyl(lx1, lz2, 0, legTop, r, segs),
    cyl(lx2, lz2, 0, legTop, r, segs),
  ]
}

// Merge an array of part objects { positions, normals, indices } into one mesh.
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

// Seat cushion: subdivided top (+Y) face with smooth dome, flat sides.
// Bump is sin(πu)·sin(πv) so it is exactly 0 at all edges — no seams.
function cushion(x1, y1, z1, x2, y2, z2, bulge = 0.04, nX = 6, nZ = 4) {
  const pos = [], nor = [], idx = []
  const w = x2 - x1, d = z2 - z1
  const stride = nX + 1
  // Store each vertex as [x,y,z,nx,ny,nz]
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

// Back cushion: subdivided front (+Z) face with smooth dome, flat sides.
// Use for vertically-mounted back cushions that face the viewer.
function backCushion(x1, y1, z1, x2, y2, z2, bulge = 0.04, nX = 6, nY = 4) {
  const pos = [], nor = [], idx = []
  const w = x2 - x1, h = y2 - y1
  const stride = nX + 1
  const verts = []
  for (let iy = 0; iy <= nY; iy++) {
    for (let ix = 0; ix <= nX; ix++) {
      const u = ix / nX, v = iy / nY
      const b    = bulge * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
      const dfdx = bulge * (Math.PI / w) * Math.cos(Math.PI * u) * Math.sin(Math.PI * v)
      const dfdy = bulge * (Math.PI / h) * Math.sin(Math.PI * u) * Math.cos(Math.PI * v)
      const ilen = 1 / Math.sqrt(dfdx * dfdx + dfdy * dfdy + 1)
      verts.push(x1 + u * w, y1 + v * h, z2 + b, -dfdx * ilen, -dfdy * ilen, ilen)
    }
  }
  const V = (i) => verts.slice(i * 6, i * 6 + 6)
  for (let iy = 0; iy < nY; iy++) {
    for (let ix = 0; ix < nX; ix++) {
      const i00 = iy * stride + ix, i01 = i00 + 1
      const i10 = (iy + 1) * stride + ix, i11 = i10 + 1
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
  flat([[x2,y1,z2],[x2,y2,z2],[x2,y2,z1],[x2,y1,z1]], [1,0,0])
  flat([[x1,y1,z1],[x1,y2,z1],[x1,y2,z2],[x1,y1,z2]], [-1,0,0])
  flat([[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]], [0,1,0])
  flat([[x1,y1,z2],[x2,y1,z2],[x2,y1,z1],[x1,y1,z1]], [0,-1,0])
  flat([[x2,y1,z1],[x1,y1,z1],[x1,y2,z1],[x2,y2,z1]], [0,0,-1])
  return { positions: pos, normals: nor, indices: idx }
}

// ─── GLB writer (multi-material) ─────────────────────────────────────────────
// groups: Array of { parts, color, roughness?, metallic? }
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

  for (const { parts, color, roughness = 0.80, metallic = 0.0, name } of groups) {
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

    const matName = name ?? `part${materials.length}`
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
    asset: { version: '2.0', generator: 'interior-studio-gen-v2' },
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
  console.log(`  ✓  ${(name + '.glb').padEnd(22)}  ${(totalLen / 1024).toFixed(1).padStart(6)} kB  ${totalTris} tris`)
}

// ─── Color palette (linear sRGB) ──────────────────────────────────────────────
const C_UPHOLSTERY = [0.72, 0.65, 0.57, 1]   // warm linen
const C_WOOD_LT    = [0.60, 0.42, 0.22, 1]   // light oak
const C_WOOD_DK    = [0.36, 0.22, 0.10, 1]   // dark walnut
const C_TEAL       = [0.20, 0.50, 0.45, 1]   // bed teal
const C_RUG        = [0.70, 0.38, 0.14, 1]   // rug amber
const C_BRASS      = [0.80, 0.68, 0.40, 1]   // lamp brass
const C_TV         = [0.08, 0.08, 0.09, 1]   // TV near-black

console.log('Generating furniture GLBs (v2 — high-detail procedural)…\n')
console.log('  (chair.glb produced separately by process-sheenchair.mjs)\n')

// ─── SOFA  2.0 × 0.9 × 0.85 ──────────────────────────────────────────────────
// frame = solid structural upholstery; cushions = removable seat+back pads (lighter tone)
writeGLB('sofa', [
  { parts: [
    box(-1.00, 0, -0.45,  1.00, 0.09, 0.45),                     // base platform
    box(-0.86, 0.09, -0.45,  0.86, 0.85, -0.40),                 // solid back panel
    box(-0.38, 0.09, -0.45, -0.32, 0.42,  0.45),                 // seat gap L
    box( 0.32, 0.09, -0.45,  0.38, 0.42,  0.45),                 // seat gap R
    box(-0.38, 0.42, -0.45, -0.32, 0.85, -0.15),                 // back gap L
    box( 0.32, 0.42, -0.45,  0.38, 0.85, -0.15),                 // back gap R
    box(-1.00, 0.09, -0.45, -0.86, 0.65, 0.45),                  // left armrest
    box( 0.86, 0.09, -0.45,  1.00, 0.65, 0.45),                  // right armrest
  ], color: C_UPHOLSTERY, roughness: 0.85, name: 'frame' },
  { parts: [
    cushion(-1.00, 0.09, -0.45, -0.38, 0.42, 0.45, 0.034),
    cushion(-0.32, 0.09, -0.45,  0.32, 0.42, 0.45, 0.034),
    cushion( 0.38, 0.09, -0.45,  1.00, 0.42, 0.45, 0.034),
    backCushion(-1.00, 0.42, -0.45, -0.38, 0.85, -0.15, 0.030),
    backCushion(-0.32, 0.42, -0.45,  0.32, 0.85, -0.15, 0.030),
    backCushion( 0.38, 0.42, -0.45,  1.00, 0.85, -0.15, 0.030),
  ], color: [0.82, 0.74, 0.65, 1], roughness: 0.85, name: 'cushions' },
  { parts: [
    cyl(-0.88, -0.38, 0, 0.09, 0.055, 8),
    cyl( 0.88, -0.38, 0, 0.09, 0.055, 8),
    cyl(-0.88,  0.38, 0, 0.09, 0.055, 8),
    cyl( 0.88,  0.38, 0, 0.09, 0.055, 8),
  ], color: C_WOOD_DK, roughness: 0.60, name: 'legs' },
])

// ─── ARMCHAIR  0.9 × 0.9 × 0.85 ──────────────────────────────────────────────
writeGLB('armchair', [
  { parts: [
    box(-0.45, 0, -0.45, 0.45, 0.09, 0.45),                      // base platform
    box(-0.33, 0.09, -0.45, 0.33, 0.85, -0.40),                  // solid back panel
    box(-0.45, 0.09, -0.45, -0.33, 0.65, 0.45),                  // left armrest
    box( 0.33, 0.09, -0.45,  0.45, 0.65, 0.45),                  // right armrest
  ], color: C_UPHOLSTERY, roughness: 0.85, name: 'frame' },
  { parts: [
    cushion(-0.45, 0.09, -0.45, 0.45, 0.42, 0.45, 0.030),        // seat cushion
    backCushion(-0.45, 0.42, -0.45, 0.45, 0.85, -0.13, 0.028),   // back cushion
  ], color: [0.82, 0.74, 0.65, 1], roughness: 0.85, name: 'cushions' },
  { parts: [
    cyl(-0.38, -0.38, 0, 0.09, 0.04, 8),
    cyl( 0.38, -0.38, 0, 0.09, 0.04, 8),
    cyl(-0.38,  0.38, 0, 0.09, 0.04, 8),
    cyl( 0.38,  0.38, 0, 0.09, 0.04, 8),
  ], color: C_WOOD_DK, roughness: 0.60, name: 'legs' },
])

// ─── COFFEE TABLE  1.1 × 0.6 × 0.45 ─────────────────────────────────────────
// Stone/marble top + wood lower shelf + dark metal legs.
writeGLB('coffee-table', [
  { parts: [
    box(-0.55, 0.39, -0.30, 0.55, 0.45, 0.30),   // top slab
  ], color: [0.94, 0.93, 0.91, 1], roughness: 0.12, metallic: 0.02, name: 'top' },
  { parts: [
    box(-0.52, 0.12, -0.27, 0.52, 0.17, 0.27),   // lower shelf
  ], color: C_WOOD_LT, roughness: 0.65, name: 'shelf' },
  { parts: [
    cyl(-0.48, -0.26, 0, 0.39, 0.028, 8),
    cyl( 0.48, -0.26, 0, 0.39, 0.028, 8),
    cyl(-0.48,  0.26, 0, 0.39, 0.028, 8),
    cyl( 0.48,  0.26, 0, 0.39, 0.028, 8),
  ], color: [0.22, 0.22, 0.25, 1], roughness: 0.30, metallic: 0.6, name: 'legs' },
])

// ─── DINING TABLE  1.6 × 0.9 × 0.75 ─────────────────────────────────────────
writeGLB('dining-table', [
  { parts: [
    box(-0.80, 0.70, -0.45, 0.80, 0.75, 0.45),   // top
    box(-0.76, 0.64, -0.42, 0.76, 0.70, -0.38),  // apron back
    box(-0.76, 0.64,  0.38, 0.76, 0.70,  0.42),  // apron front
    box(-0.76, 0.64, -0.42, -0.72, 0.70, 0.42),  // apron left
    box( 0.72, 0.64, -0.42,  0.76, 0.70, 0.42),  // apron right
  ], color: C_WOOD_LT, name: 'top' },
  { parts: [
    cyl(-0.72, -0.40, 0, 0.64, 0.032, 10),
    cyl( 0.72, -0.40, 0, 0.64, 0.032, 10),
    cyl(-0.72,  0.40, 0, 0.64, 0.032, 10),
    cyl( 0.72,  0.40, 0, 0.64, 0.032, 10),
  ], color: C_WOOD_DK, roughness: 0.65, name: 'legs' },
])

// ─── DESK  1.4 × 0.7 × 0.75 ──────────────────────────────────────────────────
// Writing desk with a left-side pedestal (3 drawer panels) and a right leg.
writeGLB('desk', [
  { parts: [
    box(-0.70, 0.71, -0.35,  0.70, 0.75,  0.35),   // top
    box(-0.70,    0, -0.33, -0.42, 0.23,  0.33),    // drawer 1
    box(-0.70, 0.24, -0.33, -0.42, 0.47,  0.33),    // drawer 2
    box(-0.70, 0.48, -0.33, -0.42, 0.71,  0.33),    // drawer 3
    box(-0.62, 0.10, 0.30, -0.50, 0.12,  0.34),     // handle 1
    box(-0.62, 0.34, 0.30, -0.50, 0.36,  0.34),     // handle 2
    box(-0.62, 0.57, 0.30, -0.50, 0.59,  0.34),     // handle 3
    box( 0.62, 0.06, -0.30,  0.66, 0.10,  0.30),    // crossbar
  ], color: C_WOOD_DK, name: 'body' },
  { parts: [
    cyl( 0.64, -0.30, 0, 0.71, 0.030, 10),
    cyl( 0.64,  0.30, 0, 0.71, 0.030, 10),
  ], color: C_WOOD_LT, roughness: 0.65, name: 'legs' },
])

// ─── BED  2.0 × 1.6 × 0.6 ────────────────────────────────────────────────────
writeGLB('bed', [
  { parts: [
    box(-1.00, 0, -0.80, 1.00, 0.22, 0.80),         // base frame
    box(-1.00, 0.22, -0.80, 1.00, 0.60, -0.74),     // headboard
    box(-0.96, 0.25, -0.75, -0.04, 0.58, -0.74),    // headboard panel L
    box( 0.04, 0.25, -0.75,  0.96, 0.58, -0.74),    // headboard panel R
    box(-1.00, 0.22,  0.74, 1.00, 0.36, 0.80),      // footboard
    cyl(-0.98, -0.78, 0, 0.60, 0.045, 8),
    cyl( 0.98, -0.78, 0, 0.60, 0.045, 8),
    cyl(-0.98,  0.78, 0, 0.36, 0.045, 8),
    cyl( 0.98,  0.78, 0, 0.36, 0.045, 8),
  ], color: C_TEAL, name: 'frame' },
  { parts: [
    cushion(-0.97, 0.20, -0.77, 0.97, 0.44, 0.77, 0.018, 8, 6),  // mattress (starts at 0.20, not 0.22!)
    cushion(-0.80, 0.44, -0.76, -0.05, 0.54, -0.46, 0.030, 4, 3), // pillow L
    cushion( 0.05, 0.44, -0.76,  0.80, 0.54, -0.46, 0.030, 4, 3), // pillow R
  ], color: [0.95, 0.94, 0.92, 1], roughness: 0.85, name: 'mattress' },
])

// ─── BOOKSHELF  0.8 × 0.35 × 1.8 ────────────────────────────────────────────
writeGLB('bookshelf', [
  { parts: [
    box(-0.400,    0, -0.175, -0.365, 1.800,  0.175),
    box( 0.365,    0, -0.175,  0.400, 1.800,  0.175),
    box(-0.400,    0, -0.175,  0.400, 1.800, -0.155),
    box(-0.400,    0, -0.175,  0.400, 0.030,  0.175),
    box(-0.400, 0.40, -0.155,  0.400, 0.430,  0.175),
    box(-0.400, 0.80, -0.155,  0.400, 0.830,  0.175),
    box(-0.400, 1.20, -0.155,  0.400, 1.230,  0.175),
    box(-0.400, 1.77, -0.175,  0.400, 1.800,  0.175),
  ], color: C_WOOD_DK, name: 'frame' },
  { parts: [
    box(-0.370, 0.030, -0.140, -0.180, 0.390,  0.140),
    box(-0.150, 0.030, -0.140,  0.020, 0.350,  0.140),
    box( 0.050, 0.030, -0.140,  0.355, 0.360,  0.140),
    box(-0.370, 0.430, -0.140, -0.100, 0.770,  0.140),
    box(-0.070, 0.430, -0.140,  0.180, 0.800,  0.140),
    box( 0.210, 0.430, -0.140,  0.355, 0.790,  0.140),
    box(-0.370, 0.830, -0.140,  0.355, 1.175,  0.140),
    box(-0.370, 1.230, -0.140,  0.355, 1.560,  0.140),
  ], color: [0.45, 0.30, 0.18, 1], roughness: 0.85, name: 'books' },
])

// ─── WARDROBE  1.2 × 0.6 × 2.0 ──────────────────────────────────────────────
writeGLB('wardrobe', [
  { parts: [
    box(-0.600,    0, -0.300, -0.565, 2.000,  0.300),
    box( 0.565,    0, -0.300,  0.600, 2.000,  0.300),
    box(-0.600, 1.965, -0.300,  0.600, 2.000,  0.300),
    box(-0.600,    0, -0.300,  0.600, 0.040,  0.300),
    box(-0.600,    0, -0.300,  0.600, 2.000, -0.270),
    box(-0.560, 0.040, 0.260, -0.015, 1.962,  0.300),
    box( 0.015, 0.040, 0.260,  0.560, 1.962,  0.300),
    box(-0.015,    0, -0.300,  0.015, 2.000,  0.300),
  ], color: C_WOOD_DK, name: 'body' },
  { parts: [
    cyl(-0.070, 0.285, 0.95, 1.05, 0.012, 8),
    cyl( 0.070, 0.285, 0.95, 1.05, 0.012, 8),
  ], color: [0.85, 0.80, 0.72, 1], roughness: 0.30, metallic: 0.6, name: 'handles' },
])

// ─── RUG  2.0 × 1.4 × 0.01 ──────────────────────────────────────────────────
// Flat body + a thin border frame suggestion.
writeGLB('rug', [
  { parts: [box(-1.00, 0, -0.70, 1.00, 0.007, 0.70)], color: C_RUG, name: 'field' },
  { parts: [
    box(-1.00, 0.007, -0.70, 1.00, 0.010, -0.62),
    box(-1.00, 0.007,  0.62, 1.00, 0.010,  0.70),
    box(-1.00, 0.007, -0.62, -0.92, 0.010, 0.62),
    box( 0.92, 0.007, -0.62, 1.00, 0.010, 0.62),
  ], color: [0.50, 0.25, 0.08, 1], name: 'border' },
])

// ─── LAMP  0.4 × 0.4 × 1.5 ──────────────────────────────────────────────────
// Flat disc base + round pole + cone-ish shade (frusto-cone via stacked cylinders).
writeGLB('lamp', [
  { parts: [
    cyl(0, 0, 0, 0.035, 0.18, 16),    // base disc
    cyl(0, 0, 0.035, 1.10, 0.020, 8), // pole
  ], color: C_BRASS, roughness: 0.45, metallic: 0.5, name: 'base' },
  { parts: [
    cyl(0, 0, 1.10, 1.16, 0.040, 12),
    cyl(0, 0, 1.16, 1.22, 0.070, 12),
    cyl(0, 0, 1.22, 1.28, 0.100, 12),
    cyl(0, 0, 1.28, 1.36, 0.130, 12),
    cyl(0, 0, 1.36, 1.44, 0.160, 12),
    cyl(0, 0, 1.44, 1.50, 0.185, 12),
  ], color: [0.95, 0.90, 0.78, 1], roughness: 0.85, name: 'shade' },
])

// ─── TV  1.2 × 0.15 × 0.7 ────────────────────────────────────────────────────
// frame + screen + brushed-aluminium stand.
writeGLB('tv', [
  { parts: [
    box(-0.600, 0.085, -0.075, 0.600, 0.700, 0.075),   // display body
    box(-0.560, 0.085, -0.030, 0.560, 0.108, 0.040),   // thin bezel shelf
  ], color: C_TV, name: 'frame' },
  { parts: [
    box(-0.570, 0.110, -0.040, 0.570, 0.675, 0.000),   // screen panel
  ], color: [0.02, 0.02, 0.05, 1], roughness: 0.05, metallic: 0.1, name: 'screen' },
  { parts: [
    cyl(0, 0, 0, 0.09, 0.025, 8),                      // stand column
    box(-0.220, 0, -0.075, 0.220, 0.025, 0.075),       // stand base
  ], color: [0.65, 0.65, 0.68, 1], roughness: 0.25, metallic: 0.5, name: 'stand' },
])

// ─── LOVESEAT  1.40 × 0.85 × 0.85 ───────────────────────────────────────────
writeGLB('loveseat', [
  { parts: [
    box(-0.70, 0, -0.425,  0.70, 0.09,  0.425),                  // base
    box(-0.56, 0.09, -0.425, 0.56, 0.85, -0.38),                 // solid back panel
    box(-0.04, 0.09, -0.425, 0.04, 0.42,  0.425),                // seat gap divider
    box(-0.04, 0.42, -0.425, 0.04, 0.85, -0.13),                 // back gap divider
    box(-0.70, 0.09, -0.425, -0.56, 0.65,  0.425),               // left armrest
    box( 0.56, 0.09, -0.425,  0.70, 0.65,  0.425),               // right armrest
  ], color: C_UPHOLSTERY, roughness: 0.85, name: 'frame' },
  { parts: [
    cushion(-0.70, 0.09, -0.425, -0.04, 0.42, 0.425, 0.034),
    cushion( 0.04, 0.09, -0.425,  0.70, 0.42, 0.425, 0.034),
    backCushion(-0.70, 0.42, -0.425, -0.04, 0.85, -0.13, 0.030),
    backCushion( 0.04, 0.42, -0.425,  0.70, 0.85, -0.13, 0.030),
  ], color: [0.82, 0.74, 0.65, 1], roughness: 0.85, name: 'cushions' },
  { parts: [
    cyl(-0.62, -0.37, 0, 0.09, 0.050, 8),
    cyl( 0.62, -0.37, 0, 0.09, 0.050, 8),
    cyl(-0.62,  0.37, 0, 0.09, 0.050, 8),
    cyl( 0.62,  0.37, 0, 0.09, 0.050, 8),
  ], color: C_WOOD_DK, roughness: 0.60, name: 'legs' },
])

// ─── CHAISE LOUNGE  1.80 × 0.80 × 0.85 ──────────────────────────────────────
// Long seat (full length), back only on one end, raised head-end rest.
writeGLB('chaise', [
  { parts: [
    box(-0.90, 0, -0.40, 0.90, 0.09, 0.40),                     // base platform
    box(-0.90, 0.09, -0.40, -0.76, 0.65, 0.40),                 // armrest/back body
    box(-0.90, 0.09, 0.26, -0.76, 0.45, 0.40),                  // arm side fill
  ], color: C_UPHOLSTERY, roughness: 0.85, name: 'frame' },
  { parts: [
    cushion(-0.90, 0.09, -0.40, 0.90, 0.42, 0.40, 0.030, 8, 4), // seat cushion
    backCushion(-0.90, 0.42, -0.40, -0.72, 0.85, -0.10, 0.028), // back cushion
  ], color: [0.82, 0.74, 0.65, 1], roughness: 0.85, name: 'cushions' },
  { parts: [
    cyl(-0.82, -0.35, 0, 0.09, 0.045, 8),
    cyl( 0.82, -0.35, 0, 0.09, 0.045, 8),
    cyl(-0.82,  0.35, 0, 0.09, 0.045, 8),
    cyl( 0.82,  0.35, 0, 0.09, 0.045, 8),
  ], color: C_WOOD_DK, roughness: 0.60, name: 'legs' },
])

// ─── OTTOMAN  0.65 × 0.65 × 0.42 ────────────────────────────────────────────
writeGLB('ottoman', [
  { parts: [
    box(-0.325, 0, -0.325, 0.325, 0.06, 0.325),
    cushion(-0.325, 0.06, -0.325, 0.325, 0.42, 0.325, 0.028),
  ], color: C_UPHOLSTERY, roughness: 0.85, name: 'fabric' },
  { parts: [
    cyl(-0.27, -0.27, 0, 0.06, 0.028, 8),
    cyl( 0.27, -0.27, 0, 0.06, 0.028, 8),
    cyl(-0.27,  0.27, 0, 0.06, 0.028, 8),
    cyl( 0.27,  0.27, 0, 0.06, 0.028, 8),
  ], color: C_WOOD_DK, roughness: 0.60, name: 'legs' },
])

// ─── BENCH  1.20 × 0.45 × 0.48 ──────────────────────────────────────────────
writeGLB('bench', [
  { parts: [
    cushion(-0.60, 0.38, -0.225, 0.60, 0.48, 0.225, 0.018),
    box(-0.60, 0.32, -0.225, 0.60, 0.38, 0.225),
  ], color: C_UPHOLSTERY, roughness: 0.85, name: 'seat' },
  { parts: [
    box(-0.60, 0.06, -0.225, -0.54, 0.32, 0.225),
    box( 0.54, 0.06, -0.225,  0.60, 0.32, 0.225),
    box(-0.54, 0, -0.015, 0.54, 0.08, 0.015),
    cyl(-0.57, -0.19, 0, 0.06, 0.030, 8),
    cyl( 0.57, -0.19, 0, 0.06, 0.030, 8),
    cyl(-0.57,  0.19, 0, 0.06, 0.030, 8),
    cyl( 0.57,  0.19, 0, 0.06, 0.030, 8),
  ], color: C_WOOD_LT, roughness: 0.65, name: 'frame' },
])

// ─── POUF  0.65 × 0.65 × 0.40 ───────────────────────────────────────────────
writeGLB('pouf', [
  { parts: [cyl(0, 0, 0, 0.36, 0.295, 14)], color: C_UPHOLSTERY, roughness: 0.85, name: 'body' },
  { parts: [cushion(-0.295, 0.36, -0.295, 0.295, 0.40, 0.295, 0.022, 6, 6)], color: [0.85, 0.78, 0.68, 1], roughness: 0.9, name: 'top' },
])

// ─── DINING CHAIR  0.48 × 0.50 × 0.90 ───────────────────────────────────────
writeGLB('dining-chair', [
  { parts: [
    cushion(-0.24, 0.44, -0.25, 0.24, 0.54, 0.25, 0.020),
  ], color: C_UPHOLSTERY, roughness: 0.85, name: 'seat' },
  { parts: [
    box(-0.24, 0.54, -0.25, 0.24, 0.56, -0.18),
    box(-0.24, 0.80, -0.25, 0.24, 0.82, -0.18),
    box(-0.02, 0.56, -0.25, -0.00, 0.80, -0.18),
    box( 0.00, 0.56, -0.25,  0.02, 0.80, -0.18),
    box( 0.02, 0.56, -0.25,  0.04, 0.80, -0.18),
    cyl(-0.22, -0.23, 0, 0.44, 0.022, 8),
    cyl( 0.22, -0.23, 0, 0.44, 0.022, 8),
    cyl(-0.22,  0.23, 0, 0.44, 0.022, 8),
    cyl( 0.22,  0.23, 0, 0.44, 0.022, 8),
    box(-0.22, 0.14, -0.01, 0.22, 0.18, 0.01),
  ], color: C_WOOD_LT, roughness: 0.65, name: 'frame' },
])

// ─── OFFICE CHAIR  0.65 × 0.65 × 1.15 ───────────────────────────────────────
writeGLB('office-chair', [
  { parts: [
    box(-0.29, 0.42, -0.29, 0.29, 0.48, 0.29),
    cushion(-0.29, 0.48, -0.29, 0.29, 0.58, 0.29, 0.020),
    backCushion(-0.25, 0.58, -0.28, 0.25, 0.98, -0.22, 0.018),
    box(-0.27, 0.48, -0.30, -0.23, 0.60, -0.22),
    box( 0.23, 0.48, -0.30,  0.27, 0.60, -0.22),
    box(-0.31, 0.58, -0.22, -0.23, 0.62, 0.14),
    box( 0.23, 0.58, -0.22,  0.31, 0.62, 0.14),
  ], color: [0.18, 0.19, 0.21, 1], roughness: 0.85, name: 'fabric' },
  { parts: [
    cyl(0, 0, 0.08, 0.42, 0.036, 8),
    box(-0.30, 0, -0.020, 0.30, 0.055, 0.020),
    box(-0.020, 0, -0.30, 0.020, 0.055, 0.30),
    box(-0.020, 0, -0.30, 0.24, 0.055, 0.020),
    box(-0.24, 0, -0.020, 0.020, 0.055, 0.30),
    cyl(-0.28, 0, 0, 0.042, 0.025, 6),
    cyl( 0.28, 0, 0, 0.042, 0.025, 6),
    cyl(0, 0, -0.28, 0, 0.042, 0.025, 6),
    cyl(0, 0,  0.28, 0, 0.042, 0.025, 6),
  ], color: [0.25, 0.25, 0.28, 1], roughness: 0.50, metallic: 0.3, name: 'base' },
])

// ─── NIGHTSTAND  0.50 × 0.40 × 0.55 ─────────────────────────────────────────
writeGLB('nightstand', [
  { parts: [
    box(-0.25, 0.50, -0.20, 0.25, 0.55, 0.22),
    box(-0.25, 0, -0.20, 0.25, 0.50, 0.20),
    box(-0.23, 0.24, 0.19, -0.01, 0.46, 0.21),
    box( 0.01, 0.24, 0.19,  0.23, 0.46, 0.21),
  ], color: C_WOOD_LT, name: 'body' },
  { parts: [
    box(-0.07, 0.33, 0.20, 0.07, 0.35, 0.22),
  ], color: [0.85, 0.80, 0.72, 1], roughness: 0.30, metallic: 0.6, name: 'handle' },
])

// ─── CONSOLE TABLE  1.20 × 0.35 × 0.80 ──────────────────────────────────────
writeGLB('console-table', [
  { parts: [
    box(-0.60, 0.75, -0.175, 0.60, 0.80, 0.175),
    box(-0.60, 0.40, -0.160, 0.60, 0.44, 0.160),
  ], color: C_WOOD_LT, name: 'top' },
  { parts: [
    cyl(-0.55, -0.155, 0, 0.75, 0.028, 8),
    cyl( 0.55, -0.155, 0, 0.75, 0.028, 8),
    cyl(-0.55,  0.155, 0, 0.75, 0.028, 8),
    cyl( 0.55,  0.155, 0, 0.75, 0.028, 8),
  ], color: C_WOOD_DK, roughness: 0.65, name: 'legs' },
])

// ─── SIDE TABLE  0.55 × 0.55 × 0.55 ─────────────────────────────────────────
writeGLB('side-table', [
  { parts: [cyl(0, 0, 0.50, 0.55, 0.245, 16)], color: [0.88, 0.86, 0.82, 1], name: 'top' },
  { parts: [
    cyl(0, 0, 0.06, 0.50, 0.028, 8),
    box(-0.24, 0, -0.030, 0.24, 0.060, 0.030),
    box(-0.030, 0, -0.24, 0.030, 0.060, 0.24),
  ], color: [0.65, 0.60, 0.55, 1], roughness: 0.60, name: 'base' },
])

// ─── SINGLE BED  1.10 × 2.00 × 0.60 ─────────────────────────────────────────
writeGLB('single-bed', [
  { parts: [
    box(-0.55, 0, -1.00, 0.55, 0.22, 1.00),                  // base frame
    box(-0.55, 0.22, -1.00, 0.55, 0.60, -0.94),              // headboard
    box(-0.55, 0.22,  0.94, 0.55, 0.36,  1.00),              // footboard
    cyl(-0.53, -0.98, 0, 0.60, 0.038, 8),
    cyl( 0.53, -0.98, 0, 0.60, 0.038, 8),
    cyl(-0.53,  0.98, 0, 0.36, 0.038, 8),
    cyl( 0.53,  0.98, 0, 0.36, 0.038, 8),
  ], color: C_TEAL, name: 'frame' },
  { parts: [
    cushion(-0.52, 0.20, -0.97, 0.52, 0.44, 0.97, 0.016, 6, 8),  // mattress (starts at 0.20)
    cushion(-0.44, 0.44, -0.94, 0.44, 0.54, -0.64, 0.026, 3, 3), // pillow
  ], color: [0.95, 0.94, 0.92, 1], roughness: 0.85, name: 'mattress' },
])

// ─── FIREPLACE  1.20 × 0.30 × 1.00 ──────────────────────────────────────────
writeGLB('fireplace', [
  { parts: [
    box(-0.60, 0, -0.15, -0.46, 1.00, 0.15),
    box( 0.46, 0, -0.15,  0.60, 1.00, 0.15),
    box(-0.62, 0.95, -0.17, 0.62, 1.00, 0.18),
    box(-0.46, 0.72, -0.15, 0.46, 0.80, 0.00),
    box(-0.50, 0, 0.13, 0.50, 0.06, 0.16),
  ], color: [0.68, 0.66, 0.62, 1], name: 'surround' },
  { parts: [
    box(-0.44, 0.06, -0.13, 0.44, 0.70, -0.04),
  ], color: [0.08, 0.06, 0.05, 1], roughness: 0.95, name: 'firebox' },
])

// ─── RADIATOR  0.80 × 0.08 × 0.60  wall-mounted ─────────────────────────────
writeGLB('radiator', [
  { parts: [
    ...Array.from({ length: 7 }, (_, i) => box(-0.36 + i * 0.10, 0, -0.040, -0.30 + i * 0.10, 0.60, 0.040)),
    box(-0.38, 0.55, -0.042, 0.38, 0.60, 0.042),
    box(-0.38, 0, -0.042, 0.38, 0.05, 0.042),
  ], color: [0.91, 0.91, 0.91, 1], roughness: 0.40, metallic: 0.3, name: 'body' },
])

// ─── PICTURE FRAME  0.80 × 0.04 × 0.60  wall-mounted ────────────────────────
writeGLB('picture-frame', [
  { parts: [
    box(-0.40, 0, -0.020, 0.40, 0.60, 0.020),
    box(-0.40, 0, -0.010, -0.36, 0.60, 0.040),
    box( 0.36, 0, -0.010,  0.40, 0.60, 0.040),
    box(-0.40, 0.56, -0.010, 0.40, 0.60, 0.040),
    box(-0.40, 0, -0.010, 0.40, 0.04, 0.040),
  ], color: [0.28, 0.22, 0.14, 1], name: 'frame' },
  { parts: [
    box(-0.36, 0.04, 0.000, 0.36, 0.56, 0.012),
  ], color: [0.85, 0.80, 0.72, 1], roughness: 0.95, name: 'canvas' },
])

// ─── PLANT LARGE  0.50 × 0.50 × 1.50 ────────────────────────────────────────
writeGLB('plant-large', [
  { parts: [
    cyl(0, 0, 0, 0.08, 0.140, 12),
    cyl(0, 0, 0.08, 0.24, 0.160, 12),
    cyl(0, 0, 0.22, 0.26, 0.168, 12),
  ], color: [0.55, 0.42, 0.28, 1], roughness: 0.85, name: 'pot' },
  { parts: [
    cyl(0, 0, 0.26, 0.90, 0.028, 8),
    cyl(0, 0, 0.82, 1.50, 0.210, 14),
    cyl(-0.09, 0.05, 0.88, 1.28, 0.130, 10),
    cyl( 0.07,-0.04, 0.92, 1.32, 0.130, 10),
  ], color: [0.24, 0.50, 0.20, 1], roughness: 0.90, name: 'foliage' },
])

// ─── PLANT SMALL  0.25 × 0.25 × 0.40 ────────────────────────────────────────
writeGLB('plant-small', [
  { parts: [
    cyl(0, 0, 0, 0.11, 0.080, 10),
    cyl(0, 0, 0.09, 0.13, 0.084, 10),
  ], color: [0.55, 0.42, 0.28, 1], roughness: 0.85, name: 'pot' },
  { parts: [
    cyl(0, 0, 0.13, 0.40, 0.100, 12),
  ], color: [0.24, 0.50, 0.20, 1], roughness: 0.90, name: 'foliage' },
])

console.log('\nDone — 26 GLBs written (chair.glb is produced by process-sheenchair.mjs)')
