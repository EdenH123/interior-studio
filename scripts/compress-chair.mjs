#!/usr/bin/env node
// scripts/compress-chair.mjs
// Shrinks the already-texture-stripped chair.glb (the processed SheenChair).
// process-sheenchair.mjs quantizes but never welds or simplifies, so the
// model shipped at ~500 kB — 16x larger than every other furniture GLB.
//
// This pass welds coincident vertices, decimates the mesh to ~50% triangles
// (the chair renders at room scale, so the loss is invisible), prunes unused
// data, and re-quantizes. Output keeps KHR_mesh_quantization, which three's
// GLTFLoader supports natively — no decoder wiring needed.
//
// Run:  node scripts/compress-chair.mjs

import { NodeIO } from '@gltf-transform/core'
import * as Extensions from '@gltf-transform/extensions'
import { dedup, weld, simplify, prune, quantize } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { statSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE = resolve(__dirname, '../src/assets/furniture/chair.glb')

await MeshoptSimplifier.ready

const exts = Object.values(Extensions).filter(
  (v) => typeof v === 'function' && typeof v.register === 'function',
)

const io = new NodeIO().registerExtensions(exts)
const before = statSync(FILE).size

const doc = await io.read(FILE)
await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.005 }),
  prune(),
  quantize({ quantizePosition: 11, quantizeNormal: 8 }),
)
await io.write(FILE, doc)

const after = statSync(FILE).size
console.log(
  `chair.glb: ${(before / 1024).toFixed(1)} kB -> ${(after / 1024).toFixed(1)} kB`,
)
