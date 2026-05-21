#!/usr/bin/env node
// scripts/optimize-glb.mjs
// CC0 GLB asset pipeline — resizes, optimises, and copies external GLBs into
// src/assets/furniture/ so the catalog can reference them.
//
// How to use:
//   1. Drop CC0 GLB files into  scripts/cc0-assets/<name>.glb
//   2. Add an entry to the ASSETS array below:
//        { src: 'sofa-cc0.glb', dst: 'sofa.glb', width: 2.0, depth: 0.9, height: 0.85 }
//   3. Run:  node scripts/optimize-glb.mjs
//
// The script rescales each model so its bounding box exactly matches the
// catalog dimensions (width × height × depth in metres), then writes the
// result to src/assets/furniture/<dst>.
//
// CC0 asset sources (no attribution required, free for personal/commercial use):
//   • https://kenney.nl/assets/furniture-kit          (GLTF, CC0 1.0)
//   • https://quaternius.com/packs/ultimatefurniture.html  (GLTF, CC0 1.0)
//   • https://kaylousberg.itch.io/kaykit-furniture     (GLTF, CC0 1.0)
//
// Requirements: @gltf-transform/core, @gltf-transform/functions (already in
// package.json devDependencies).

import { NodeIO }                from '@gltf-transform/core'
import { resample, prune, dedup, weld } from '@gltf-transform/functions'
import { existsSync, mkdirSync, readdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath }         from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC_DIR   = resolve(__dirname, 'cc0-assets')
const DST_DIR   = resolve(__dirname, '../src/assets/furniture')

mkdirSync(SRC_DIR, { recursive: true })
mkdirSync(DST_DIR, { recursive: true })

// ─── Asset map ────────────────────────────────────────────────────────────────
// Add entries here as you download CC0 assets.
// src: filename in scripts/cc0-assets/
// dst: filename in src/assets/furniture/ (replaces the procedural fallback)
// width, depth, height: catalog dimensions in metres
const ASSETS = [
  // Example (uncomment and add the file to scripts/cc0-assets/ to activate):
  // { src: 'kenney-sofa.glb',     dst: 'sofa.glb',     width: 2.0, depth: 0.9, height: 0.85 },
  // { src: 'kenney-armchair.glb', dst: 'armchair.glb', width: 0.9, depth: 0.9, height: 0.85 },
  // { src: 'kenney-chair.glb',    dst: 'chair.glb',    width: 0.45,depth: 0.5, height: 0.85 },
]

// ─── Processing ───────────────────────────────────────────────────────────────

async function fitAndOptimize(srcPath, dstPath, targetW, targetD, targetH) {
  const io = new NodeIO()
  const doc = await io.read(srcPath)

  // Deduplicate accessors and meshes, weld vertices, prune unused nodes.
  await doc.transform(dedup(), weld(), prune(), resample())

  // Compute bounding box across all mesh primitives.
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      if (!pos) continue
      for (let i = 0; i < pos.getCount(); i++) {
        const [x, y, z] = pos.getElement(i, [])
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
      }
    }
  }

  const sizeX = maxX - minX, sizeY = maxY - minY, sizeZ = maxZ - minZ
  if (sizeX < 1e-6 || sizeY < 1e-6 || sizeZ < 1e-6) {
    console.warn(`  ⚠  ${basename(srcPath)}: zero bounding box — skipping scale`)
  } else {
    const scaleX = targetW / sizeX
    const scaleY = targetH / sizeY
    const scaleZ = targetD / sizeZ

    // Centre at origin, then scale. Apply via root node transform.
    const cx = (minX + maxX) / 2, cy = minY, cz = (minZ + maxZ) / 2
    for (const scene of doc.getRoot().listScenes()) {
      for (const node of scene.listChildren()) {
        const t = node.getTranslation()
        node.setTranslation([t[0] - cx * scaleX, t[1] - cy * scaleY, t[2] - cz * scaleZ])
        const s = node.getScale()
        node.setScale([s[0] * scaleX, s[1] * scaleY, s[2] * scaleZ])
      }
    }
  }

  await io.write(dstPath, doc)
}

async function main() {
  if (!existsSync(SRC_DIR) || ASSETS.length === 0) {
    console.log('No CC0 assets configured.')
    console.log(`Add GLB files to ${SRC_DIR}/`)
    console.log('and entries to the ASSETS array in this script.')
    return
  }

  let processed = 0, skipped = 0
  for (const { src, dst, width, depth, height } of ASSETS) {
    const srcPath = resolve(SRC_DIR, src)
    const dstPath = resolve(DST_DIR, dst)
    if (!existsSync(srcPath)) {
      console.log(`  –  ${src} not found — skipping`)
      skipped++
      continue
    }
    process.stdout.write(`  ⟳  ${src} → ${dst} … `)
    await fitAndOptimize(srcPath, dstPath, width, depth, height)
    console.log('done')
    processed++
  }
  console.log(`\nDone — ${processed} processed, ${skipped} skipped.`)
  if (skipped > 0) console.log(`Place missing files in: ${SRC_DIR}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
