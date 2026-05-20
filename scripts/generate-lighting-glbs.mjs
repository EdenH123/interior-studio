#!/usr/bin/env node
// scripts/generate-lighting-glbs.mjs
// Generates procedural CC0 GLB models for the four lighting catalog items.
// Same conventions as generate-furniture-glbs.mjs:
//   • X = [-W/2, W/2]  (centred)
//   • Y = [0, H]       (bottom at origin)
//   • Z = [-D/2, D/2]  (centred)
//
// Run:  node scripts/generate-lighting-glbs.mjs

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/assets/furniture')
mkdirSync(OUT, { recursive: true })

// ─── geometry helpers (identical to generate-furniture-glbs.mjs) ─────────────

function boxMesh(x1, y1, z1, x2, y2, z2) {
  const positions = [
    x2, y1, z1,  x2, y2, z1,  x2, y2, z2,  x2, y1, z2,
    x1, y1, z2,  x1, y2, z2,  x1, y2, z1,  x1, y1, z1,
    x1, y2, z2,  x2, y2, z2,  x2, y2, z1,  x1, y2, z1,
    x1, y1, z1,  x2, y1, z1,  x2, y1, z2,  x1, y1, z2,
    x2, y1, z2,  x2, y2, z2,  x1, y2, z2,  x1, y1, z2,
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

function writeGLB(name, boxes, color = [0.98, 0.97, 0.88, 1.0]) {
  const { positions, normals, indices } = mergeMeshes(boxes)

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
    asset: { version: '2.0', generator: 'interior-studio-lighting-gen' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2,
        material: 0,
      }],
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: color,
        metallicFactor: 0.0,
        roughnessFactor: 0.6,
      },
      doubleSided: false,
    }],
    accessors: [
      {
        bufferView: 0, componentType: 5126, count: vc, type: 'VEC3',
        min: pMin.map(r4), max: pMax.map(r4),
      },
      { bufferView: 1, componentType: 5126, count: vc, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: ic, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0,                  byteLength: posBytes },
      { buffer: 0, byteOffset: posBytes,            byteLength: nrmBytes },
      { buffer: 0, byteOffset: posBytes + nrmBytes, byteLength: idxBytes },
    ],
    buffers: [{ byteLength: binLen }],
  }

  const jsonStr  = JSON.stringify(gltfJson)
  const jsonPad  = (4 - (jsonStr.length % 4)) % 4
  const jsonFull = jsonStr + ' '.repeat(jsonPad)
  const jsonBuf  = Buffer.from(jsonFull, 'utf8')

  const totalLen = 12 + 8 + jsonBuf.length + 8 + binLen
  const glb = Buffer.alloc(totalLen)
  let off = 0
  glb.writeUInt32LE(0x46546C67, off); off += 4  // magic 'glTF'
  glb.writeUInt32LE(2, off);          off += 4  // version 2
  glb.writeUInt32LE(totalLen, off);   off += 4  // total length
  // JSON chunk
  glb.writeUInt32LE(jsonBuf.length, off); off += 4
  glb.writeUInt32LE(0x4E4F534A, off);     off += 4  // 'JSON'
  jsonBuf.copy(glb, off);                 off += jsonBuf.length
  // BIN chunk
  glb.writeUInt32LE(binLen, off); off += 4
  glb.writeUInt32LE(0x004E4942, off); off += 4  // 'BIN\0'
  bin.copy(glb, off)

  const outPath = resolve(OUT, `${name}.glb`)
  writeFileSync(outPath, glb)
  const tri = ic / 3
  console.log(`  ${name}.glb  ${glb.length} bytes  ${boxes.length} box(es)  ${tri} tri`)
}

// ─── light models ─────────────────────────────────────────────────────────────
// All dims in meters. Y=0 = bottom of item. Ceiling items start at Y=0; the 3D
// scene positions their Group at (WALL_HEIGHT - height) so they flush to ceiling.

console.log('Generating lighting GLBs …')

// ceiling-lamp  0.4 × 0.4 × 0.4 m
// mount plate + cord + wide shallow shade bowl
writeGLB('ceiling-lamp', [
  [-0.06, 0.34, -0.06,  0.06, 0.40,  0.06],   // ceiling mount plate
  [-0.01, 0.18, -0.01,  0.01, 0.34,  0.01],   // cord
  [-0.20, 0.00, -0.20,  0.20, 0.18,  0.20],   // shade (wide bowl)
], [0.98, 0.97, 0.88, 1.0])  // warm white

// floor-lamp  0.4 × 0.4 × 1.8 m
// weighted base + thin pole + shade
writeGLB('floor-lamp', [
  [-0.15, 0.00, -0.15,  0.15, 0.06,  0.15],   // base
  [-0.02, 0.06, -0.02,  0.02, 1.50,  0.02],   // pole
  [-0.20, 1.50, -0.20,  0.20, 1.80,  0.20],   // shade
], [0.98, 0.97, 0.88, 1.0])

// table-lamp  0.36 × 0.36 × 0.45 m
// disc base + narrow neck + shade
writeGLB('table-lamp', [
  [-0.10, 0.00, -0.10,  0.10, 0.08,  0.10],   // base
  [-0.03, 0.08, -0.03,  0.03, 0.22,  0.03],   // neck
  [-0.18, 0.22, -0.18,  0.18, 0.45,  0.18],   // shade
], [0.98, 0.97, 0.88, 1.0])

// pendant  0.3 × 0.3 × 0.65 m
// thin cable + end cap + shade cylinder + diffuser dome
writeGLB('pendant', [
  [-0.01, 0.50, -0.01,  0.01, 0.65,  0.01],   // cable
  [-0.05, 0.42, -0.05,  0.05, 0.50,  0.05],   // end cap
  [-0.15, 0.15, -0.15,  0.15, 0.42,  0.15],   // shade
  [-0.07, 0.05, -0.07,  0.07, 0.15,  0.07],   // diffuser
], [0.76, 0.62, 0.24, 1.0])  // brass

console.log('Done.')
