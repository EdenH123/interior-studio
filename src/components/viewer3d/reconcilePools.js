import * as THREE from 'three'
import { KONVA_TO_THREE } from './threeMath'

// Renders pools as a recessed basin sunk into the surrounding ground:
//   • basin walls — a vertical skirt around the polygon, from a small coping
//     lip just above ground down to the basin floor (-depth)
//   • basin floor — the polygon at -depth
//   • water surface — a translucent blue polygon just below the rim
// Geometry is baked in absolute world XZ (like reconcileRooms), so each pool's
// Group only carries the level Y offset. Rebuilt when the polygon or depth
// changes; otherwise only the Y position is updated.

const COPING_LIP = 0.06     // how far the rim rises above the surrounding ground (m)
const COPING_WIDTH = 0.28   // flat coping border width around the rim (m)
const WATER_DROP = 0.08     // water surface sits this far below the rim (m)

const LINER_COLOR = 0xcfe8f5  // pale tiled liner
const WATER_COLOR = 0x2a8fc9  // pool blue
const COPING_COLOR = 0xd7dde2 // light stone coping

function fingerprint(verts, depth) {
  return `${depth.toFixed(3)}:` + verts.map((v) => `${Math.round(v.x)},${Math.round(v.y)}`).join('|')
}

function buildShape(verts) {
  const shape = new THREE.Shape()
  shape.moveTo(verts[0].x * KONVA_TO_THREE, verts[0].y * KONVA_TO_THREE)
  for (let i = 1; i < verts.length; i++) {
    shape.lineTo(verts[i].x * KONVA_TO_THREE, verts[i].y * KONVA_TO_THREE)
  }
  return shape
}

// Vertical skirt of quads around the polygon, from yTop down to yBottom.
function buildWalls(verts, yTop, yBottom) {
  const pos = []
  const n = verts.length
  for (let i = 0; i < n; i++) {
    const a = verts[i]
    const b = verts[(i + 1) % n]
    const ax = a.x * KONVA_TO_THREE, az = a.y * KONVA_TO_THREE
    const bx = b.x * KONVA_TO_THREE, bz = b.y * KONVA_TO_THREE
    // two triangles: (aTop,bTop,bBot) + (aTop,bBot,aBot)
    pos.push(ax, yTop, az,  bx, yTop, bz,  bx, yBottom, bz)
    pos.push(ax, yTop, az,  bx, yBottom, bz,  ax, yBottom, az)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return geo
}

// Flat coping ring around the rim at y=COPING_LIP. For each edge we add a
// quad offset outward (away from the centroid) by COPING_WIDTH, then fill each
// convex corner with a triangle so the border has no gaps. Verts in Konva px.
function buildCoping(verts, y) {
  const n = verts.length
  const cx = verts.reduce((s, v) => s + v.x, 0) / n
  const cy = verts.reduce((s, v) => s + v.y, 0) / n
  const W = COPING_WIDTH
  // World-space inner/outer point per edge endpoint.
  const inner = verts.map((v) => ({ x: v.x * KONVA_TO_THREE, z: v.y * KONVA_TO_THREE }))
  const edges = []
  for (let i = 0; i < n; i++) {
    const a = verts[i], b = verts[(i + 1) % n]
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    let nx = -dy / len, nz = dx / len
    // Outward = away from centroid.
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    if ((mx - cx) * nx + (my - cy) * nz < 0) { nx = -nx; nz = -nz }
    const ai = inner[i], bi = inner[(i + 1) % n]
    edges.push({
      ai, bi,
      ao: { x: ai.x + nx * W, z: ai.z + nz * W },
      bo: { x: bi.x + nx * W, z: bi.z + nz * W },
    })
  }
  const pos = []
  const tri = (p, q, r) => pos.push(p.x, y, p.z, q.x, y, q.z, r.x, y, r.z)
  for (let i = 0; i < n; i++) {
    const e = edges[i]
    tri(e.ai, e.bi, e.bo)
    tri(e.ai, e.bo, e.ao)
    // Corner fill at vertex (i+1): between this edge's outer-end and next edge's outer-start.
    const next = edges[(i + 1) % n]
    tri(e.bi, e.bo, next.ao)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return geo
}

function buildPool(verts, depth) {
  const group = new THREE.Group()
  const linerMat = new THREE.MeshStandardMaterial({
    color: LINER_COLOR, roughness: 0.45, metalness: 0, side: THREE.DoubleSide,
  })
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: WATER_COLOR, roughness: 0.08, metalness: 0,
    transmission: 0.6, thickness: depth, transparent: true, opacity: 0.8, depthWrite: false,
  })

  // Walls (coping lip → basin floor)
  const walls = new THREE.Mesh(buildWalls(verts, COPING_LIP, -depth), linerMat)
  walls.receiveShadow = true
  group.add(walls)

  // Basin floor at -depth
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(buildShape(verts)), linerMat)
  floor.rotation.x = Math.PI / 2
  floor.position.y = -depth
  floor.receiveShadow = true
  group.add(floor)

  // Water surface just below the rim
  const water = new THREE.Mesh(new THREE.ShapeGeometry(buildShape(verts)), waterMat)
  water.rotation.x = Math.PI / 2
  water.position.y = -WATER_DROP
  water.renderOrder = 1
  group.add(water)

  // Flat stone coping ring around the rim
  const copingMat = new THREE.MeshStandardMaterial({
    color: COPING_COLOR, roughness: 0.7, metalness: 0, side: THREE.DoubleSide,
  })
  const coping = new THREE.Mesh(buildCoping(verts, COPING_LIP), copingMat)
  coping.receiveShadow = true
  coping.castShadow = true
  group.add(coping)

  return group
}

// Big ground plane (size metres) with each pool's footprint cut out, so the
// recessed basins are visible from above instead of hidden under the ground.
// Built in the same shape convention as room floors (shape x→world x, shape
// y→world z; caller rotates x=π/2).
export function buildGroundGeometry(size, pools) {
  const shape = new THREE.Shape()
  const h = size / 2
  shape.moveTo(-h, -h)
  shape.lineTo(h, -h)
  shape.lineTo(h, h)
  shape.lineTo(-h, h)
  shape.closePath()
  for (const p of pools) {
    if (!p.verts || p.verts.length < 3) continue
    const hole = new THREE.Path()
    hole.moveTo(p.verts[0].x * KONVA_TO_THREE, p.verts[0].y * KONVA_TO_THREE)
    for (let i = 1; i < p.verts.length; i++) {
      hole.lineTo(p.verts[i].x * KONVA_TO_THREE, p.verts[i].y * KONVA_TO_THREE)
    }
    hole.closePath()
    shape.holes.push(hole)
  }
  return new THREE.ShapeGeometry(shape)
}

function disposeGroup(group) {
  group.traverse((n) => {
    n.geometry?.dispose?.()
    if (n.material) {
      if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose())
      else n.material.dispose()
    }
  })
}

// opts: { solo?: bool, activeLevelId?: string }
export function reconcilePools(scene, pools, meshMap, levelOffsets, opts = {}) {
  const present = new Set()
  for (const p of pools) {
    if (!p.verts || p.verts.length < 3) continue
    present.add(p.id)
    const depth = p.depth ?? 1.5
    const fp = fingerprint(p.verts, depth)
    const yOffset = levelOffsets?.get(p.levelId) ?? 0

    let group = meshMap.get(p.id)
    if (!group || group.userData.fp !== fp) {
      if (group) { scene.remove(group); disposeGroup(group) }
      group = buildPool(p.verts, depth)
      group.userData.kind = 'pool'
      group.userData.id = p.id
      group.userData.fp = fp
      scene.add(group)
      meshMap.set(p.id, group)
    }
    group.position.y = yOffset
    group.visible = !opts.solo || !p.levelId || p.levelId === opts.activeLevelId
  }

  for (const [id, group] of meshMap) {
    if (!present.has(id)) {
      scene.remove(group)
      disposeGroup(group)
      meshMap.delete(id)
    }
  }
}
