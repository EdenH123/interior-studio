#!/usr/bin/env node
// Downloads KhronosGroup SheenChair.glb, strips all textures and non-PBR
// extensions, and writes chair.glb — a texture-free geometry-only model
// (~40 KB vs 4.4 MB original). CC0 geometry is preserved unchanged.
// The stripped material is pure white so applyTint() can freely recolor it.

import { NodeIO, Document } from '@gltf-transform/core'
import * as Extensions from '@gltf-transform/extensions'
import { prune, dedup, quantize, weld } from '@gltf-transform/functions'
import { createWriteStream } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { get } from 'https'
import { tmpdir } from 'os'
import { join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/assets/furniture/chair.glb')
const TMP = join(tmpdir(), 'sheenchair-source.glb')

const SRC_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/SheenChair.glb'

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', reject)
    }).on('error', reject)
  })
}

console.log('Downloading SheenChair.glb (4.4 MB)…')
await download(SRC_URL, TMP)
console.log('  ✓ downloaded')

// Only register top-level extension classes (have static register())
const allExtensions = Object.values(Extensions).filter(
  (v) => typeof v === 'function' && typeof v.register === 'function',
)

const io = new NodeIO()
io.registerExtensions(allExtensions)
const doc = await io.read(TMP)

console.log('Stripping textures and non-PBR extensions…')

// Remove every texture
for (const tex of doc.getRoot().listTextures()) tex.dispose()

// Reset all materials to plain white PBR
for (const mat of doc.getRoot().listMaterials()) {
  mat.setBaseColorFactor([1, 1, 1, 1])
  mat.setMetallicFactor(0)
  mat.setRoughnessFactor(0.8)
  mat.setBaseColorTexture(null)
  mat.setNormalTexture(null)
  mat.setOcclusionTexture(null)
  mat.setEmissiveTexture(null)
  mat.setEmissiveFactor([0, 0, 0])
  // Detach all extensions (Sheen, KHR_materials_*, etc.)
  for (const ext of mat.listExtensions()) ext.dispose()
}

// Strip scene-level extensions
for (const ext of doc.getRoot().listExtensionsUsed()) ext.dispose()

// Strip all TEXCOORD attributes — we apply a flat color override, never sample textures.
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const attr of prim.listSemantics()) {
      if (attr.startsWith('TEXCOORD_')) prim.setAttribute(attr, null)
    }
  }
}

console.log('Optimising…')
await doc.transform(
  dedup(),
  weld(),
  prune(),
  // quantizePosition:10 → 1 mm precision at 1 m scale (enough for furniture)
  quantize({ quantizePosition: 10, quantizeNormal: 8 }),
)

await io.write(OUT, doc)

import { statSync } from 'fs'
const bytes = statSync(OUT).size
console.log(`  ✓ chair.glb written — ${(bytes / 1024).toFixed(1)} kB`)
console.log('\nDone.')
