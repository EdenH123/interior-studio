import * as THREE from 'three'
import { KONVA_TO_THREE, konvaToFloor } from './threeMath'
import { WALL_THICKNESS } from '../canvas/constants'
import { wallColorFor } from '../canvas/wallMaterials'
import { buildWallWithHoles } from './wallCSG'

// reconcileFurniture lives in its own module because the GLB upgrade
// pipeline + Group-wrapped scene objects are substantial enough that they
// crowded this file. Re-exporting here keeps useThree's import unchanged.
export { reconcileFurniture } from './reconcileFurniture'

const WALL_HEIGHT = 2.4

// Add / update / remove wall meshes to match the store's walls array.
// `meshMap` is a Map<wallId, THREE.Mesh> owned by the caller (the hook).
// Walls with openings on them get CSG-cut geometry; the holes are painted
// as a translucent rectangle fallback when CSG fails (with a warn).
export function reconcileWalls(scene, walls, openings, meshMap) {
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

    let mesh = meshMap.get(w.id)
    if (!mesh) {
      mesh = new THREE.Mesh(
        buildGeometry(length, thickness, own),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(color) }),
      )
      mesh.userData.kind = 'wall'
      mesh.userData.id = w.id
      mesh.userData.color = color
      mesh.userData.fp = fp
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
      if (mesh.userData.color !== color) {
        mesh.material.color.set(color)
        mesh.userData.color = color
      }
    }
    mesh.position.set((a.x + b.x) / 2, WALL_HEIGHT / 2, (a.z + b.z) / 2)
    mesh.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x)

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

export function reconcileRooms(scene, rooms, meshMap, colorForId) {
  const present = new Set()
  for (const r of rooms) {
    present.add(r.id)
    const color = colorForId(r.id)

    let mesh = meshMap.get(r.id)
    if (!mesh) {
      const shape = new THREE.Shape()
      shape.moveTo(r.verts[0].x * KONVA_TO_THREE, r.verts[0].y * KONVA_TO_THREE)
      for (let i = 1; i < r.verts.length; i++) {
        shape.lineTo(r.verts[i].x * KONVA_TO_THREE, r.verts[i].y * KONVA_TO_THREE)
      }
      const geo = new THREE.ShapeGeometry(shape)
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        side: THREE.DoubleSide,
        roughness: 0.85,
      })
      mesh = new THREE.Mesh(geo, mat)
      // Rotate +π/2 around X: Shape's local Y maps to world Z, matching the
      // Konva→Three coord rule (Konva-y → Three-z). Face normal points down
      // after this rotation, which is why the material is DoubleSide.
      mesh.rotation.x = Math.PI / 2
      mesh.position.y = FLOOR_OFFSET_Y
      mesh.userData.kind = 'room'
      mesh.userData.id = r.id
      mesh.userData.color = color
      mesh.receiveShadow = true
      scene.add(mesh)
      meshMap.set(r.id, mesh)
    } else if (mesh.userData.color !== color) {
      mesh.material.color.set(color)
      mesh.userData.color = color
    }
  }
  removeMissing(scene, meshMap, present)
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
