const KONVA_TO_THREE = 0.02

// Returns the t parameter (distance along ray) to the segment [A,B], or Infinity
// if there's no intersection within [0, maxDist] and s within [0, 1].
// pos/dir are {x,z}; A/B are {x,z} in Three.js world units.
export function raySegmentIntersect(pos, dir, A, B, maxDist) {
  const ex = B.x - A.x
  const ez = B.z - A.z
  const fx = A.x - pos.x
  const fz = A.z - pos.z
  const det = ex * dir.z - dir.x * ez
  if (Math.abs(det) < 1e-10) return Infinity
  const t = (ex * fz - fx * ez) / det
  const s = (dir.x * fz - fx * dir.z) / det
  if (t < 0 || t > maxDist || s < 0 || s > 1) return Infinity
  return t
}

// walls: array of {x1,y1,x2,y2} in Konva pixels.
// posXZ: {x,z} in Three.js world units.
// dirXZ: {x,z} unit vector.
// Returns the nearest hit distance, or Infinity if none within maxDist.
export function rayHitsWalls(posXZ, dirXZ, walls, maxDist) {
  let nearest = Infinity
  for (const w of walls) {
    const A = { x: w.x1 * KONVA_TO_THREE, z: w.y1 * KONVA_TO_THREE }
    const B = { x: w.x2 * KONVA_TO_THREE, z: w.y2 * KONVA_TO_THREE }
    const t = raySegmentIntersect(posXZ, dirXZ, A, B, maxDist)
    if (t < nearest) nearest = t
  }
  return nearest
}
