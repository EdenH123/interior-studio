import * as THREE from 'three'
import { konvaToFloor, konvaRotationToThreeY } from './threeMath'
import {
  isModelLoaded, cloneLoadedModel, loadFurnitureModel, onceModelLoaded, fitToBox,
} from './furnitureModels'
import { setObjectEmissive } from './selectionHighlight'
import { furnitureColorFor } from '../canvas/furnitureMaterials'

// Furniture meshes are wrapped in a `THREE.Group` so we can swap the visual
// (BoxGeometry fallback ↔ loaded GLB) without recreating the addressable
// scene object that picking and selection-highlight reference.
//
// Lifecycle per item:
//   • First seen → create Group, tag userData{kind,id,dims,color,modelUrl},
//     populate with either the loaded model (if cached) or a Box fallback
//     while the GLB loads.
//   • Existing  → update position / rotation; if dims changed, rebuild the
//     current child at the new size; sync color into the box fallback.
//   • Missing   → cancel any pending load listener, dispose the Group's
//     subtree, remove from the scene.
export function reconcileFurniture(scene, furniture, meshMap) {
  const present = new Set()
  for (const f of furniture) {
    present.add(f.id)
    const pos = konvaToFloor(f.x, f.y)

    // Resolved colour: per-piece material override wins, else the catalog
    // default snapshotted onto the piece at add-time.
    const color = furnitureColorFor(f)

    let group = meshMap.get(f.id)
    if (!group) {
      group = new THREE.Group()
      group.userData.kind = 'furniture'
      group.userData.id = f.id
      group.userData.dims = { width: f.width, depth: f.depth, height: f.height }
      group.userData.color = color
      group.userData.modelUrl = f.model ?? null
      scene.add(group)
      meshMap.set(f.id, group)
      if (group.userData.modelUrl) populateModelOrSchedule(group)
      else populateBoxFallback(group)
    } else {
      const d = group.userData.dims
      const dimsChanged = !d || d.width !== f.width || d.depth !== f.depth || d.height !== f.height
      group.userData.dims = { width: f.width, depth: f.depth, height: f.height }
      if (dimsChanged) {
        group.userData.color = color
        rebuildChild(group)
      } else if (group.userData.childKind === 'box') {
        if (group.userData.color !== color) {
          group.userData.color = color
          const box = group.children[0]
          if (box?.material) box.material.color.set(color)
        }
      }
    }
    group.position.set(pos.x, 0, pos.z)
    group.rotation.y = konvaRotationToThreeY(f.rotation)
  }
  for (const [id, group] of meshMap) {
    if (!present.has(id)) {
      group.userData.cancelLoad?.()
      scene.remove(group)
      disposeSubtree(group)
      meshMap.delete(id)
    }
  }
}

function populateBoxFallback(group) {
  clearChildren(group)
  const { width, depth, height } = group.userData.dims
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(group.userData.color ?? '#888') }),
  )
  mesh.position.y = height / 2
  group.add(mesh)
  group.userData.childKind = 'box'
}

function populateModelOrSchedule(group) {
  const url = group.userData.modelUrl
  if (isModelLoaded(url)) { populateLoadedModel(group); return }
  populateBoxFallback(group)
  loadFurnitureModel(url)
  group.userData.cancelLoad = onceModelLoaded(url, (loaded) => {
    if (!loaded) return                                 // failed — keep the box fallback
    if (group.userData.modelUrl !== url) return         // url changed mid-flight
    populateLoadedModel(group)
  })
}

function populateLoadedModel(group) {
  clearChildren(group)
  const clone = cloneLoadedModel(group.userData.modelUrl)
  if (!clone) { populateBoxFallback(group); return }
  const { width, depth, height } = group.userData.dims
  fitToBox(clone, width, depth, height)
  group.add(clone)
  group.userData.childKind = 'model'
  // If the piece is currently selected, the previous child carried the
  // emissive highlight; the new child needs it too.
  if (group.userData.highlighted) setObjectEmissive(clone, true)
}

function rebuildChild(group) {
  if (group.userData.childKind === 'model' && group.userData.modelUrl) populateLoadedModel(group)
  else populateBoxFallback(group)
}

function clearChildren(group) {
  for (const child of [...group.children]) {
    group.remove(child)
    disposeSubtree(child)
  }
}

function disposeSubtree(obj) {
  obj.traverse?.((node) => {
    node.geometry?.dispose?.()
    if (node.material) {
      if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose())
      else node.material.dispose()
    }
  })
}
