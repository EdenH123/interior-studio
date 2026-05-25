// Wires pointer-drag movement for furniture items in the 3D viewer.
//
// Flow:
//   pointerdown on a *selected* furniture group → arm drag
//   pointermove  after moving >4 px              → activate drag, move mesh directly
//   pointerup                                    → commit final Konva pos via onDragEnd
//
// Direct mesh mutation during drag keeps motion smooth (no React overhead).
// The store write on pointerup brings the 2D canvas into sync once at the end.

import * as THREE from 'three'
import { KONVA_TO_THREE } from './threeMath'

const DRAG_START_PX = 4

export function attachFurnitureDrag(renderer, camera, furnMeshes, controls, { onDragEnd, getSelection, isAllowed }) {
  const raycaster = new THREE.Raycaster()
  const pointer   = new THREE.Vector2()
  const hitPt     = new THREE.Vector3()

  // candidate: hit a selected furniture on pointerdown but haven't moved enough yet
  // dragState:  drag is active
  let candidate = null
  let dragState  = null

  function ndc(e) {
    const r = renderer.domElement.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }
  }

  function hitFurniture(px) {
    pointer.set(px.x, px.y)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects([...furnMeshes.values()], true)
    if (!hits.length) return null
    let node = hits[0].object
    while (node && !node.userData?.kind) node = node.parent
    return node?.userData?.kind === 'furniture' ? { node, hit: hits[0] } : null
  }

  const onPointerDown = (e) => {
    if (e.button !== 0 || !(isAllowed?.() ?? true)) return
    const res = hitFurniture(ndc(e))
    if (!res) return
    const { node, hit } = res
    const id = node.userData.id
    const sel = getSelection()
    if (!sel?.items?.some((i) => i.kind === 'furniture' && i.id === id)) return
    candidate = {
      id,
      startX: e.clientX, startY: e.clientY,
      floorY: node.position.y,
      meshX:  node.position.x, meshZ: node.position.z,
      hitX:   hit.point.x,     hitZ:  hit.point.z,
    }
  }

  const onPointerMove = (e) => {
    if (!dragState && !candidate) {
      // Hover: show grab cursor over selected furniture
      const res = hitFurniture(ndc(e))
      if (res) {
        const sel = getSelection()
        const isSel = sel?.items?.some((i) => i.kind === 'furniture' && i.id === res.node.userData.id)
        renderer.domElement.style.cursor = isSel ? 'grab' : 'auto'
      } else {
        renderer.domElement.style.cursor = 'auto'
      }
      return
    }

    if (candidate && !dragState) {
      if (Math.hypot(e.clientX - candidate.startX, e.clientY - candidate.startY) < DRAG_START_PX) return
      // Activate
      dragState = {
        id: candidate.id,
        plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -candidate.floorY),
        offsetX: candidate.hitX - candidate.meshX,
        offsetZ: candidate.hitZ - candidate.meshZ,
      }
      candidate = null
      controls.enabled = false
      renderer.domElement.style.cursor = 'grabbing'
    }

    if (dragState) {
      pointer.set(ndc(e).x, ndc(e).y)
      raycaster.setFromCamera(pointer, camera)
      if (!raycaster.ray.intersectPlane(dragState.plane, hitPt)) return
      const group = furnMeshes.get(dragState.id)
      if (group) {
        group.position.x = hitPt.x - dragState.offsetX
        group.position.z = hitPt.z - dragState.offsetZ
      }
    }
  }

  const onPointerUp = () => {
    candidate = null
    if (!dragState) return
    const group = furnMeshes.get(dragState.id)
    if (group) {
      onDragEnd(dragState.id, group.position.x / KONVA_TO_THREE, group.position.z / KONVA_TO_THREE)
    }
    dragState = null
    controls.enabled = true
    renderer.domElement.style.cursor = 'auto'
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup',   onPointerUp)
  window.addEventListener('pointerup', onPointerUp)  // catch release outside canvas

  return () => {
    if (dragState) controls.enabled = true
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerup',   onPointerUp)
    window.removeEventListener('pointerup', onPointerUp)
  }
}
