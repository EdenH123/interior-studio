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
const WATER_DROP = 0.08     // water surface sits this far below the rim (m)

const LINER_COLOR = 0xcfe8f5  // pale tiled liner
const WATER_COLOR = 0x2a8fc9  // pool blue

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

  return group
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
