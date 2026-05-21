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
    asset: { version: '2.0', generator: 'interior-studio-bathroom-kitchen' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0, mode: 4 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0.0, roughnessFactor: 0.7 }, doubleSided: false }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vc, type: 'VEC3', min: pMin.map(r4), max: pMax.map(r4) },
      { bufferView: 1, componentType: 5126, count: vc, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: ic, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0,              byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes,        byteLength: nrmBytes, target: 34962 },
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
  console.log(`  ✓  ${(name + '.glb').padEnd(26)}  ${(totalLen / 1024).toFixed(1).padStart(6)} kB  ${tris} tris`)
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

// TOILET  0.38 × 0.70 × 0.80   (-Z = wall / tank side)
writeGLB('toilet', [
  cyl(0, 0, 0, 0.36, 0.13, 12),                       // pedestal base
  box(-0.17, 0.14, -0.05, 0.17, 0.35, 0.32),          // bowl body
  box(-0.18, 0.33, -0.06, 0.18, 0.36, 0.33),          // seat lid
  box(-0.15, 0.34, -0.35, 0.15, 0.78, -0.08),         // tank body
  box(-0.17, 0.76, -0.37, 0.17, 0.80, -0.06),         // tank lid
], C_WHITE)

// BASIN  0.55 × 0.45 × 0.85
writeGLB('basin', [
  cyl(0, 0, 0, 0.65, 0.07, 10),                       // column
  box(-0.27, 0.75, -0.22, 0.27, 0.85, 0.22),          // basin bowl outer
  cyl(0, -0.15, 0.83, 0.89, 0.014, 8),                // tap riser (at -Z)
  box(-0.007, 0.87, -0.15, 0.007, 0.89, -0.04),       // tap spout (toward +Z)
  box( 0.04, 0.872, -0.18,  0.08, 0.888, -0.13),      // hot handle
  box(-0.08, 0.872, -0.18, -0.04, 0.888, -0.13),      // cold handle
], C_WHITE)

// BATHTUB  1.70 × 0.75 × 0.55  (-Z = wall side)
writeGLB('bathtub', [
  box(-0.85, 0,    -0.375,  0.85, 0.08,  0.375),      // base floor
  box(-0.85, 0.08, -0.375, -0.79, 0.55,  0.375),      // left wall
  box( 0.79, 0.08, -0.375,  0.85, 0.55,  0.375),      // right wall
  box(-0.85, 0.08, -0.375,  0.85, 0.55, -0.31),       // back wall (wall side)
  box(-0.85, 0.08,  0.31,   0.85, 0.55,  0.375),      // front wall
  box(-0.85, 0.52, -0.375,  0.85, 0.55,  0.375),      // rim cap
  cyl( 0.60, -0.30, 0.48, 0.54, 0.018, 8),            // hot tap
  cyl( 0.40, -0.30, 0.48, 0.54, 0.018, 8),            // cold tap
], C_WHITE)

// SHOWER TRAY  0.90 × 0.90 × 0.15
writeGLB('shower-tray', [
  box(-0.45, 0,    -0.45,  0.45, 0.06,  0.45),        // base
  box(-0.45, 0.06, -0.45, -0.41, 0.15,  0.45),        // left rim
  box( 0.41, 0.06, -0.45,  0.45, 0.15,  0.45),        // right rim
  box(-0.45, 0.06, -0.45,  0.45, 0.15, -0.41),        // back rim
  box(-0.45, 0.06,  0.41,  0.45, 0.15,  0.45),        // front rim
  cyl(0, 0, 0.06, 0.07, 0.030, 8),                    // drain
], C_WHITE)

// TOWEL RACK  0.60 × 0.08 × 0.04  wallMounted  (-Z = wall)
writeGLB('towel-rack', [
  box(-0.30, 0.005, -0.04, -0.26, 0.035,  0.03),      // left bracket
  box( 0.26, 0.005, -0.04,  0.30, 0.035,  0.03),      // right bracket
  box(-0.26, 0.014,  0.024,  0.26, 0.026,  0.038),    // bar
], C_CHROME)

// BATHROOM MIRROR  0.60 × 0.05 × 0.80  wallMounted  (-Z = wall)
writeGLB('bathroom-mirror', [
  box(-0.30, 0, -0.025, 0.30, 0.80,  0.010),          // backing / frame
  box(-0.27, 0.03, 0.008, 0.27, 0.77, 0.018),         // mirror face
], C_MIRROR)

// VANITY UNIT  0.90 × 0.50 × 0.85
writeGLB('vanity-unit', [
  box(-0.45, 0,    -0.25,  0.45, 0.72,  0.25),        // cabinet body
  box(-0.45, 0.72, -0.25,  0.45, 0.77,  0.25),        // countertop
  box(-0.20, 0.76, -0.15,  0.20, 0.85,  0.15),        // integrated basin
  box(-0.43, 0.02,  0.24, -0.03, 0.70,  0.26),        // left door
  box( 0.03, 0.02,  0.24,  0.43, 0.70,  0.26),        // right door
  box(-0.45, 0.72, -0.25,  0.45, 0.85, -0.22),        // backsplash
  box(-0.25, 0.34,  0.25, -0.14, 0.36,  0.27),        // left handle
  box( 0.14, 0.34,  0.25,  0.25, 0.36,  0.27),        // right handle
], C_WHITE)

// LAUNDRY BASKET  0.45 × 0.40 × 0.55
writeGLB('laundry-basket', [
  box(-0.22, 0,    -0.20,  0.22, 0.50,  0.20),        // body
  box(-0.23, 0.48, -0.21,  0.23, 0.55,  0.21),        // lid
  box(-0.22, 0.12,  0.19,  0.22, 0.14,  0.20),        // weave band 1
  box(-0.22, 0.25,  0.19,  0.22, 0.27,  0.20),        // weave band 2
  box(-0.22, 0.38,  0.19,  0.22, 0.40,  0.20),        // weave band 3
], C_WICKER)

// ─── KITCHEN ──────────────────────────────────────────────────────────────────

// KITCHEN SINK  0.80 × 0.60 × 0.90
writeGLB('kitchen-sink', [
  box(-0.40, 0,    -0.30,  0.40, 0.82,  0.30),        // cabinet body
  box(-0.38, 0.02,  0.29,  0.38, 0.80,  0.31),        // cabinet door
  box(-0.16, 0.40,  0.30,  0.16, 0.42,  0.32),        // door handle
  box(-0.40, 0.82, -0.30,  0.40, 0.86,  0.30),        // countertop
  box(-0.32, 0.84, -0.22,  0.32, 0.90,  0.18),        // sink basin
  cyl(0, -0.16, 0.85, 0.93, 0.013, 8),                // tap riser
  box(-0.007, 0.92, -0.16, 0.007, 0.94, -0.06),       // tap spout
], C_STAINLESS)

// FRIDGE  0.70 × 0.70 × 1.85
writeGLB('fridge', [
  box(-0.35, 0,    -0.35,  0.35, 1.85,  0.35),        // body
  box(-0.33, 0.02,  0.34,  0.33, 0.85,  0.36),        // lower fridge door
  box(-0.33, 0.87,  0.34,  0.33, 1.83,  0.36),        // upper freezer door
  box( 0.18, 0.40,  0.35,  0.22, 0.60,  0.38),        // lower handle
  box( 0.18, 1.20,  0.35,  0.22, 1.40,  0.38),        // upper handle
], C_CHROME)

// OVEN  0.60 × 0.60 × 0.90
writeGLB('oven', [
  box(-0.30, 0,    -0.30,  0.30, 0.90,  0.30),        // body
  box(-0.28, 0.02,  0.29,  0.28, 0.72,  0.31),        // oven door
  box(-0.22, 0.08,  0.30,  0.22, 0.60,  0.32),        // glass window
  box(-0.18, 0.64,  0.30,  0.18, 0.66,  0.33),        // door handle
  box(-0.28, 0.72,  0.28,  0.28, 0.85,  0.31),        // control panel
  cyl(-0.12, -0.12, 0.87, 0.90, 0.068, 12),           // hob ring BL
  cyl( 0.12, -0.12, 0.87, 0.90, 0.068, 12),           // hob ring BR
  cyl(-0.12,  0.12, 0.87, 0.90, 0.068, 12),           // hob ring FL
  cyl( 0.12,  0.12, 0.87, 0.90, 0.068, 12),           // hob ring FR
], C_DARK_GRY)

// DISHWASHER  0.60 × 0.60 × 0.85
writeGLB('dishwasher', [
  box(-0.30, 0,    -0.30,  0.30, 0.85,  0.30),        // body
  box(-0.28, 0.02,  0.29,  0.28, 0.80,  0.31),        // door panel
  box(-0.28, 0.80,  0.28,  0.28, 0.85,  0.31),        // control strip
  box(-0.18, 0.74,  0.30,  0.18, 0.76,  0.32),        // handle
], C_DARK_GRY)

// MICROWAVE  0.55 × 0.35 × 0.32  wallMounted  (-Z = wall)
writeGLB('microwave', [
  box(-0.27, 0,    -0.175, 0.27, 0.32,  0.175),       // body
  box(-0.25, 0.03,  0.165, 0.07, 0.29,  0.185),       // glass door window
  box( 0.09, 0.03,  0.165, 0.25, 0.29,  0.185),       // control panel
  box(-0.23, 0.00,  0.175, 0.05, 0.02,  0.195),       // door handle
], C_DARK_GRY)

// UPPER CABINET  0.60 × 0.35 × 0.70  wallMounted  (-Z = wall)
writeGLB('upper-cabinet', [
  box(-0.30, 0,    -0.175, 0.30, 0.70,  0.175),       // body
  box(-0.28, 0.02,  0.165, 0.28, 0.68,  0.185),       // door
  box(-0.14, 0.33,  0.175, 0.14, 0.35,  0.195),       // handle
], C_CABINET)

// RANGE HOOD  0.60 × 0.40 × 0.35  wallMounted  (-Z = wall)
writeGLB('range-hood', [
  box(-0.30, 0.12, -0.20,  0.30, 0.35,  0.20),        // upper hood box
  box(-0.24, 0.00, -0.16,  0.24, 0.12,  0.16),        // lower funnel
  box(-0.28, 0.12,  0.18,  0.28, 0.33,  0.21),        // front panel
  box(-0.22, 0.01, -0.15,  0.22, 0.03,  0.15),        // filter grille
], C_STAINLESS)

// KITCHEN ISLAND  1.50 × 0.80 × 0.90
writeGLB('kitchen-island', [
  box(-0.75, 0,    -0.40,  0.75, 0.82,  0.40),        // cabinet body
  box(-0.77, 0.82, -0.42,  0.77, 0.90,  0.42),        // countertop (slight overhang)
  box(-0.73, 0.02,  0.39, -0.03, 0.80,  0.41),        // front left door
  box( 0.03, 0.02,  0.39,  0.73, 0.80,  0.41),        // front right door
  box(-0.73, 0.02, -0.41, -0.03, 0.80, -0.39),        // back left door
  box( 0.03, 0.02, -0.41,  0.73, 0.80, -0.39),        // back right door
  box(-0.60, 0.39,  0.40, -0.50, 0.41,  0.42),        // front handle L
  box( 0.50, 0.39,  0.40,  0.60, 0.41,  0.42),        // front handle R
], C_CABINET)

// PANTRY UNIT  0.60 × 0.60 × 2.00
writeGLB('pantry-unit', [
  box(-0.30, 0,    -0.30,  0.30, 2.00,  0.30),        // carcass
  box(-0.28, 0.02,  0.29,  0.28, 0.98,  0.31),        // lower door
  box(-0.28, 1.02,  0.29,  0.28, 1.98,  0.31),        // upper door
  box(-0.30, 0.98,  0.28,  0.30, 1.02,  0.31),        // middle rail
  box( 0.15, 0.48,  0.30,  0.23, 0.50,  0.32),        // lower handle
  box( 0.15, 1.48,  0.30,  0.23, 1.50,  0.32),        // upper handle
], C_CABINET)

// BAR STOOL  0.40 × 0.40 × 0.75
writeGLB('bar-stool', [
  cyl(0, 0, 0.68, 0.75, 0.185, 12),                   // seat disc
  cyl(0, 0, 0.06, 0.68, 0.033,  8),                   // central column
  box(-0.19, 0,    -0.025, 0.19, 0.055,  0.025),      // base X arm
  box(-0.025, 0,   -0.19,  0.025, 0.055, 0.19),       // base Z arm
  box(-0.13, 0.35, -0.018, 0.13, 0.375,  0.018),      // foot-rest X
  box(-0.018, 0.35,-0.13,  0.018, 0.375, 0.13),       // foot-rest Z
], C_WOOD_LT)

console.log('\nDone — 18 GLBs written.')
