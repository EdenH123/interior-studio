// Stacking helpers for "place furniture on top of furniture" (e.g. TV on
// wardrobe). 2D-only — the 3D reconciler reads `stackedOn` to derive Y.
//
// Stacking is footprint-contained: the drag point must lie INSIDE the parent's
// rotated rectangle. Lights, railings, stairs, and wall-mounted items don't
// expose a stackable top surface and are skipped.

import { PIXELS_PER_METER } from './constants'

// True when (world.x, world.y) lies inside f's rotated AABB.
function pointInsideFurniture(world, f) {
  const dx = world.x - f.x
  const dy = world.y - f.y
  const rot = ((f.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(-rot)
  const sin = Math.sin(-rot)
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  const hw = (f.width * PIXELS_PER_METER) / 2
  const hd = (f.depth * PIXELS_PER_METER) / 2
  return Math.abs(lx) <= hw && Math.abs(ly) <= hd
}

// True when `descId` is in `ancestorId`'s descendant chain via stackedOn.
// Used to prevent cycles (you can't stack a wardrobe on a TV that's stacked
// on that same wardrobe).
function isDescendantOf(descId, ancestorId, allFurniture) {
  const byId = new Map(allFurniture.map((f) => [f.id, f]))
  let cur = byId.get(descId)
  const seen = new Set()
  while (cur && cur.stackedOn && !seen.has(cur.id)) {
    if (cur.stackedOn === ancestorId) return true
    seen.add(cur.id)
    cur = byId.get(cur.stackedOn)
  }
  return false
}

// Returns the topmost stackable furniture whose footprint contains `world`,
// or null. Filters out:
//   - the dragging item itself
//   - lights (no flat top)
//   - wall-mounted items (no top surface)
//   - railings + stairs (sloped / no top)
//   - any descendant in the dragging item's stack chain (cycle protection)
//   - items on a different level than the dragging item (when both have levelId)
// Prefers smaller-footprint candidates so nested stacks pick the inner one.
export function findStackTarget(world, draggingItem, allFurniture) {
  const candidates = []
  for (const f of allFurniture) {
    if (draggingItem && f.id === draggingItem.id) continue
    if (typeof f.type === 'string' && f.type.startsWith('lighting:')) continue
    if (f.wallMounted) continue
    if (f.stairStyle || f.railingStyle) continue
    if (draggingItem && draggingItem.levelId && f.levelId
        && draggingItem.levelId !== f.levelId) continue
    if (draggingItem && isDescendantOf(f.id, draggingItem.id, allFurniture)) continue
    if (!pointInsideFurniture(world, f)) continue
    candidates.push(f)
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => (a.width * a.depth) - (b.width * b.depth))
  return candidates[0]
}

// Walks the stackedOn chain and returns the cumulative offset above the level
// floor for `f`. Falls back to manual `elevation` / `mountHeight` / lighting
// offset when the chain ends. `getAutoOffset(f)` is the per-item baseline used
// for non-stacked, non-elevation items (e.g. lighting yOffset). Cycle-safe.
export function resolveStackedYOffset(f, furnitureById, getAutoOffset) {
  const visited = new Set()
  function rec(cur) {
    if (!cur || visited.has(cur.id)) return 0
    visited.add(cur.id)
    if (cur.stackedOn) {
      const parent = furnitureById.get(cur.stackedOn)
      if (parent) return rec(parent) + parent.height
    }
    if (cur.elevation != null) return cur.elevation
    if (cur.wallMounted) return cur.mountHeight ?? 1.2
    return getAutoOffset(cur)
  }
  return rec(f)
}
