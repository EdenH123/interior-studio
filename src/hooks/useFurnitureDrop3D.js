import { useRef } from 'react'
import * as THREE from 'three'
import useStore from '../store/useStore'
import { FURNITURE_DRAG_MIME } from '../components/Sidebar'
import { getFurnitureSpec } from '../components/canvas/furnitureCatalog'

// 1 Konva px = 0.02 Three units (50 px = 1 m)
const K2T = 0.02
const SNAP_WORLD = 0.5  // snap to 0.5 Three units = 0.5 m

const _raycaster   = new THREE.Raycaster()
const _floorPlane  = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _intersection = new THREE.Vector3()

function snapHalf(v) { return Math.round(v / SNAP_WORLD) * SNAP_WORLD }

// Convert Three world XZ → Konva world XY
function threeToKonva(tx, tz) {
  return { x: tx / K2T, y: tz / K2T }
}

// Raycast from cursor into the Three.js scene and intersect with floor plane (y=0).
// Returns { x, y } in Three world coords, or null if ray misses floor.
function raycastFloor(containerRef, stateRef, clientX, clientY) {
  if (!stateRef.current || !containerRef.current) return null
  const rect = containerRef.current.getBoundingClientRect()
  const nx = ((clientX - rect.left) / rect.width)  * 2 - 1
  const ny = -((clientY - rect.top)  / rect.height) * 2 + 1
  _raycaster.setFromCamera({ x: nx, y: ny }, stateRef.current.camera)
  const hit = _raycaster.ray.intersectPlane(_floorPlane, _intersection)
  if (!hit) return null
  return { x: snapHalf(_intersection.x), y: snapHalf(_intersection.z) }
}

// Ghost mesh that follows the cursor over the 3D floor during drag.
function createGhostMesh(spec) {
  const w = (spec?.width  ?? 0.8) * 50 * K2T
  const d = (spec?.depth  ?? 0.8) * 50 * K2T
  const h = (spec?.height ?? 0.8) * K2T
  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = h / 2
  return mesh
}

// Handles sidebar drag-and-drop directly onto the 3D viewer canvas.
// `containerRef` — ref to the Three.js container div
// `stateRef`     — ref returned by useThree, holds { scene, camera, ... }
export default function useFurnitureDrop3D(containerRef, stateRef) {
  const ghostRef = useRef(null)

  const addFurniture = useStore((s) => s.addFurniture)
  const dragGhost    = useStore((s) => s.dragGhost)
  const pushToast    = useStore((s) => s.pushToast)

  function removeGhost() {
    if (ghostRef.current && stateRef.current) {
      stateRef.current.scene.remove(ghostRef.current)
      ghostRef.current.geometry.dispose()
      ghostRef.current.material.dispose()
    }
    ghostRef.current = null
  }

  return {
    onDragOver(e) {
      if (!e.dataTransfer.types.includes(FURNITURE_DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      if (!stateRef.current) return

      const floorPos = raycastFloor(containerRef, stateRef, e.clientX, e.clientY)
      if (!floorPos) return

      // Create or move ghost
      if (!ghostRef.current) {
        const spec = dragGhost ? getFurnitureSpec(dragGhost.type) : null
        const mesh = createGhostMesh(spec)
        ghostRef.current = mesh
        stateRef.current.scene.add(mesh)
      }
      ghostRef.current.position.x = floorPos.x
      ghostRef.current.position.z = floorPos.y  // Three Z ← Konva Y
    },

    onDragLeave(e) {
      if (!containerRef.current?.contains(e.relatedTarget)) removeGhost()
    },

    onDrop(e) {
      const type = e.dataTransfer.getData(FURNITURE_DRAG_MIME)
      if (!type) return
      e.preventDefault()
      removeGhost()

      const floorPos = raycastFloor(containerRef, stateRef, e.clientX, e.clientY)
      if (!floorPos) {
        pushToast('Could not find a floor surface to drop onto.', 'warn')
        return
      }
      const { x, y } = threeToKonva(floorPos.x, floorPos.y)
      addFurniture(type, x, y)
    },
  }
}
