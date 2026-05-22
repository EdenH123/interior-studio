import * as THREE from 'three'
import { KONVA_TO_THREE, konvaToFloor } from './threeMath'
import { WALL_THICKNESS } from '../canvas/constants'
import { wallColorFor, resolveWallMaterialId } from '../canvas/wallMaterials'
import { resolveFloorMaterialId } from '../canvas/floorMaterials'
import { buildWallWithHoles } from './wallCSG'
import { holesFp } from './stairFloorHoles'
import { getWallTexture, getFloorTexture } from './proceduralTextures'

// reconcileFurniture lives in its own module because the GLB upgrade
// pipeline + Group-wrapped scene objects are substantial enough that they
// crowded this file. Re-exporting here keeps useThree's import unchanged.
export { reconcileFurniture } from './reconcileFurniture'

const WALL_HEIGHT = 2.4

// Add / update / remove wall meshes to match the store's walls array.
// `meshMap` is a Map<wallId, THREE.Mesh> owned by the caller (the hook).
// Walls with openings on them get CSG-cut geometry; the holes are painted
// as a translucent rectangle fallback when CSG fails (with a warn).
// opts: { levelOffsets?: Map<id,metres>, activeLevelId?: string, solo?: bool, xray?: bool }
export function reconcileWalls(scene, walls, openings, meshMap, opts = {}) {
  const present = new Set()
  // Fingerprint each opening so we can skip rebuilds when nothing changed.
  const openingsByWall = new Map()
  for (const o of openings) {
    if (!openingsByWall.has(o.wallId)) openingsByWall.set(o.wallId, [])
    openingsByWall.get(o.wallId).push(o)
  }

  for (const w of walls) {
    present.add(w.id)
    const a = konvaToFloor(w.x1, w.y1)
    const b = konvaToFloor(w.x2, w.y2)
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    if (length < 0.001) continue
    const thickness = WALL_THICKNESS * KONVA_TO_THREE
    const color = wallColorFor(w)
    const own = openingsByWall.get(w.id) ?? []
    const fp = wallFingerprint(length, own)

    const resolvedMat = resolveWallMaterialId(w.material)
    const texFp = `${color}:${resolvedMat ?? ''}:${length.toFixed(3)}`

    let mesh = meshMap.get(w.id)
    if (!mesh) {
      mesh = new THREE.Mesh(
        buildGeometry(length, thickness, own),
        buildWallMaterial(color, resolvedMat, length),
      )
      mesh.userData.kind = 'wall'
      mesh.userData.id = w.id
      mesh.userData.fp = fp
      mesh.userData.texFp = texFp
      mesh.castShadow    = true
      mesh.receiveShadow = true
      scene.add(mesh)
      meshMap.set(w.id, mesh)
    } else {
      if (mesh.userData.fp !== fp) {
        mesh.geometry.dispose()
        mesh.geometry = buildGeometry(length, thickness, own)
        mesh.userData.fp = fp
      }
      if (mesh.userData.texFp !== texFp) {
        mesh.material.dispose()
        mesh.material = buildWallMaterial(color, resolvedMat, length)
        mesh.userData.texFp = texFp
      }
    }

    const yOffset = opts.levelOffsets?.get(w.levelId) ?? 0
    mesh.position.set((a.x + b.x) / 2, yOffset + WALL_HEIGHT / 2, (a.z + b.z) / 2)
    mesh.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x)

    // Solo / x-ray visibility — reset first so toggling off restores defaults.
    mesh.visible = true
    mesh.material.transparent = false
    mesh.material.opacity = 1
    const isActiveLevel = !w.levelId || w.levelId === opts.activeLevelId
    if (opts.solo) {
      mesh.visible = isActiveLevel
    } else if (opts.xray && !isActiveLevel) {
      const activeOffset = opts.levelOffsets?.get(opts.activeLevelId) ?? 0
      if (yOffset > activeOffset) {
        mesh.material.transparent = true
        mesh.material.opacity = 0.3
      }
    }

    syncOverlay(mesh, length, thickness, own)
  }
  removeMissing(scene, meshMap, present)
}

function buildGeometry(length, thickness, openings) {
  if (openings.length === 0) {
    return new THREE.BoxGeometry(length, WALL_HEIGHT, thickness)
  }
  try {
    return buildWallWithHoles(length, WALL_HEIGHT, thickness, openings)
  } catch (err) {
    console.warn('CSG hole cut failed — falling back to painted overlay', err)
    return new THREE.BoxGeometry(length, WALL_HEIGHT, thickness)
  }
}

function buildWallMaterial(color, resolvedMaterialId, lengthM) {
  const texInfo = getWallTexture(resolvedMaterialId, lengthM, WALL_HEIGHT)
  if (!texInfo) {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.75, metalness: 0.0 })
  }
  return new THREE.MeshStandardMaterial({
    map: texInfo.map,
    color: new THREE.Color(texInfo.selfColored ? '#ffffff' : color),
    roughness: texInfo.roughness,
    metalness: 0.0,
  })
}

function buildFloorMaterial(color, floorMatId) {
  const texInfo = getFloorTexture(floorMatId)
  return new THREE.MeshStandardMaterial({
    map: texInfo?.map ?? null,
    color: new THREE.Color(texInfo?.selfColored ? '#ffffff' : color),
    side: THREE.DoubleSide,
    roughness: texInfo?.roughness ?? 0.9,
  })
}

function buildCeilingMaterial(color, ceilingMatId) {
  // ceiling-wood gets the floor wood texture applied to the ceiling surface
  const texInfo = ceilingMatId === 'ceiling-wood' ? getFloorTexture('_wood') : null
  return new THREE.MeshStandardMaterial({
    map: texInfo?.map ?? null,
    color: new THREE.Color(texInfo?.selfColored ? '#ffffff' : color),
    side: THREE.DoubleSide,
    roughness: texInfo?.roughness ?? 0.9,
  })
}

function wallFingerprint(length, openings) {
  // Length goes in too — wall stretching invalidates any cut geometry.
  const parts = [length.toFixed(4)]
  for (const o of openings) {
    parts.push(`${o.id}:${o.type}:${o.position.toFixed(4)}:${o.width}:${o.height}:${o.sillHeight ?? 0}`)
  }
  return parts.join('|')
}

// Painted-rectangle overlay used when CSG silently produced a wall without
// holes (i.e., the box-geometry fallback path above ran). We always attach
// the overlay regardless; if CSG succeeded, the painted rect just sits
// flush on the surface and reads as a faint marker — better than nothing.
// Held as children of the wall mesh in local space.
function syncOverlay(wallMesh, length, thickness, openings) {
  // Remove any previous overlay children.
  const oldOverlay = wallMesh.children.find((c) => c.userData.kind === 'wall-overlay')
  if (oldOverlay) {
    wallMesh.remove(oldOverlay)
    oldOverlay.traverse?.((n) => {
      n.geometry?.dispose?.()
      n.material?.dispose?.()
    })
  }
  if (openings.length === 0) return

  // Skip overlay when CSG succeeded — only render fallback rectangles when
  // the geometry is the plain BoxGeometry (vertex count matches a 12-tri
  // box, 24 vertices). This avoids occluding the real holes.
  const isPlainBox = wallMesh.geometry.attributes.position.count === 24
  if (!isPlainBox) return

  const overlay = new THREE.Group()
  overlay.userData.kind = 'wall-overlay'
  for (const o of openings) {
    const wM = o.width
    const hM = o.height
    const sill = o.type === 'window' ? (o.sillHeight ?? 0) : 0
    const cx = (o.position - 0.5) * length
    const cy = sill + hM / 2 - WALL_HEIGHT / 2
    const color = o.type === 'door' ? 0x1f2937 : 0x60a5fa
    for (const side of [1, -1]) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(wM, hM),
        new THREE.MeshStandardMaterial({
          color, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
        }),
      )
      plane.position.set(cx, cy, side * (thickness / 2 + 0.001))
      if (side < 0) plane.rotation.y = Math.PI
      overlay.add(plane)
    }
  }
  wallMesh.add(overlay)
}

// Add / update / remove room floor meshes. Each room is a 2D polygon in
// Konva coords; we triangulate it with `THREE.ShapeGeometry` (earcut under
// the hood), lay it flat on the floor at a small Y offset above the global
// ground plane, and tint it with the floor material's color (or a neutral
// default when the room is unmaterialed).
//
// `colorForId(id)` lets the caller resolve material colour from the store
// without this module importing Zustand. Returns a hex string.
//
// The room's `id` is the vertex fingerprint from roomDetection — same id
// implies identical geometry, so geometry is built once per id; only the
// material color is updated on later renders.
const FLOOR_OFFSET_Y = 0.01

// levelOffsets: Map<levelId, Y_base_metres> from computeLevelOffsets.
// opts: { solo?: bool, activeLevelId?: string }
// Rooms may carry an optional `stairHoles` array — each element is an array
// of {x,y} corners (in shape-space metres) for a stair footprint to cut out.
export function reconcileRooms(scene, rooms, meshMap, colorForId, levelOffsets, opts = {}, floorMatIdFor = null) {
  const present = new Set()
  for (const r of rooms) {
    present.add(r.id)
    const color = colorForId(r.id)
    const floorMatId = floorMatIdFor?.(r.id) ?? null
    const matFp = `${color}:${floorMatId ?? ''}`
    const yOffset = levelOffsets?.get(r.levelId) ?? 0
    const fp = holesFp(r.stairHoles)

    let mesh = meshMap.get(r.id)
    if (!mesh) {
      const geo = new THREE.ShapeGeometry(buildRoomShape(r))
      const mat = buildFloorMaterial(color, floorMatId)
      mesh = new THREE.Mesh(geo, mat)
      // Rotate +π/2 around X: Shape's local Y maps to world Z, matching the
      // Konva→Three coord rule (Konva-y → Three-z). Face normal points down
      // after this rotation, which is why the material is DoubleSide.
      mesh.rotation.x = Math.PI / 2
      mesh.userData.kind = 'room'
      mesh.userData.id = r.id
      mesh.userData.matFp = matFp
      mesh.userData.holesFp = fp
      mesh.receiveShadow = true
      scene.add(mesh)
      meshMap.set(r.id, mesh)
    } else {
      if (mesh.userData.holesFp !== fp) {
        mesh.geometry.dispose()
        mesh.geometry = new THREE.ShapeGeometry(buildRoomShape(r))
        mesh.userData.holesFp = fp
      }
      if (mesh.userData.matFp !== matFp) {
        mesh.material.dispose()
        mesh.material = buildFloorMaterial(color, floorMatId)
        mesh.userData.matFp = matFp
      }
    }
    // Always update Y — handles level height changes without a full rebuild.
    mesh.position.y = yOffset + FLOOR_OFFSET_Y
    mesh.visible = !opts.solo || !r.levelId || r.levelId === opts.activeLevelId
  }
  removeMissing(scene, meshMap, present)
}

// Builds a THREE.Shape for the room polygon, with optional stair holes cut out.
// Hole corners are in shape-space metres (same coordinate system as the shape).
function buildRoomShape(r) {
  const shape = new THREE.Shape()
  shape.moveTo(r.verts[0].x * KONVA_TO_THREE, r.verts[0].y * KONVA_TO_THREE)
  for (let i = 1; i < r.verts.length; i++) {
    shape.lineTo(r.verts[i].x * KONVA_TO_THREE, r.verts[i].y * KONVA_TO_THREE)
  }
  if (r.stairHoles?.length) {
    for (const corners of r.stairHoles) {
      const hole = new THREE.Path()
      hole.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < corners.length; i++) hole.lineTo(corners[i].x, corners[i].y)
      hole.closePath()
      shape.holes.push(hole)
    }
  }
  return shape
}

const CEILING_OFFSET_Y = -0.01  // slight below-surface offset to avoid z-fighting with walls

// Add / update / remove ceiling meshes. Mirrors reconcileRooms but positioned
// at the top of each level (levelOffset + levelHeight) and uses ceilingMaterial.
//
// Stair holes cut into the ceiling at the level the stairs DEPART FROM
// (the stairs go up through the ceiling, so r.ceilingStairHoles is used).
//
// `colorForId(id)` resolves ceiling color from the store.
// opts: { solo?, activeLevelId?, visible? }
export function reconcileCeilings(scene, rooms, meshMap, colorForId, levelOffsets, levels, opts = {}, ceilingMatIdFor = null) {
  const present = new Set()
  if (opts.visible === false) {
    removeMissing(scene, meshMap, present)
    return
  }

  // Build level height map
  const levelHeightMap = new Map()
  for (const lv of (levels ?? [])) levelHeightMap.set(lv.id, lv.height ?? 2.7)

  for (const r of rooms) {
    const ceilId = `ceil:${r.id}`
    present.add(ceilId)
    const color = colorForId(r.id)
    const ceilMatId = ceilingMatIdFor?.(r.id) ?? null
    const matFp = `${color}:${ceilMatId ?? ''}`
    const yOffset = levelOffsets?.get(r.levelId) ?? 0
    const levelHeight = levelHeightMap.get(r.levelId) ?? 2.7
    const fp = holesFp(r.ceilingStairHoles)

    let mesh = meshMap.get(ceilId)
    if (!mesh) {
      const shape = buildRoomShapeWithHoles(r, 'ceilingStairHoles')
      const geo = new THREE.ShapeGeometry(shape)
      const mat = buildCeilingMaterial(color, ceilMatId)
      mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = Math.PI / 2
      mesh.userData.kind = 'ceiling'
      mesh.userData.id = ceilId
      mesh.userData.matFp = matFp
      mesh.userData.holesFp = fp
      scene.add(mesh)
      meshMap.set(ceilId, mesh)
    } else {
      if (mesh.userData.holesFp !== fp) {
        mesh.geometry.dispose()
        mesh.geometry = new THREE.ShapeGeometry(buildRoomShapeWithHoles(r, 'ceilingStairHoles'))
        mesh.userData.holesFp = fp
      }
      if (mesh.userData.matFp !== matFp) {
        mesh.material.dispose()
        mesh.material = buildCeilingMaterial(color, ceilMatId)
        mesh.userData.matFp = matFp
      }
    }
    mesh.position.y = yOffset + levelHeight + CEILING_OFFSET_Y
    mesh.visible = !opts.solo || !r.levelId || r.levelId === opts.activeLevelId
  }
  removeMissing(scene, meshMap, present)
}

// Variant of buildRoomShape that uses a configurable holes field name.
function buildRoomShapeWithHoles(r, holesField) {
  const shape = new THREE.Shape()
  shape.moveTo(r.verts[0].x * KONVA_TO_THREE, r.verts[0].y * KONVA_TO_THREE)
  for (let i = 1; i < r.verts.length; i++) {
    shape.lineTo(r.verts[i].x * KONVA_TO_THREE, r.verts[i].y * KONVA_TO_THREE)
  }
  const holes = r[holesField]
  if (holes?.length) {
    for (const corners of holes) {
      const hole = new THREE.Path()
      hole.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < corners.length; i++) hole.lineTo(corners[i].x, corners[i].y)
      hole.closePath()
      shape.holes.push(hole)
    }
  }
  return shape
}

function removeMissing(scene, meshMap, present) {
  for (const [id, obj] of meshMap) {
    if (!present.has(id)) {
      // Furniture entries are Groups; walls/rooms are Meshes. Group-safe.
      if (obj.userData.cancelLoad) obj.userData.cancelLoad()
      scene.remove(obj)
      disposeSubtree(obj)
      meshMap.delete(id)
    }
  }
}

export function disposeAll(scene, meshMap) {
  for (const obj of meshMap.values()) {
    if (obj.userData.cancelLoad) obj.userData.cancelLoad()
    scene.remove(obj)
    disposeSubtree(obj)
  }
  meshMap.clear()
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
