#!/usr/bin/env node
// scripts/generate-ikea-glbs.mjs
// Generates procedural GLB models for 16 IKEA catalog items.
//
// Conventions:
//   X = [-W/2, W/2]   Y = [0, H]   Z = [-D/2, D/2]
//   -Z is back (wall-side); origin at floor bottom-centre.
//
// Run:  node scripts/generate-ikea-glbs.mjs

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/assets/furniture')
mkdirSync(OUT, { recursive: true })

// ─── primitive helpers ────────────────────────────────────────────────────────

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

// Seat cushion: subdivided top (+Y) face with smooth dome.
// Bump = sin(πu)·sin(πv) so it is exactly 0 at all edges — no seams.
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

// Back cushion: subdivided front (+Z) face with smooth dome.
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

// ─── Multi-material GLB writer ────────────────────────────────────────────────
// groups: Array of { parts: [...primitives], color: [r,g,b,a], roughness?, metallic? }
// Each group becomes a separate GLTF mesh primitive with its own material.
function writeGLB(name, groups) {
  const primitives = []
  const materials  = []
  const accessors  = []
  const bufViews   = []
  const chunks     = []
  let byteOffset   = 0
  let totalTris    = 0

  for (const { parts, color, roughness = 0.75, metallic = 0.0 } of groups) {
    const { positions, normals, indices } = merge(Array.isArray(parts) ? parts : [parts])

    const posF32 = new Float32Array(positions)
    const nrmF32 = new Float32Array(normals)
    const idxU16 = new Uint16Array(indices)

    const posBytes = posF32.byteLength
    const nrmBytes = nrmF32.byteLength
    const idxBytes = idxU16.byteLength
    // pad indices to 4-byte boundary so next group's positions start aligned
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

    materials.push({ pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: metallic, roughnessFactor: roughness }, doubleSided: false })
    primitives.push({ attributes: { POSITION: posAcc, NORMAL: nrmAcc }, indices: idxAcc, material: materials.length - 1, mode: 4 })
    chunks.push({ posF32, nrmF32, idxU16, idxPad })
  }

  // Assemble binary buffer
  const bin = Buffer.alloc(byteOffset)
  let off = 0
  for (const { posF32, nrmF32, idxU16, idxPad } of chunks) {
    Buffer.from(posF32.buffer).copy(bin, off); off += posF32.byteLength
    Buffer.from(nrmF32.buffer).copy(bin, off); off += nrmF32.byteLength
    Buffer.from(idxU16.buffer).copy(bin, off); off += idxU16.byteLength
    off += idxPad
  }

  const gltfJson = {
    asset: { version: '2.0', generator: 'interior-studio-ikea' },
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

  writeFileSync(resolve(OUT, name + '.glb'), out)
  console.log(`  ✓  ${(name + '.glb').padEnd(30)}  ${(totalLen / 1024).toFixed(1).padStart(6)} kB  ${totalTris} tris`)
}

// ─── Color palette (linear sRGB) ──────────────────────────────────────────────
const C_CREAM      = [0.65, 0.58, 0.42, 1]   // EKTORP sofa fabric (beige)
const C_DARK_LEG   = [0.28, 0.20, 0.10, 1]   // dark walnut/oak legs
const C_POANG_WOOD = [0.55, 0.38, 0.16, 1]   // POÄNG bentwood frame
const C_POANG_CUSH = [0.80, 0.74, 0.60, 1]   // POÄNG cushion (natural)
const C_WHITE      = [0.91, 0.91, 0.90, 1]   // IKEA white lacquer
const C_DOOR       = [0.84, 0.84, 0.82, 1]   // door/drawer panel (slightly warm)
const C_SILVER     = [0.72, 0.72, 0.74, 1]   // brushed steel handles & rods
const C_DARK_HW    = [0.22, 0.22, 0.24, 1]   // dark metal hardware
const C_BIRCH      = [0.72, 0.56, 0.32, 1]   // MALM / BILLY birch veneer
const C_BIRCH_LITE = [0.80, 0.65, 0.40, 1]   // lighter birch highlight
const C_HEMNES     = [0.85, 0.83, 0.80, 1]   // HEMNES white-stain pine
const C_MATTRESS   = [0.88, 0.88, 0.86, 1]   // mattress (light grey fabric)
const C_LEGS_WHT   = [0.82, 0.82, 0.80, 1]   // slightly-grey white for legs

// Material preset shortcuts: { roughness, metallic }
const FABRIC  = { roughness: 0.90, metallic: 0.0 }
const WOOD    = { roughness: 0.65, metallic: 0.0 }
const LACQUER = { roughness: 0.45, metallic: 0.0 }
const VENEER  = { roughness: 0.55, metallic: 0.0 }
const DOOR_M  = { roughness: 0.40, metallic: 0.0 }
const METAL   = { roughness: 0.20, metallic: 0.85 }
const DARK_HW = { roughness: 0.30, metallic: 0.70 }

console.log('Generating IKEA GLBs…\n')

// ─── IKEA LIVING ──────────────────────────────────────────────────────────────

// EKTORP 2-seat sofa  W1.80 × D0.88 × H0.88
writeGLB('ikea-ektorp-2', [
  { parts: [
    box(-0.90, 0,    -0.44,  0.90, 0.50,  0.44),           // seat frame / base
    box(-0.90, 0.50, -0.44, -0.72, 0.80,  0.44),           // left arm
    box( 0.72, 0.50, -0.44,  0.90, 0.80,  0.44),           // right arm
    cushion(-0.90, 0.50, -0.44, -0.02, 0.64, 0.44, 0.030), // left seat cushion
    cushion( 0.02, 0.50, -0.44,  0.90, 0.64, 0.44, 0.030), // right seat cushion
    backCushion(-0.72, 0.62, -0.44, -0.02, 0.88, -0.24, 0.026), // left back cushion
    backCushion( 0.02, 0.62, -0.44,  0.72, 0.88, -0.24, 0.026), // right back cushion
  ], color: C_CREAM, ...FABRIC },
  { parts: [
    cyl(-0.82,  0.36, 0, 0.06, 0.030, 8),
    cyl( 0.82,  0.36, 0, 0.06, 0.030, 8),
    cyl(-0.82, -0.36, 0, 0.06, 0.030, 8),
    cyl( 0.82, -0.36, 0, 0.06, 0.030, 8),
  ], color: C_DARK_LEG, ...WOOD },
])

// EKTORP 3-seat sofa  W2.18 × D0.88 × H0.88
writeGLB('ikea-ektorp-3', [
  { parts: [
    box(-1.09, 0,    -0.44,  1.09, 0.50,  0.44),           // seat frame
    box(-1.09, 0.50, -0.44, -0.91, 0.80,  0.44),           // left arm
    box( 0.91, 0.50, -0.44,  1.09, 0.80,  0.44),           // right arm
    cushion(-0.91, 0.50, -0.44, -0.32, 0.64, 0.44, 0.030), // left seat cushion
    cushion(-0.26, 0.50, -0.44,  0.26, 0.64, 0.44, 0.030), // centre seat cushion
    cushion( 0.32, 0.50, -0.44,  0.91, 0.64, 0.44, 0.030), // right seat cushion
    backCushion(-0.91, 0.62, -0.44, -0.32, 0.88, -0.24, 0.026),
    backCushion(-0.26, 0.62, -0.44,  0.26, 0.88, -0.24, 0.026),
    backCushion( 0.32, 0.62, -0.44,  0.91, 0.88, -0.24, 0.026),
  ], color: C_CREAM, ...FABRIC },
  { parts: [
    cyl(-1.01,  0.36, 0, 0.06, 0.030, 8),
    cyl( 1.01,  0.36, 0, 0.06, 0.030, 8),
    cyl(-1.01, -0.36, 0, 0.06, 0.030, 8),
    cyl( 1.01, -0.36, 0, 0.06, 0.030, 8),
  ], color: C_DARK_LEG, ...WOOD },
])

// POÄNG armchair  W0.82 × D0.82 × H1.00
writeGLB('ikea-poang', [
  { parts: [
    box(-0.41, 0,    -0.41, -0.35, 0.42,  0.41),    // left front post
    box( 0.35, 0,    -0.41,  0.41, 0.42,  0.41),    // right front post
    box(-0.41, 0.42, -0.41, -0.35, 0.46,  0.12),    // left arm rest
    box( 0.35, 0.42, -0.41,  0.41, 0.46,  0.12),    // right arm rest
    box(-0.41, 0.42, -0.41, -0.35, 1.00, -0.30),    // left back post
    box( 0.35, 0.42, -0.41,  0.41, 1.00, -0.30),    // right back post
    box(-0.41, 0.10, -0.41,  0.41, 0.14, -0.36),    // low stretcher
    box(-0.41, 0.30, -0.41,  0.41, 0.34, -0.36),    // high stretcher
  ], color: C_POANG_WOOD, ...WOOD },
  { parts: [
    cushion(-0.35, 0.42, -0.12, 0.35, 0.60, 0.41, 0.025),       // seat cushion
    backCushion(-0.35, 0.58, -0.41, 0.35, 1.00, -0.12, 0.022),  // back cushion
  ], color: C_POANG_CUSH, ...FABRIC },
])

// LACK side table  W0.45 × D0.45 × H0.55
writeGLB('ikea-lack-side', [
  { parts: [
    box(-0.225, 0.52, -0.225, 0.225, 0.55, 0.225),
  ], color: C_WHITE, ...LACQUER },
  { parts: [
    cyl(-0.175, -0.175, 0, 0.52, 0.022, 6),
    cyl( 0.175, -0.175, 0, 0.52, 0.022, 6),
    cyl(-0.175,  0.175, 0, 0.52, 0.022, 6),
    cyl( 0.175,  0.175, 0, 0.52, 0.022, 6),
  ], color: C_LEGS_WHT, ...LACQUER },
])

// LACK coffee table  W0.90 × D0.55 × H0.45
writeGLB('ikea-lack-coffee', [
  { parts: [
    box(-0.45, 0.42, -0.275, 0.45, 0.45, 0.275),
  ], color: C_WHITE, ...LACQUER },
  { parts: [
    cyl(-0.38, -0.22, 0, 0.42, 0.022, 6),
    cyl( 0.38, -0.22, 0, 0.42, 0.022, 6),
    cyl(-0.38,  0.22, 0, 0.42, 0.022, 6),
    cyl( 0.38,  0.22, 0, 0.42, 0.022, 6),
  ], color: C_LEGS_WHT, ...LACQUER },
])

// BESTÅ TV unit 120cm  W1.20 × D0.40 × H0.64
writeGLB('ikea-besta-120', [
  { parts: [
    box(-0.60, 0,    -0.20,  0.60, 0.64,  0.20),    // carcass
    cyl(-0.52,  0.16, 0, 0.05, 0.025, 6),
    cyl( 0.52,  0.16, 0, 0.05, 0.025, 6),
    cyl(-0.52, -0.16, 0, 0.05, 0.025, 6),
    cyl( 0.52, -0.16, 0, 0.05, 0.025, 6),
  ], color: C_WHITE, ...LACQUER },
  { parts: [
    box(-0.58, 0.02,  0.19, -0.04, 0.62,  0.21),    // left door
    box( 0.04, 0.02,  0.19,  0.58, 0.62,  0.21),    // right door
  ], color: C_DOOR, ...DOOR_M },
  { parts: [
    box(-0.50, 0.30,  0.20, -0.38, 0.32,  0.22),
    box( 0.38, 0.30,  0.20,  0.50, 0.32,  0.22),
  ], color: C_DARK_HW, ...DARK_HW },
])

// BESTÅ TV unit 180cm  W1.80 × D0.40 × H0.64
writeGLB('ikea-besta-180', [
  { parts: [
    box(-0.90, 0,    -0.20,  0.90, 0.64,  0.20),
    cyl(-0.82,  0.16, 0, 0.05, 0.025, 6),
    cyl( 0.82,  0.16, 0, 0.05, 0.025, 6),
    cyl(-0.82, -0.16, 0, 0.05, 0.025, 6),
    cyl( 0.82, -0.16, 0, 0.05, 0.025, 6),
  ], color: C_WHITE, ...LACQUER },
  { parts: [
    box(-0.88, 0.02,  0.19, -0.34, 0.62,  0.21),
    box(-0.26, 0.02,  0.19,  0.26, 0.62,  0.21),
    box( 0.34, 0.02,  0.19,  0.88, 0.62,  0.21),
  ], color: C_DOOR, ...DOOR_M },
  { parts: [
    box(-0.80, 0.30,  0.20, -0.68, 0.32,  0.22),
    box(-0.08, 0.30,  0.20,  0.08, 0.32,  0.22),
    box( 0.68, 0.30,  0.20,  0.80, 0.32,  0.22),
  ], color: C_DARK_HW, ...DARK_HW },
])

// ─── IKEA BEDROOM ─────────────────────────────────────────────────────────────

// MALM bed 140cm  W1.60 × D2.09 × H0.90
writeGLB('ikea-malm-bed-140', [
  { parts: [
    box(-0.80, 0,    -1.045,  0.80, 0.26,  1.045),  // base platform
    box(-0.80, 0,    -1.045,  0.80, 0.90, -0.97),   // headboard
    box(-0.80, 0,     0.97,   0.80, 0.42,  1.045),  // footboard
    box(-0.80, 0.24, -0.97,  -0.73, 0.26,  0.97),   // left rail
    box( 0.73, 0.24, -0.97,   0.80, 0.26,  0.97),   // right rail
  ], color: C_BIRCH, ...VENEER },
  { parts: [
    cushion(-0.73, 0.26, -0.97, 0.73, 0.38, 0.97, 0.016, 8, 6),  // mattress
  ], color: C_MATTRESS, ...{ roughness: 0.85, metallic: 0.0 } },
])

// MALM bed 160cm  W1.75 × D2.09 × H0.90
writeGLB('ikea-malm-bed-160', [
  { parts: [
    box(-0.875, 0,    -1.045,  0.875, 0.26,  1.045),
    box(-0.875, 0,    -1.045,  0.875, 0.90, -0.97),
    box(-0.875, 0,     0.97,   0.875, 0.42,  1.045),
    box(-0.875, 0.24, -0.97,  -0.805, 0.26,  0.97),
    box( 0.805, 0.24, -0.97,   0.875, 0.26,  0.97),
  ], color: C_BIRCH, ...VENEER },
  { parts: [
    cushion(-0.805, 0.26, -0.97, 0.805, 0.38, 0.97, 0.016, 8, 6),  // mattress
  ], color: C_MATTRESS, ...{ roughness: 0.85, metallic: 0.0 } },
])

// MALM dresser 6-drawer  W0.80 × D0.48 × H1.23
writeGLB('ikea-malm-dresser', (() => {
  const dH = (1.23 - 0.04) / 6
  const drawers = [], handles = []
  for (let i = 0; i < 6; i++) {
    const y1 = 0.02 + i * dH
    const y2 = y1 + dH - 0.01
    drawers.push(box(-0.38, y1, 0.23, 0.38, y2, 0.25))
    handles.push(box(-0.06, y1 + dH*0.4, 0.24, 0.06, y1 + dH*0.55, 0.26))
  }
  return [
    { parts: [box(-0.40, 0, -0.24, 0.40, 1.23, 0.24)], color: C_BIRCH, ...VENEER },
    { parts: drawers, color: C_BIRCH_LITE, ...DOOR_M },
    { parts: handles,  color: C_SILVER,    ...METAL },
  ]
})())

// HEMNES daybed  W0.80 × D2.05 × H0.83
writeGLB('ikea-hemnes-daybed', [
  { parts: [
    box(-0.40, 0,    -1.025,  0.40, 0.83, -0.97),   // headboard
    box(-0.40, 0,     0.97,   0.40, 0.55,  1.025),  // footboard
    box(-0.40, 0,    -0.97,  -0.35, 0.55,  0.97),   // left rail
    box( 0.35, 0,    -0.97,   0.40, 0.55,  0.97),   // right rail
    box(-0.40, 0.05, -0.97,   0.40, 0.18,  0.97),   // slats base
  ], color: C_HEMNES, ...WOOD },
  { parts: [
    box(-0.37, 0.18, -0.97,   0.37, 0.32,  0.97),   // mattress
  ], color: C_MATTRESS, ...{ roughness: 0.85, metallic: 0.0 } },
])

// ─── IKEA STORAGE ─────────────────────────────────────────────────────────────

// KALLAX 2×2  W0.77 × D0.39 × H0.77  (no back panel — open compartments show dark)
writeGLB('ikea-kallax-2x2', [
  { parts: [
    box(-0.385, 0,     -0.195,  0.385, 0.036, 0.195),  // bottom
    box(-0.385, 0.734, -0.195,  0.385, 0.770, 0.195),  // top
    box(-0.385, 0.036, -0.195, -0.349, 0.734, 0.195),  // left side
    box( 0.349, 0.036, -0.195,  0.385, 0.734, 0.195),  // right side
    box(-0.018, 0.036, -0.195,  0.018, 0.734, 0.195),  // vertical divider
    box(-0.349, 0.367, -0.195,  0.349, 0.403, 0.195),  // horizontal divider
  ], color: C_WHITE, ...LACQUER },
])

// KALLAX 4×2  W1.47 × D0.39 × H0.77  (no back panel)
writeGLB('ikea-kallax-4x2', [
  { parts: [
    box(-0.735, 0,     -0.195,  0.735, 0.036, 0.195),
    box(-0.735, 0.734, -0.195,  0.735, 0.770, 0.195),
    box(-0.735, 0.036, -0.195, -0.699, 0.734, 0.195),
    box( 0.699, 0.036, -0.195,  0.735, 0.734, 0.195),
    box(-0.3765, 0.036, -0.195, -0.3405, 0.734, 0.195),
    box(-0.018,  0.036, -0.195,  0.018,  0.734, 0.195),
    box( 0.3405, 0.036, -0.195,  0.3765, 0.734, 0.195),
    box(-0.699, 0.367, -0.195,  0.699, 0.403, 0.195),
  ], color: C_WHITE, ...LACQUER },
])

// BILLY bookcase  W0.80 × D0.28 × H2.02  (no back panel)
writeGLB('ikea-billy', (() => {
  const shelves = [0.38, 0.76, 1.14, 1.52].map(
    y => box(-0.364, y, -0.14, 0.364, y + 0.018, 0.14)
  )
  return [
    { parts: [
      box(-0.40, 0,     -0.14,  0.40, 0.036, 0.14),   // bottom
      box(-0.40, 1.984, -0.14,  0.40, 2.02,  0.14),   // top
      box(-0.40, 0.036, -0.14, -0.364, 1.984, 0.14),  // left side
      box( 0.364, 0.036,-0.14,  0.40, 1.984, 0.14),   // right side
    ], color: C_BIRCH, ...VENEER },
    { parts: shelves, color: C_BIRCH_LITE, ...VENEER },
  ]
})())

// PAX wardrobe 100cm  W1.00 × D0.58 × H2.01
writeGLB('ikea-pax-100', [
  { parts: [
    box(-0.50, 0,     -0.29,  0.50, 0.036, 0.29),   // bottom
    box(-0.50, 1.974, -0.29,  0.50, 2.01,  0.29),   // top
    box(-0.50, 0.036, -0.29, -0.464, 1.974, 0.29),  // left side
    box( 0.464, 0.036,-0.29,  0.50, 1.974, 0.29),   // right side
    box(-0.50, 0,     -0.29,  0.50, 2.01, -0.254),  // back panel
  ], color: C_WHITE, ...LACQUER },
  { parts: [
    box(-0.464, 0.036, 0.28, -0.04, 1.974, 0.30),   // left door
    box( 0.04,  0.036, 0.28,  0.464, 1.974, 0.30),  // right door
  ], color: C_DOOR, ...DOOR_M },
  { parts: [
    cyl(0, 0, 0.55, 1.95, 0.012, 8),                // hanging rod
  ], color: C_SILVER, ...METAL },
  { parts: [
    box(-0.22, 1.00, 0.29, -0.10, 1.02, 0.31),      // left handle
    box( 0.10, 1.00, 0.29,  0.22, 1.02, 0.31),      // right handle
  ], color: C_DARK_HW, ...DARK_HW },
])

// ALEX drawer unit  W0.36 × D0.58 × H0.70
writeGLB('ikea-alex', (() => {
  const dH = (0.70 - 0.04) / 5
  const drawers = [], handles = []
  for (let i = 0; i < 5; i++) {
    const y1 = 0.02 + i * dH
    const y2 = y1 + dH - 0.008
    drawers.push(box(-0.16, y1, 0.28, 0.16, y2, 0.30))
    handles.push(box(-0.04, y1 + dH*0.38, 0.29, 0.04, y1 + dH*0.52, 0.31))
  }
  return [
    { parts: [box(-0.18, 0, -0.29, 0.18, 0.70, 0.29)], color: C_WHITE,    ...LACQUER },
    { parts: drawers,                                    color: C_DOOR,     ...DOOR_M  },
    { parts: handles,                                    color: C_SILVER,   ...METAL   },
  ]
})())

// KLIPPAN loveseat  W1.80 × D0.88 × H0.66  (low-profile, chunky slab look)
writeGLB('ikea-klippan', [
  { parts: [
    box(-0.90, 0,    -0.44,  0.90, 0.44,  0.44),           // combined base+seat frame
    box(-0.90, 0.44, -0.44, -0.76, 0.66,  0.44),           // left arm (low)
    box( 0.76, 0.44, -0.44,  0.90, 0.66,  0.44),           // right arm (low)
    cushion(-0.76, 0.44, -0.44,  0.00, 0.56, 0.44, 0.028), // left seat cushion
    cushion( 0.00, 0.44, -0.44,  0.76, 0.56, 0.44, 0.028), // right seat cushion
    backCushion(-0.76, 0.54, -0.44,  0.00, 0.66, -0.24, 0.024),
    backCushion( 0.00, 0.54, -0.44,  0.76, 0.66, -0.24, 0.024),
  ], color: C_CREAM, ...FABRIC },
  { parts: [
    cyl(-0.82,  0.38, 0, 0.05, 0.028, 8),
    cyl( 0.82,  0.38, 0, 0.05, 0.028, 8),
    cyl(-0.82, -0.38, 0, 0.05, 0.028, 8),
    cyl( 0.82, -0.38, 0, 0.05, 0.028, 8),
  ], color: C_DARK_LEG, ...WOOD },
])

// SÖDERHAMN 3-seat  W2.34 × D0.99 × H0.83  (modern low sofa, open base)
writeGLB('ikea-soderhamn-3', [
  { parts: [
    box(-1.17, 0.08, -0.495,  1.17, 0.44,  0.495),         // seat platform
    cushion(-1.10, 0.44, -0.475, -0.40, 0.58, 0.475, 0.032),
    cushion(-0.34, 0.44, -0.475,  0.34, 0.58, 0.475, 0.032),
    cushion( 0.40, 0.44, -0.475,  1.10, 0.58, 0.475, 0.032),
    backCushion(-1.10, 0.56, -0.495, -0.40, 0.83, -0.22, 0.026),
    backCushion(-0.34, 0.56, -0.495,  0.34, 0.83, -0.22, 0.026),
    backCushion( 0.40, 0.56, -0.495,  1.10, 0.83, -0.22, 0.026),
  ], color: [0.74, 0.66, 0.55, 1], ...FABRIC },  // warm linen
  { parts: [
    box(-1.17, 0,    -0.495, -1.07, 0.08, 0.495),          // left end panel
    box( 1.07, 0,    -0.495,  1.17, 0.08, 0.495),          // right end panel
    box(-1.07, 0,    -0.495,  1.07, 0.08, -0.385),         // back base rail
    box(-1.07, 0,     0.385,  1.07, 0.08,  0.495),         // front base rail
  ], color: C_BIRCH, ...VENEER },
])

// HEMNES dresser 8-drawer  W1.60 × D0.50 × H0.99
writeGLB('ikea-hemnes-dresser', (() => {
  const dH = (0.99 - 0.05) / 4   // 4 rows, each with 2 drawers
  const drawers = [], handles = []
  for (let row = 0; row < 4; row++) {
    const y1 = 0.025 + row * dH
    const y2 = y1 + dH - 0.012
    // left drawer
    drawers.push(box(-0.78, y1, 0.24, -0.02, y2, 0.26))
    handles.push(box(-0.56, y1 + dH*0.38, 0.25, -0.24, y1 + dH*0.52, 0.27))
    // right drawer
    drawers.push(box( 0.02, y1, 0.24,  0.78, y2, 0.26))
    handles.push(box( 0.24, y1 + dH*0.38, 0.25,  0.56, y1 + dH*0.52, 0.27))
  }
  return [
    { parts: [box(-0.80, 0, -0.25, 0.80, 0.99, 0.25)], color: C_HEMNES, ...WOOD },
    { parts: drawers, color: [0.80, 0.78, 0.74, 1], ...DOOR_M },
    { parts: handles, color: C_SILVER, ...METAL },
  ]
})())

// KALLAX 1×4 tall  W0.39 × D0.39 × H1.47  (vertical tower variant)
writeGLB('ikea-kallax-1x4', [
  { parts: [
    box(-0.195, 0,     -0.195,  0.195, 0.036, 0.195),  // bottom
    box(-0.195, 1.434, -0.195,  0.195, 1.470, 0.195),  // top
    box(-0.195, 0.036, -0.195, -0.159, 1.434, 0.195),  // left side
    box( 0.159, 0.036, -0.195,  0.195, 1.434, 0.195),  // right side
    box(-0.159, 0.385, -0.195,  0.159, 0.421, 0.195),  // divider 1
    box(-0.159, 0.735, -0.195,  0.159, 0.771, 0.195),  // divider 2
    box(-0.159, 1.085, -0.195,  0.159, 1.121, 0.195),  // divider 3
  ], color: C_WHITE, ...LACQUER },
])

// LISABO desk  W1.40 × D0.65 × H0.74  (ash veneer, distinctive tapered X-legs)
writeGLB('ikea-lisabo-desk', [
  { parts: [
    box(-0.70, 0.70, -0.325, 0.70, 0.74, 0.325),       // top
  ], color: [0.78, 0.64, 0.46, 1], ...VENEER },        // ash veneer
  { parts: [
    // X-frame legs: two diagonal planks crossing at centre per end
    box(-0.68, 0, -0.02,  0.68, 0.06, 0.02),           // horizontal stretcher
    cyl(-0.62, -0.30, 0, 0.70, 0.028, 8),
    cyl( 0.62, -0.30, 0, 0.70, 0.028, 8),
    cyl(-0.62,  0.30, 0, 0.70, 0.028, 8),
    cyl( 0.62,  0.30, 0, 0.70, 0.028, 8),
  ], color: C_DARK_HW, ...DARK_HW },
])

console.log('\nDone — 21 IKEA GLBs written.')
