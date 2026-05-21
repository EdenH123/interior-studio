#!/usr/bin/env node
// scripts/generate-ikea-glbs.mjs
// Generates procedural GLB models for 16 IKEA catalog items.
//
// Conventions (same as other generate-*-glbs.mjs scripts):
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

function writeGLB(name, parts, color = [0.72, 0.65, 0.57, 1.0]) {
  const { positions, normals, indices } = merge(Array.isArray(parts) ? parts : [parts])

  const posF32 = new Float32Array(positions)
  const nrmF32 = new Float32Array(normals)
  const idxU16 = new Uint16Array(indices)

  const posBytes = posF32.byteLength
  const nrmBytes = nrmF32.byteLength
  const idxBytes = idxU16.byteLength
  const binLen   = posBytes + nrmBytes + idxBytes

  const bin = Buffer.alloc(binLen)
  Buffer.from(posF32.buffer).copy(bin, 0)
  Buffer.from(nrmF32.buffer).copy(bin, posBytes)
  Buffer.from(idxU16.buffer).copy(bin, posBytes + nrmBytes)

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

  const gltfJson = {
    asset: { version: '2.0', generator: 'interior-studio-ikea' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0, mode: 4 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0.0, roughnessFactor: 0.75 }, doubleSided: false }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vc, type: 'VEC3', min: pMin.map(r4), max: pMax.map(r4) },
      { bufferView: 1, componentType: 5126, count: vc, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: ic, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0,                byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes,          byteLength: nrmBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes+nrmBytes, byteLength: idxBytes, target: 34963 },
    ],
    buffers: [{ byteLength: binLen }],
  }

  const jsonBuf  = Buffer.from(JSON.stringify(gltfJson), 'utf8')
  const jsonPad  = (jsonBuf.length + 3) & ~3
  const jsonChunk = Buffer.alloc(jsonPad, 0x20)
  jsonBuf.copy(jsonChunk)

  const totalLen = 12 + 8 + jsonPad + 8 + binLen
  const out = Buffer.alloc(totalLen)
  let o = 0
  out.writeUInt32LE(0x46546C67, o); o += 4
  out.writeUInt32LE(2,          o); o += 4
  out.writeUInt32LE(totalLen,   o); o += 4
  out.writeUInt32LE(jsonPad,    o); o += 4
  out.writeUInt32LE(0x4E4F534A, o); o += 4
  jsonChunk.copy(out, o); o += jsonPad
  out.writeUInt32LE(binLen,     o); o += 4
  out.writeUInt32LE(0x004E4942, o); o += 4
  bin.copy(out, o)

  const path = resolve(OUT, name + '.glb')
  writeFileSync(path, out)
  const tris = ic / 3
  console.log(`  ✓  ${(name + '.glb').padEnd(30)}  ${(totalLen / 1024).toFixed(1).padStart(6)} kB  ${tris} tris`)
}

// ─── Color palette (linear sRGB) ──────────────────────────────────────────────
const C_IKEA_CREAM  = [0.65, 0.58, 0.42, 1]   // EKTORP beige
const C_POANG_WOOD  = [0.55, 0.38, 0.16, 1]   // POÄNG bentwood frame
const C_POANG_CUSH  = [0.80, 0.74, 0.60, 1]   // POÄNG cushion
const C_IKEA_WHITE  = [0.91, 0.91, 0.90, 1]   // BESTÅ / KALLAX / PAX / ALEX white
const C_BIRCH       = [0.72, 0.56, 0.32, 1]   // MALM / BILLY birch effect
const C_HEMNES      = [0.85, 0.83, 0.80, 1]   // HEMNES white stain

console.log('Generating IKEA GLBs…\n')

// ─── IKEA LIVING ──────────────────────────────────────────────────────────────

// EKTORP 2-seat sofa  W1.80 × D0.88 × H0.88  (-Z = back/wall side)
writeGLB('ikea-ektorp-2', [
  box(-0.90, 0,    -0.44,  0.90, 0.50,  0.44),    // seat/frame body
  box(-0.90, 0.50, -0.44, -0.72, 0.80,  0.44),    // left arm
  box( 0.72, 0.50, -0.44,  0.90, 0.80,  0.44),    // right arm
  box(-0.72, 0.50, -0.44,  0.72, 0.62,  0.44),    // seat cushion top
  box(-0.72, 0.62, -0.44,  0.72, 0.88, -0.24),    // back cushion
  cyl(-0.82, 0.36,  0, 0.06, 0.030, 8),           // front-left leg
  cyl( 0.82, 0.36,  0, 0.06, 0.030, 8),           // front-right leg
  cyl(-0.82,-0.36,  0, 0.06, 0.030, 8),           // back-left leg
  cyl( 0.82,-0.36,  0, 0.06, 0.030, 8),           // back-right leg
], C_IKEA_CREAM)

// EKTORP 3-seat sofa  W2.18 × D0.88 × H0.88
writeGLB('ikea-ektorp-3', [
  box(-1.09, 0,    -0.44,  1.09, 0.50,  0.44),
  box(-1.09, 0.50, -0.44, -0.91, 0.80,  0.44),    // left arm
  box( 0.91, 0.50, -0.44,  1.09, 0.80,  0.44),    // right arm
  box(-0.91, 0.50, -0.44,  0.91, 0.62,  0.44),    // seat cushion top
  box(-0.91, 0.62, -0.44,  0.91, 0.88, -0.24),    // back cushion
  cyl(-1.01, 0.36,  0, 0.06, 0.030, 8),
  cyl( 1.01, 0.36,  0, 0.06, 0.030, 8),
  cyl(-1.01,-0.36,  0, 0.06, 0.030, 8),
  cyl( 1.01,-0.36,  0, 0.06, 0.030, 8),
], C_IKEA_CREAM)

// POÄNG armchair  W0.82 × D0.82 × H1.00  (-Z = back/wall side)
// Bentwood frame: 2 curved arms + 2 front legs + 2 back leg-posts
writeGLB('ikea-poang', [
  // Frame (birch bentwood — modelled as boxes for simplicity)
  box(-0.41, 0,    -0.41, -0.35, 0.42,  0.41),    // left arm post (front section)
  box( 0.35, 0,    -0.41,  0.41, 0.42,  0.41),    // right arm post (front section)
  box(-0.41, 0.42, -0.41, -0.35, 0.46,  0.12),    // left arm rest
  box( 0.35, 0.42, -0.41,  0.41, 0.46,  0.12),    // right arm rest
  box(-0.41, 0.42, -0.41, -0.35, 1.00, -0.30),    // left back post
  box( 0.35, 0.42, -0.41,  0.41, 1.00, -0.30),    // right back post
  box(-0.41, 0.10, -0.41,  0.41, 0.14, -0.36),    // rear stretcher low
  box(-0.41, 0.30, -0.41,  0.41, 0.34, -0.36),    // rear stretcher high
  // Seat & back cushions (cream)
  box(-0.35, 0.42, -0.12,  0.35, 0.60,  0.41),    // seat cushion
  box(-0.35, 0.58, -0.41,  0.35, 1.00, -0.12),    // back cushion
], C_POANG_WOOD)

// LACK side table  W0.45 × D0.45 × H0.55
writeGLB('ikea-lack-side', [
  box(-0.225, 0.52, -0.225, 0.225, 0.55, 0.225),  // tabletop
  cyl(-0.175, -0.175, 0, 0.52, 0.022, 6),         // leg FL
  cyl( 0.175, -0.175, 0, 0.52, 0.022, 6),         // leg FR
  cyl(-0.175,  0.175, 0, 0.52, 0.022, 6),         // leg BL
  cyl( 0.175,  0.175, 0, 0.52, 0.022, 6),         // leg BR
], C_IKEA_WHITE)

// LACK coffee table  W0.90 × D0.55 × H0.45
writeGLB('ikea-lack-coffee', [
  box(-0.45, 0.42, -0.275, 0.45, 0.45, 0.275),    // tabletop
  cyl(-0.38, -0.22, 0, 0.42, 0.022, 6),           // leg FL
  cyl( 0.38, -0.22, 0, 0.42, 0.022, 6),           // leg FR
  cyl(-0.38,  0.22, 0, 0.42, 0.022, 6),           // leg BL
  cyl( 0.38,  0.22, 0, 0.42, 0.022, 6),           // leg BR
], C_IKEA_WHITE)

// BESTÅ TV unit 120cm  W1.20 × D0.40 × H0.64
writeGLB('ikea-besta-120', [
  box(-0.60, 0,    -0.20,  0.60, 0.64,  0.20),    // carcass
  box(-0.58, 0.02,  0.19, -0.04, 0.62,  0.21),    // left door
  box( 0.04, 0.02,  0.19,  0.58, 0.62,  0.21),    // right door
  box(-0.50, 0.30,  0.20, -0.38, 0.32,  0.22),    // left handle
  box( 0.38, 0.30,  0.20,  0.50, 0.32,  0.22),    // right handle
  cyl(-0.52,  0.16, 0, 0.05, 0.025, 6),           // leg FL
  cyl( 0.52,  0.16, 0, 0.05, 0.025, 6),           // leg FR
  cyl(-0.52, -0.16, 0, 0.05, 0.025, 6),           // leg BL
  cyl( 0.52, -0.16, 0, 0.05, 0.025, 6),           // leg BR
], C_IKEA_WHITE)

// BESTÅ TV unit 180cm  W1.80 × D0.40 × H0.64
writeGLB('ikea-besta-180', [
  box(-0.90, 0,    -0.20,  0.90, 0.64,  0.20),
  box(-0.88, 0.02,  0.19, -0.34, 0.62,  0.21),    // left door
  box(-0.26, 0.02,  0.19,  0.26, 0.62,  0.21),    // centre door
  box( 0.34, 0.02,  0.19,  0.88, 0.62,  0.21),    // right door
  box(-0.80, 0.30,  0.20, -0.68, 0.32,  0.22),
  box(-0.08, 0.30,  0.20,  0.08, 0.32,  0.22),
  box( 0.68, 0.30,  0.20,  0.80, 0.32,  0.22),
  cyl(-0.82,  0.16, 0, 0.05, 0.025, 6),
  cyl( 0.82,  0.16, 0, 0.05, 0.025, 6),
  cyl(-0.82, -0.16, 0, 0.05, 0.025, 6),
  cyl( 0.82, -0.16, 0, 0.05, 0.025, 6),
], C_IKEA_WHITE)

// ─── IKEA BEDROOM ─────────────────────────────────────────────────────────────

// MALM bed 140cm  W1.60 × D2.09 × H0.90  (-Z = headboard / wall side)
writeGLB('ikea-malm-bed-140', [
  box(-0.80, 0,    -1.045,  0.80, 0.26,  1.045),  // base platform
  box(-0.80, 0,    -1.045,  0.80, 0.90, -0.97),   // headboard slab
  box(-0.80, 0,     0.97,   0.80, 0.42,  1.045),  // footboard
  box(-0.80, 0.24, -0.97,  -0.73, 0.26,  0.97),   // left side rail
  box( 0.73, 0.24, -0.97,   0.80, 0.26,  0.97),   // right side rail
  box(-0.73, 0.26, -0.97,   0.73, 0.38,  0.97),   // mattress
], C_BIRCH)

// MALM bed 160cm  W1.75 × D2.09 × H0.90
writeGLB('ikea-malm-bed-160', [
  box(-0.875, 0,    -1.045,  0.875, 0.26,  1.045),
  box(-0.875, 0,    -1.045,  0.875, 0.90, -0.97),
  box(-0.875, 0,     0.97,   0.875, 0.42,  1.045),
  box(-0.875, 0.24, -0.97,  -0.805, 0.26,  0.97),
  box( 0.805, 0.24, -0.97,   0.875, 0.26,  0.97),
  box(-0.805, 0.26, -0.97,   0.805, 0.38,  0.97),
], C_BIRCH)

// MALM dresser 6-drawer  W0.80 × D0.48 × H1.23
writeGLB('ikea-malm-dresser', (() => {
  const parts = [box(-0.40, 0, -0.24, 0.40, 1.23, 0.24)]  // carcass
  const dH = (1.23 - 0.04) / 6  // drawer height
  for (let i = 0; i < 6; i++) {
    const y1 = 0.02 + i * dH
    const y2 = y1 + dH - 0.01
    parts.push(box(-0.38, y1, 0.23, 0.38, y2, 0.25))        // drawer face
    parts.push(box(-0.06, y1 + dH*0.4, 0.24, 0.06, y1 + dH*0.55, 0.26)) // handle
  }
  return parts
})(), C_BIRCH)

// HEMNES daybed  W0.80 × D2.05 × H0.83  (-Z = headboard / wall side)
writeGLB('ikea-hemnes-daybed', [
  box(-0.40, 0,    -1.025,  0.40, 0.83, -0.97),   // headboard
  box(-0.40, 0,     0.97,   0.40, 0.55,  1.025),  // footboard
  box(-0.40, 0,    -0.97,  -0.35, 0.55,  0.97),   // left side rail
  box( 0.35, 0,    -0.97,   0.40, 0.55,  0.97),   // right side rail
  box(-0.40, 0.05, -0.97,   0.40, 0.18,  0.97),   // base slats
  box(-0.37, 0.18, -0.97,   0.37, 0.32,  0.97),   // mattress
], C_HEMNES)

// ─── IKEA STORAGE ─────────────────────────────────────────────────────────────

// KALLAX 2×2  W0.77 × D0.39 × H0.77  (open front = +Z, no back panel so
// compartments appear dark/open — makes the 2×2 grid clearly visible in 3D)
writeGLB('ikea-kallax-2x2', [
  box(-0.385, 0,     -0.195,  0.385, 0.036, 0.195),  // bottom
  box(-0.385, 0.734, -0.195,  0.385, 0.770, 0.195),  // top
  box(-0.385, 0.036, -0.195, -0.349, 0.734, 0.195),  // left side
  box( 0.349, 0.036, -0.195,  0.385, 0.734, 0.195),  // right side
  box(-0.018, 0.036, -0.195,  0.018, 0.734, 0.195),  // vertical mid-divider
  box(-0.349, 0.367, -0.195,  0.349, 0.403, 0.195),  // horizontal mid-divider
], C_IKEA_WHITE)

// KALLAX 4×2  W1.47 × D0.39 × H0.77
writeGLB('ikea-kallax-4x2', [
  box(-0.735, 0,     -0.195,  0.735, 0.036, 0.195),  // bottom
  box(-0.735, 0.734, -0.195,  0.735, 0.770, 0.195),  // top
  box(-0.735, 0.036, -0.195, -0.699, 0.734, 0.195),  // left side
  box( 0.699, 0.036, -0.195,  0.735, 0.734, 0.195),  // right side
  // 3 vertical dividers — 4 equal columns across 1.47 m
  box(-0.3765, 0.036, -0.195, -0.3405, 0.734, 0.195),
  box(-0.018,  0.036, -0.195,  0.018,  0.734, 0.195),
  box( 0.3405, 0.036, -0.195,  0.3765, 0.734, 0.195),
  // horizontal mid-divider
  box(-0.699, 0.367, -0.195,  0.699, 0.403, 0.195),
], C_IKEA_WHITE)

// BILLY bookcase  W0.80 × D0.28 × H2.02  (open front = +Z, no back panel)
writeGLB('ikea-billy', (() => {
  const parts = [
    box(-0.40, 0,     -0.14,  0.40, 0.036, 0.14),   // bottom (36mm)
    box(-0.40, 1.984, -0.14,  0.40, 2.02,  0.14),   // top (36mm)
    box(-0.40, 0.036, -0.14, -0.364, 1.984, 0.14),  // left side (36mm)
    box( 0.364, 0.036,-0.14,  0.40, 1.984, 0.14),   // right side (36mm)
  ]
  // 4 shelves spanning full depth (visible from front and back)
  const shelfY = [0.38, 0.76, 1.14, 1.52]
  for (const y of shelfY) {
    parts.push(box(-0.364, y, -0.14, 0.364, y + 0.018, 0.14))
  }
  return parts
})(), C_BIRCH)

// PAX wardrobe 100cm  W1.00 × D0.58 × H2.01
writeGLB('ikea-pax-100', [
  box(-0.50, 0,     -0.29,  0.50, 0.036, 0.29),   // bottom (36mm)
  box(-0.50, 1.974, -0.29,  0.50, 2.01,  0.29),   // top (36mm)
  box(-0.50, 0.036, -0.29, -0.464, 1.974, 0.29),  // left side (36mm)
  box( 0.464, 0.036,-0.29,  0.50, 1.974, 0.29),   // right side (36mm)
  box(-0.50, 0,     -0.29,  0.50, 2.01, -0.254),  // back panel (36mm)
  // hanging rod
  cyl(0, 0, 0.55, 1.95, 0.012, 8),
  // 2 doors (full-height)
  box(-0.464, 0.036, 0.28, -0.04, 1.974, 0.30),   // left door
  box( 0.04,  0.036, 0.28,  0.464, 1.974, 0.30),  // right door
  box(-0.22, 1.00,  0.29, -0.10, 1.02,  0.31),    // left handle
  box( 0.10, 1.00,  0.29,  0.22, 1.02,  0.31),    // right handle
], C_IKEA_WHITE)

// ALEX drawer unit  W0.36 × D0.58 × H0.70
writeGLB('ikea-alex', (() => {
  const parts = [box(-0.18, 0, -0.29, 0.18, 0.70, 0.29)]  // carcass
  // 5 drawers, equal spacing
  const dH = (0.70 - 0.04) / 5
  for (let i = 0; i < 5; i++) {
    const y1 = 0.02 + i * dH
    const y2 = y1 + dH - 0.008
    parts.push(box(-0.16, y1, 0.28, 0.16, y2, 0.30))         // drawer face
    parts.push(box(-0.04, y1 + dH*0.38, 0.29, 0.04, y1 + dH*0.52, 0.31)) // handle
  }
  return parts
})(), C_IKEA_WHITE)

console.log('\nDone — 16 IKEA GLBs written.')
