import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { cache } from './furnitureModelCache'

// Three-dependent half of the furniture-model pipeline. Lives in its own
// module so the cache + status getters (`furnitureModelCache.js`) can be
// imported from the 2D side without pulling Three.js into the main bundle.
//
// Re-exports the cache status helpers for convenience inside the viewer3d
// chunk (so reconcileFurniture has a single import surface).

export { getModelStatus, isModelLoaded, onceModelLoaded } from './furnitureModelCache'

let loader = null
const getLoader = () => (loader ??= new GLTFLoader())

// Kicks off a load if not already in flight. Idempotent.
export function loadFurnitureModel(url) {
  if (!url || cache.has(url)) return
  const entry = { state: 'loading', listeners: new Set() }
  cache.set(url, entry)
  getLoader().load(
    url,
    (gltf) => {
      entry.state = 'loaded'
      entry.scene = gltf.scene
      for (const fn of entry.listeners) fn(gltf.scene)
      entry.listeners.clear()
    },
    undefined,
    (err) => {
      entry.state = 'failed'
      entry.error = err
      for (const fn of entry.listeners) fn(null, err)
      entry.listeners.clear()
    },
  )
}

// Returns a fresh per-instance clone of the loaded scene, with deep-cloned
// materials so selection highlighting and colour changes don't share state
// across pieces of the same type. Null if the model isn't loaded yet.
export function cloneLoadedModel(url) {
  const entry = cache.get(url)
  if (entry?.state !== 'loaded') return null
  const copy = entry.scene.clone(true)
  copy.traverse((child) => {
    if (child.material) {
      child.material = Array.isArray(child.material)
        ? child.material.map((m) => m.clone())
        : child.material.clone()
    }
  })
  return copy
}

// Scales `obj` so its bounding box matches width × height × depth (in
// meters), then shifts it so the bottom-centre sits at local origin.
export function fitToBox(obj, width, depth, height) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  if (size.x < 1e-6 || size.y < 1e-6 || size.z < 1e-6) return obj
  obj.scale.set(width / size.x, height / size.y, depth / size.z)
  obj.updateMatrixWorld(true)
  const scaled = new THREE.Box3().setFromObject(obj)
  const center = scaled.getCenter(new THREE.Vector3())
  obj.position.x -= center.x
  obj.position.z -= center.z
  obj.position.y -= scaled.min.y
  return obj
}
