import { useRef } from 'react'
import * as THREE from 'three'
import useStore from '../store/useStore'
import { FURNITURE_DRAG_MIME } from '../components/Sidebar'
import { OPENING_DRAG_MIME, getOpeningSpec } from '../components/canvas/openingsCatalog'
import { fitOpeningWidth } from '../components/canvas/openingGeometry'
import { railingWallPlacement } from '../components/canvas/wallSnapGeometry'
import { getFurnitureSpec } from '../components/canvas/furnitureCatalog'
import { CUSTOM_MODEL_DRAG_MIME } from './useCustomModelDrop'

// 1 Konva px = 0.02 Three units (50 px = 1 m)
const K2T = 0.02
const SNAP_WORLD = 0.5   // snap to 0.5 Three units = 0.5 m
const WALL_HEIGHT = 2.4  // must stay in sync with sceneReconcilers.js

const _raycaster    = new THREE.Raycaster()
const _floorPlane   = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _intersection = new THREE.Vector3()

function snapHalf(v) { return Math.round(v / SNAP_WORLD) * SNAP_WORLD }

// Convert Three world XZ → Konva world XY
function threeToKonva(tx, tz) {
  return { x: tx / K2T, y: tz / K2T }
}

// Raycast onto the floor plane (y=0). Returns snapped { x, y } in Three units, or null.
function raycastFloor(containerRef, stateRef, clientX, clientY) {
  if (!stateRef.current || !containerRef.current) return null
  const rect = containerRef.current.getBoundingClientRect()
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1
  const ny = -((clientY - rect.top) / rect.height) * 2 + 1
  _raycaster.setFromCamera({ x: nx, y: ny }, stateRef.current.camera)
  const hit = _raycaster.ray.intersectPlane(_floorPlane, _intersection)
  if (!hit) return null
  return { x: snapHalf(_intersection.x), y: snapHalf(_intersection.z) }
}

// Raycast against wall meshes. Returns { wallId, wallMesh, point } or null.
// Walks up parent chain to handle wall-overlay child meshes.
function raycastWall(containerRef, stateRef, clientX, clientY) {
  if (!stateRef.current || !containerRef.current) return null
  const rect = containerRef.current.getBoundingClientRect()
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1
  const ny = -((clientY - rect.top) / rect.height) * 2 + 1
  _raycaster.setFromCamera({ x: nx, y: ny }, stateRef.current.camera)
  const hits = _raycaster.intersectObjects(stateRef.current.scene.children, true)
  for (const hit of hits) {
    let obj = hit.object
    while (obj && obj.userData.kind !== 'wall') obj = obj.parent
    if (obj?.userData.kind === 'wall') {
      return { wallId: obj.userData.id, wallMesh: obj, point: hit.point.clone() }
    }
  }
  return null
}

// Project a Three world hit point onto a Konva wall to get the 0–1 normalised
// position along the wall (used by addOpening). Exported for testing.
export function wallPositionFrom(wallId, threePoint) {
  const walls = useStore.getState().walls
  const wall = walls.find((w) => w.id === wallId)
  if (!wall) return 0.5
  const kx = threePoint.x / K2T
  const ky = threePoint.z / K2T
  const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1
  const len2 = dx * dx + dy * dy
  if (len2 < 0.001) return 0.5
  return Math.max(0.01, Math.min(0.99, ((kx - wall.x1) * dx + (ky - wall.y1) * dy) / len2))
}

function createFurnitureGhostMesh(spec) {
  const w = (spec?.width  ?? 0.8) * 50 * K2T
  const d = (spec?.depth  ?? 0.8) * 50 * K2T
  const h = (spec?.height ?? 0.8) * K2T
  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6, transparent: true, opacity: 0.45, depthWrite: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = h / 2
  return mesh
}

// Opening ghost: thin slab displayed flush on the wall face at cursor XZ.
function createOpeningGhostMesh(spec) {
  const w = (spec?.width  ?? 0.9) * 50 * K2T
  const h = spec?.height ?? 2.1
  const geo = new THREE.BoxGeometry(w, h, 0.06)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6, transparent: true, opacity: 0.5, depthWrite: false,
  })
  return new THREE.Mesh(geo, mat)
}

// Handles sidebar drag-and-drop directly onto the 3D viewer canvas.
// Supports both furniture (floor-snap) and opening (wall-snap) drags.
export default function useFurnitureDrop3D(containerRef, stateRef) {
  const ghostRef     = useRef(null)
  const ghostKindRef = useRef(null)  // 'furniture' | 'opening' | null

  const addFurniture         = useStore((s) => s.addFurniture)
  const addFurnitureWithSpec = useStore((s) => s.addFurnitureWithSpec)
  const addOpening           = useStore((s) => s.addOpening)
  const dragGhost            = useStore((s) => s.dragGhost)
  const customModels         = useStore((s) => s.customModels)
  const pushToast            = useStore((s) => s.pushToast)

  function removeGhost() {
    if (ghostRef.current && stateRef.current) {
      stateRef.current.scene.remove(ghostRef.current)
      ghostRef.current.geometry.dispose()
      ghostRef.current.material.dispose()
    }
    ghostRef.current = null
    ghostKindRef.current = null
  }

  return {
    onDragOver(e) {
      const isFurniture   = e.dataTransfer.types.includes(FURNITURE_DRAG_MIME)
      const isOpening     = e.dataTransfer.types.includes(OPENING_DRAG_MIME)
      const isCustomModel = e.dataTransfer.types.includes(CUSTOM_MODEL_DRAG_MIME)
      if (!isFurniture && !isOpening && !isCustomModel) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      if (!stateRef.current) return

      if (isFurniture || isCustomModel) {
        const spec = dragGhost
          ? (getFurnitureSpec(dragGhost.type) ?? dragGhost)
          : null
        // Railings (wallTop) snap onto the TOP of the nearest wall.
        if (spec?.wallTop) {
          const wallHit = raycastWall(containerRef, stateRef, e.clientX, e.clientY)
          if (wallHit) {
            if (ghostKindRef.current !== 'furniture') {
              removeGhost()
              ghostRef.current = createFurnitureGhostMesh(spec)
              ghostKindRef.current = 'furniture'
              stateRef.current.scene.add(ghostRef.current)
            }
            const wall = useStore.getState().walls.find((w) => w.id === wallHit.wallId)
            const wallH = wall?.height ?? WALL_HEIGHT
            const yOffset = wallHit.wallMesh.position.y - wallH / 2
            const railH = spec?.height ?? 1.0
            const railY = yOffset + wallH + railH / 2
            if (wall) {
              // Preview the final placement: centered on the wall centerline.
              const place = railingWallPlacement(wall, 0.5)
              ghostRef.current.position.set(place.x * K2T, railY, place.y * K2T)
              ghostRef.current.rotation.y = -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1)
            } else {
              ghostRef.current.position.set(wallHit.point.x, railY, wallHit.point.z)
            }
            return
          }
          // No wall under cursor — fall through to a floor ghost.
        }
        const floorPos = raycastFloor(containerRef, stateRef, e.clientX, e.clientY)
        if (!floorPos) return
        if (ghostKindRef.current !== 'furniture') {
          removeGhost()
          ghostRef.current = createFurnitureGhostMesh(spec)
          ghostKindRef.current = 'furniture'
          stateRef.current.scene.add(ghostRef.current)
        }
        ghostRef.current.rotation.y = 0
        ghostRef.current.position.x = floorPos.x
        ghostRef.current.position.z = floorPos.y  // Three Z ← Konva Y

      } else {
        // Opening drag — snap to the nearest wall mesh.
        const wallHit = raycastWall(containerRef, stateRef, e.clientX, e.clientY)
        if (!wallHit) { removeGhost(); return }
        if (ghostKindRef.current !== 'opening') {
          removeGhost()
          const spec = dragGhost ? getOpeningSpec(dragGhost.type) : null
          ghostRef.current = createOpeningGhostMesh(spec)
          ghostKindRef.current = 'opening'
          stateRef.current.scene.add(ghostRef.current)
        }
        const spec      = dragGhost ? getOpeningSpec(dragGhost.type) : null
        const sillH     = spec?.sillHeight ?? 0
        const openingH  = spec?.height ?? 2.1
        // yOffset for this wall's level: wall mesh is centred at yOffset + WALL_HEIGHT/2
        const yOffset   = wallHit.wallMesh.position.y - WALL_HEIGHT / 2
        ghostRef.current.position.set(
          wallHit.point.x,
          yOffset + sillH + openingH / 2,
          wallHit.point.z,
        )
        // Rotate ghost to match the wall angle.
        const walls = useStore.getState().walls
        const wall = walls.find((w) => w.id === wallHit.wallId)
        if (wall) {
          ghostRef.current.rotation.y = -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1)
        }
      }
    },

    onDragLeave(e) {
      if (!containerRef.current?.contains(e.relatedTarget)) removeGhost()
    },

    onDrop(e) {
      e.preventDefault()
      const furnitureType  = e.dataTransfer.getData(FURNITURE_DRAG_MIME)
      const openingType    = e.dataTransfer.getData(OPENING_DRAG_MIME)
      const customModelId  = e.dataTransfer.getData(CUSTOM_MODEL_DRAG_MIME)
      removeGhost()

      if (furnitureType) {
        // Railings snap onto the top of a wall when dropped over one.
        const fspec = getFurnitureSpec(furnitureType)
        if (fspec?.wallTop) {
          const wallHit = raycastWall(containerRef, stateRef, e.clientX, e.clientY)
          if (wallHit) {
            const position = wallPositionFrom(wallHit.wallId, wallHit.point)
            const wall = useStore.getState().walls.find((w) => w.id === wallHit.wallId)
            if (wall) {
              const place = railingWallPlacement(wall, position)
              addFurniture(furnitureType, place.x, place.y,
                { rotation: place.rotation, mountWallId: wallHit.wallId, position })
              return
            }
          }
          // No wall — fall through to floor placement (free-standing railing).
        }
        const floorPos = raycastFloor(containerRef, stateRef, e.clientX, e.clientY)
        if (!floorPos) {
          pushToast('Could not find a floor surface to drop onto.', 'warn')
          return
        }
        const { x, y } = threeToKonva(floorPos.x, floorPos.y)
        addFurniture(furnitureType, x, y)

      } else if (customModelId) {
        const floorPos = raycastFloor(containerRef, stateRef, e.clientX, e.clientY)
        if (!floorPos) {
          pushToast('Could not find a floor surface to drop onto.', 'warn')
          return
        }
        const cm = customModels.find((m) => m.id === customModelId)
        if (!cm) return
        const { x, y } = threeToKonva(floorPos.x, floorPos.y)
        addFurnitureWithSpec({
          type: 'custom',
          label: cm.label,
          width: cm.width,
          depth: cm.depth,
          height: cm.height,
          color: cm.color,
          customModelId: cm.id,
        }, x, y)

      } else if (openingType) {
        const wallHit = raycastWall(containerRef, stateRef, e.clientX, e.clientY)
        if (!wallHit) {
          pushToast('Drag onto a wall to place a door or window.', 'warn')
          return
        }
        const position = wallPositionFrom(wallHit.wallId, wallHit.point)
        const result = addOpening(openingType, wallHit.wallId, position)
        if (result?.ok) return
        if (result?.code === 'too-short' || result?.code === 'overlap') {
          const wall = useStore.getState().walls.find((w) => w.id === wallHit.wallId)
          const fit = wall ? fitOpeningWidth(wall, useStore.getState().openings, position) : null
          if (fit) {
            pushToast(result.reason, 'warn', {
              label: 'Resize to fit',
              onClick: () => {
                const retry = addOpening(openingType, wallHit.wallId, fit.position, { width: fit.width })
                if (!retry?.ok) pushToast(retry?.reason ?? 'Could not place opening here.', 'warn')
              },
            })
            return
          }
        }
        pushToast(result?.reason ?? 'Could not place opening here.', 'warn')
      }
    },
  }
}
