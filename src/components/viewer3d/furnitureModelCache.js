// Module-level cache of furniture GLBs keyed by URL. Kept separate from
// `furnitureModels.js` (which imports `three` + `GLTFLoader`) so that the
// 2D PropertiesPanel can read model load status without dragging the
// Three.js bundle into the main chunk. Same cache instance is used by the
// 3D-side loader and clone helpers.
//
// Entry shape: { state, scene?, error?, listeners: Set<fn> }
//   state ∈ { 'loading' | 'loaded' | 'failed' }
//   listeners are one-shot callbacks fired when loading transitions to
//   loaded or failed; each receives (scene, error?).

export const cache = new Map()

export function getModelStatus(url) {
  if (!url) return 'no-model'
  return cache.get(url)?.state ?? 'no-model'
}

export function isModelLoaded(url) {
  return !!url && cache.get(url)?.state === 'loaded'
}

export function onceModelLoaded(url, fn) {
  const entry = cache.get(url)
  if (!entry) return () => {}
  if (entry.state === 'loaded') { fn(entry.scene); return () => {} }
  if (entry.state === 'failed') { fn(null, entry.error); return () => {} }
  entry.listeners.add(fn)
  return () => entry.listeners.delete(fn)
}
