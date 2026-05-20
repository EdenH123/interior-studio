#!/usr/bin/env node
// scripts/generate-furniture-glbs.mjs
// Generates procedural CC0 GLB models for every furniture catalog item.
// Each model is assembled from box primitives merged into one flat mesh.
// All geometry is designed at exact catalog dimensions so fitToBox() in
// the pipeline applies a 1:1:1 scale (no distortion).
//
// Conventions:
//   • X = [-W/2, W/2]  (centred)
//   • Y = [0, H]       (bottom at origin — Three.js +Y is up)
//   • Z = [-D/2, D/2]  (centred; -Z is the back/wall side)
//
// Run:  node scripts/generate-furniture-glbs.mjs

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/assets/furniture')
mkdirSync(OUT, { recursive: true })

// ─── geometry helpers ────────────────────────────────────────────────────────

// Returns { positions, normals } (flat Float32 arrays) for one axis-aligned box.
// Vertex winding is CCW when viewed from outside each face (verified via
// cross-product: (v1-v0)×(v2-v0) points outward on all 6 faces).
function boxMesh(x1, y1, z1, x2, y2, z2) {
  const positions = [
    // +X face  (normal +X)
    x2, y1, z1,  x2, y2, z1,  x2, y2, z2,  x2, y1, z2,
    // -X face  (normal -X)
    x1, y1, z2,  x1, y2, z2,  x1, y2, z1,  x1, y1, z1,
    // +Y face  (normal +Y)
    x1, y2, z2,  x2, y2, z2,  x2, y2, z1,  x1, y2, z1,
    // -Y face  (normal -Y)
    x1, y1, z1,  x2, y1, z1,  x2, y1, z2,  x1, y1, z2,
    // +Z face  (normal +Z)
    x2, y1, z2,  x2, y2, z2,  x1, y2, z2,  x1, y1, z2,
    // -Z face  (normal -Z)
    x1, y1, z1,  x1, y2, z1,  x2, y2, z1,  x2, y1, z1,
  ]
  const normals = [
     1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
    -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
     0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
     0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,
     0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
     0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,
  ]
  return { positions, normals }
}

function boxIndices(base) {
  const idx = []
  for (let f = 0; f < 6; f++) {
    const b = base + f * 4
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }
  return idx
}

// Merge an array of box definitions [[x1,y1,z1, x2,y2,z2], ...] into one mesh.
function mergeMeshes(boxes) {
  const positions = [], normals = [], indices = []
  let base = 0
  for (const b of boxes) {
    const m = boxMesh(...b)
    positions.push(...m.positions)
    normals.push(...m.normals)
    indices.push(...boxIndices(base))
    base += 24
  }
  return { positions, normals, indices }
}

// ─── GLB writer ──────────────────────────────────────────────────────────────

// Writes a valid GLB 2.0 file to OUT/<name>.glb.
// color = [r, g, b, a] in linear space (0–1).
function writeGLB(name, boxes, color = [0.72, 0.65, 0.57, 1.0]) {
  const { positions, normals, indices } = mergeMeshes(boxes)

  const posF32 = new Float32Array(positions)
  const nrmF32 = new Float32Array(normals)
  const idxU16 = new Uint16Array(indices)

  // For N boxes: 288N + 288N + 72N = 648N bytes — always divisible by 4.
  const posBytes = posF32.byteLength
  const nrmBytes = nrmF32.byteLength
  const idxBytes = idxU16.byteLength
  const binLen   = posBytes + nrmBytes + idxBytes

  const bin = Buffer.alloc(binLen)
  Buffer.from(posF32.buffer).copy(bin, 0)
  Buffer.from(nrmF32.buffer).copy(bin, posBytes)
  Buffer.from(idxU16.buffer).copy(bin, posBytes + nrmBytes)

  // AABB for the POSITION accessor (required by the spec).
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
    asset: { version: '2.0', generator: 'interior-studio-gen' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2,
        material: 0,
        mode: 4,   // TRIANGLES
      }],
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: color,
        metallicFactor: 0.0,
        roughnessFactor: 0.8,
      },
      doubleSided: false,
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vc, type: 'VEC3',
        min: pMin.map(r4), max: pMax.map(r4) },
      { bufferView: 1, componentType: 5126, count: vc, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: ic, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0,                     byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes,               byteLength: nrmBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes + nrmBytes,    byteLength: idxBytes, target: 34963 },
    ],
    buffers: [{ byteLength: binLen }],
  }

  // JSON chunk — pad to 4-byte boundary with spaces (0x20 per spec).
  const jsonBuf = Buffer.from(JSON.stringify(gltfJson), 'utf8')
  const jsonPad = (jsonBuf.length + 3) & ~3
  const jsonChunk = Buffer.alloc(jsonPad, 0x20)
  jsonBuf.copy(jsonChunk)

  const totalLen = 12 + 8 + jsonPad + 8 + binLen
  const out = Buffer.alloc(totalLen)
  let o = 0

  // GLB header
  out.writeUInt32LE(0x46546C67, o); o += 4  // magic 'glTF'
  out.writeUInt32LE(2,          o); o += 4  // version
  out.writeUInt32LE(totalLen,   o); o += 4  // file length

  // JSON chunk
  out.writeUInt32LE(jsonPad,     o); o += 4  // chunk length
  out.writeUInt32LE(0x4E4F534A,  o); o += 4  // type 'JSON'
  jsonChunk.copy(out, o);            o += jsonPad

  // BIN chunk
  out.writeUInt32LE(binLen,      o); o += 4  // chunk length
  out.writeUInt32LE(0x004E4942,  o); o += 4  // type 'BIN\0'
  bin.copy(out, o)

  const path = resolve(OUT, name + '.glb')
  writeFileSync(path, out)
  const tris = ic / 3
  console.log(`  ✓  ${(name + '.glb').padEnd(22)}  ${(totalLen / 1024).toFixed(1).padStart(5)} kB  ${tris} triangles`)
}

// ─── furniture definitions ───────────────────────────────────────────────────
// All dimensions in meters, matching furnitureCatalog.js exactly.
// Each box: [x1, y1, z1,  x2, y2, z2]  (min corner, max corner)

const WARM_GRAY  = [0.72, 0.65, 0.57, 1]  // upholstered (sofa, chair, armchair)
const WOOD_LT    = [0.71, 0.52, 0.31, 1]  // light wood (coffee table, dining table)
const WOOD_DK    = [0.56, 0.38, 0.21, 1]  // dark wood (desk, bookshelf, wardrobe)
const TEAL       = [0.40, 0.64, 0.59, 1]  // bed
const AMBER      = [0.78, 0.52, 0.22, 1]  // rug
const BRASS      = [0.86, 0.78, 0.60, 1]  // lamp
const DARK_GRAY  = [0.12, 0.12, 0.13, 1]  // TV

console.log('Generating furniture GLBs...\n')

// ── Seating ──────────────────────────────────────────────────────────────────

// SOFA  2.0 × 0.9 × 0.85 m
writeGLB('sofa', [
  [-1.00,    0, -0.45,   1.00, 0.42,  0.45],  // seat cushion
  [-1.00, 0.42, -0.45,   1.00, 0.85, -0.18],  // backrest
  [-1.00,    0, -0.45,  -0.85, 0.62,  0.45],  // left arm
  [ 0.85,    0, -0.45,   1.00, 0.62,  0.45],  // right arm
], WARM_GRAY)

// ARMCHAIR  0.9 × 0.9 × 0.85 m
writeGLB('armchair', [
  [-0.45,    0, -0.45,   0.45, 0.42,  0.45],  // seat cushion
  [-0.45, 0.42, -0.45,   0.45, 0.85, -0.18],  // backrest
  [-0.45,    0, -0.45,  -0.33, 0.62,  0.45],  // left arm
  [ 0.33,    0, -0.45,   0.45, 0.62,  0.45],  // right arm
], WARM_GRAY)

// CHAIR  0.45 × 0.5 × 0.85 m
writeGLB('chair', [
  [-0.225, 0.35, -0.25,   0.225, 0.47,  0.25],  // seat
  [-0.225, 0.47, -0.25,   0.225, 0.85, -0.20],  // back
  [-0.215,    0,  0.20,  -0.175, 0.35,  0.25],  // leg FL
  [ 0.175,    0,  0.20,   0.215, 0.35,  0.25],  // leg FR
  [-0.215,    0, -0.25,  -0.175, 0.35, -0.20],  // leg BL
  [ 0.175,    0, -0.25,   0.215, 0.35, -0.20],  // leg BR
], WARM_GRAY)

// ── Tables ───────────────────────────────────────────────────────────────────

// COFFEE TABLE  1.1 × 0.6 × 0.45 m
writeGLB('coffee-table', [
  [-0.55, 0.39, -0.30,   0.55, 0.45,  0.30],  // top
  [-0.51,    0,  0.24,  -0.47, 0.39,  0.30],  // leg FL
  [ 0.47,    0,  0.24,   0.51, 0.39,  0.30],  // leg FR
  [-0.51,    0, -0.30,  -0.47, 0.39, -0.24],  // leg BL
  [ 0.47,    0, -0.30,   0.51, 0.39, -0.24],  // leg BR
], WOOD_LT)

// DINING TABLE  1.6 × 0.9 × 0.75 m
writeGLB('dining-table', [
  [-0.80, 0.69, -0.45,   0.80, 0.75,  0.45],  // top
  [-0.75,    0,  0.38,  -0.70, 0.69,  0.45],  // leg FL
  [ 0.70,    0,  0.38,   0.75, 0.69,  0.45],  // leg FR
  [-0.75,    0, -0.45,  -0.70, 0.69, -0.38],  // leg BL
  [ 0.70,    0, -0.45,   0.75, 0.69, -0.38],  // leg BR
], WOOD_LT)

// DESK  1.4 × 0.7 × 0.75 m
writeGLB('desk', [
  [-0.70, 0.69, -0.35,   0.70, 0.75,  0.35],  // top
  [-0.65,    0,  0.28,  -0.61, 0.69,  0.35],  // leg FL
  [ 0.61,    0,  0.28,   0.65, 0.69,  0.35],  // leg FR
  [-0.65,    0, -0.35,  -0.61, 0.69, -0.28],  // leg BL
  [ 0.61,    0, -0.35,   0.65, 0.69, -0.28],  // leg BR
], WOOD_DK)

// ── Bedroom ──────────────────────────────────────────────────────────────────

// BED  2.0 × 1.6 × 0.6 m
writeGLB('bed', [
  [-1.00,    0, -0.80,   1.00, 0.22,  0.80],  // base frame
  [-0.96, 0.22, -0.76,   0.96, 0.42,  0.76],  // mattress
  [-1.00,    0, -0.80,   1.00, 0.60, -0.65],  // headboard
], TEAL)

// ── Storage ──────────────────────────────────────────────────────────────────

// BOOKSHELF  0.8 × 0.35 × 1.8 m
writeGLB('bookshelf', [
  [-0.400,    0, -0.175,  -0.365, 1.800,  0.175],  // left side
  [ 0.365,    0, -0.175,   0.400, 1.800,  0.175],  // right side
  [-0.400,    0, -0.175,   0.400, 1.800, -0.160],  // back panel
  [-0.400,    0, -0.175,   0.400, 0.030,  0.175],  // bottom
  [-0.400, 0.42, -0.175,   0.400, 0.450,  0.175],  // shelf 1
  [-0.400, 0.84, -0.175,   0.400, 0.870,  0.175],  // shelf 2
  [-0.400, 1.26, -0.175,   0.400, 1.290,  0.175],  // shelf 3
  [-0.400, 1.77, -0.175,   0.400, 1.800,  0.175],  // top
], WOOD_DK)

// WARDROBE  1.2 × 0.6 × 2.0 m
writeGLB('wardrobe', [
  [-0.600,    0, -0.300,  -0.565, 2.000,  0.300],   // left side
  [ 0.565,    0, -0.300,   0.600, 2.000,  0.300],   // right side
  [-0.600, 1.965, -0.300,  0.600, 2.000,  0.300],   // top
  [-0.600,    0, -0.300,   0.600, 0.040,  0.300],   // bottom
  [-0.600,    0, -0.300,   0.600, 2.000, -0.275],   // back panel
  [-0.565, 0.040, 0.240,  -0.025, 1.965,  0.300],   // door left
  [ 0.025, 0.040, 0.240,   0.565, 1.965,  0.300],   // door right
], WOOD_DK)

// ── Decor ────────────────────────────────────────────────────────────────────

// RUG  2.0 × 1.4 × 0.01 m
writeGLB('rug', [
  [-1.00, 0, -0.70,   1.00, 0.010,  0.70],  // flat body
], AMBER)

// LAMP  0.4 × 0.4 × 1.5 m
writeGLB('lamp', [
  [-0.140,    0, -0.140,   0.140, 0.040,  0.140],  // base
  [-0.025, 0.040, -0.025,  0.025, 1.100,  0.025],  // pole
  [-0.200, 1.100, -0.200,  0.200, 1.500,  0.200],  // shade
], BRASS)

// TV  1.2 × 0.15 × 0.7 m
writeGLB('tv', [
  [-0.600, 0.100, -0.075,   0.600, 0.700,  0.075],  // frame
  [-0.565, 0.130, -0.035,   0.565, 0.670,  0.035],  // screen (inset)
  [-0.040,     0, -0.040,   0.040, 0.100,  0.040],  // stand neck
  [-0.220,     0, -0.075,   0.220, 0.030,  0.075],  // stand base
], DARK_GRAY)

console.log('\nDone — 12 GLBs written to src/assets/furniture/')
