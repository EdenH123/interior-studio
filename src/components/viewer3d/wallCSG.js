import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

// Builds wall geometry with door/window holes carved out via CSG.
// Wall is built in local space: X = length axis, Y = up, Z = thickness,
// centred at origin. Caller places the resulting mesh at the wall's centre
// with the wall's yaw. Throws if CSG fails — reconciler falls back to a
// plain box plus painted rectangles.
const evaluator = new Evaluator()

export function buildWallWithHoles(lengthM, heightM, thicknessM, openings) {
  let current = new Brush(new THREE.BoxGeometry(lengthM, heightM, thicknessM))
  current.updateMatrixWorld()

  for (const o of openings) {
    const wM = o.width
    const hM = o.height
    const sill = o.type.startsWith('window') ? (o.sillHeight ?? 0.9) : 0
    const cx = (o.position - 0.5) * lengthM
    const cy = sill + hM / 2 - heightM / 2
    // Oversize Z so the cut clears both faces of the wall cleanly.
    const hole = new Brush(new THREE.BoxGeometry(wM, hM, thicknessM * 2))
    hole.position.set(cx, cy, 0)
    hole.updateMatrixWorld()
    current = evaluator.evaluate(current, hole, SUBTRACTION)
    current.updateMatrixWorld()
  }
  return current.geometry
}

export function openingMeters(o) {
  return {
    width: o.width,
    height: o.height,
    sill: o.type === 'window' ? (o.sillHeight ?? 0) : 0,
  }
}
