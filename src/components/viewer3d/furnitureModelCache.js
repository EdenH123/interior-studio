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

// Bound the cache so a long session with many distinct models doesn't grow
// the heap without limit. Map preserves insertion order, so the oldest
// entries sit at the front. `touch` re-inserts a key to mark it most-recently
// used; `enforceLimit` drops the oldest *loaded* entries past the cap (never
// in-flight loads, which still have pending listeners). Eviction only removes
// the cache reference — clones in the scene keep their own materials and the
// model simply reloads from the browser cache if placed again.
const CACHE_LIMIT = 40

export function touch(url) {
  const entry = cache.get(url)
  if (!entry) return
  cache.delete(url)
  cache.set(url, entry)
}

export function enforceLimit() {
  if (cache.size <= CACHE_LIMIT) return
  for (const [url, entry] of cache) {
    if (cache.size <= CACHE_LIMIT) break
    if (entry.state === 'loaded') cache.delete(url)
  }
}

// Global change listeners — notified on every load-state transition so
// React components (e.g. the 3D viewer's loading indicator) can re-render.
const changeListeners = new Set()
export function onCacheChange(fn) {
  changeListeners.add(fn)
  return () => changeListeners.delete(fn)
}
export function notifyCacheChange() {
  for (const fn of changeListeners) fn()
}

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
