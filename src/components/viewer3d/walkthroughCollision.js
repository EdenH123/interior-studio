const KONVA_TO_THREE = 0.02
const DEFAULT_WALL_HEIGHT = 2.4
const EYE_HEIGHT = 1.65

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

// Group openings by parent wall for fast collision lookup.
// Returns Map<wallId, Array<{ position, width, passable }>>.
// Passable = sillHeight === 0 (doors + open archways). Windows block.
export function indexOpeningsByWall(openings) {
  const map = new Map()
  if (!openings) return map
  for (const o of openings) {
    if (!o.wallId) continue
    const passable = (o.sillHeight ?? 0) === 0
    if (!map.has(o.wallId)) map.set(o.wallId, [])
    map.get(o.wallId).push({ position: o.position, width: o.width, passable })
  }
  return map
}

// walls: array of {x1,y1,x2,y2,id?,levelId?,height?} in Konva pixels (height in metres).
// posXZ: {x,z} in Three.js world units.
// dirXZ: {x,z} unit vector.
// opts.openingsByWall : Map from indexOpeningsByWall — ray passes through passable openings
// opts.playerY       : camera Y (metres) — used with levelBaseY to skip out-of-floor walls
// opts.levelBaseY    : Map<levelId, metres> of level floor offsets
// Returns the nearest hit distance, or Infinity if none within maxDist.
export function rayHitsWalls(posXZ, dirXZ, walls, maxDist, opts = {}) {
  const openingsByWall = opts.openingsByWall ?? null
  const playerY = opts.playerY ?? null
  const levelBaseY = opts.levelBaseY ?? null

  let nearest = Infinity
  for (const w of walls) {
    // Vertical filter — skip walls that don't span the player's body.
    if (playerY != null) {
      const wallBase = (levelBaseY && w.levelId != null) ? (levelBaseY.get(w.levelId) ?? 0) : 0
      const wallTop = wallBase + (w.height ?? DEFAULT_WALL_HEIGHT)
      const feet = playerY - EYE_HEIGHT
      if (wallTop <= feet || wallBase >= playerY) continue
    }

    const A = { x: w.x1 * KONVA_TO_THREE, z: w.y1 * KONVA_TO_THREE }
    const B = { x: w.x2 * KONVA_TO_THREE, z: w.y2 * KONVA_TO_THREE }
    const t = raySegmentIntersect(posXZ, dirXZ, A, B, maxDist)
    if (t === Infinity || t >= nearest) continue

    // Check if hit point lies inside a passable opening on this wall.
    if (openingsByWall && w.id) {
      const wallOps = openingsByWall.get(w.id)
      if (wallOps && wallOps.length) {
        const wallLen = Math.hypot(B.x - A.x, B.z - A.z)
        if (wallLen > 0) {
          const hx = posXZ.x + dirXZ.x * t
          const hz = posXZ.z + dirXZ.z * t
          const sFrac = Math.hypot(hx - A.x, hz - A.z) / wallLen
          let passes = false
          for (const op of wallOps) {
            if (!op.passable) continue
            const halfNorm = (op.width / 2) / wallLen
            if (sFrac >= op.position - halfNorm && sFrac <= op.position + halfNorm) {
              passes = true
              break
            }
          }
          if (passes) continue
        }
      }
    }

    nearest = t
  }
  return nearest
}

// Returns the world Y of the stair ramp at the given player XZ, or null if
// the player isn't over this stair's footprint.
//
// stair: { cx, cz, yaw, width, depth, height, baseY } all in metres / radians.
// Local +Z axis is the climbing axis; localZ = -depth/2 is the bottom step,
// localZ = +depth/2 is the top step (matches buildStairsGeometry convention).
export function stairGroundY(playerX, playerZ, stair, margin = 0.1) {
  const dx = playerX - stair.cx
  const dz = playerZ - stair.cz
  // Inverse of Y rotation by `yaw` — world to local.
  const cosY = Math.cos(stair.yaw)
  const sinY = Math.sin(stair.yaw)
  const localX = dx * cosY + dz * sinY
  const localZ = -dx * sinY + dz * cosY
  const halfW = stair.width / 2 + margin
  const halfD = stair.depth / 2 + margin
  if (Math.abs(localX) > halfW || Math.abs(localZ) > halfD) return null
  const frac = (localZ + stair.depth / 2) / stair.depth
  const rampY = Math.max(0, Math.min(stair.height, frac * stair.height))
  return stair.baseY + rampY
}
