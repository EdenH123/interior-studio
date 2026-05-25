import * as THREE from 'three'

const CLICK_VS_DRAG_PX = 4

// Wires raycaster-based mesh picking to the renderer canvas. Returns a
// cleanup function the caller invokes on unmount.
//
// Behaviour: we track pointerdown coordinates and only treat a subsequent
// `click` event as a selection if the pointer moved less than 4 px in
// between. Above that it's an OrbitControls orbit/pan drag and we ignore
// it. Clicking a mesh dispatches `onSelect(kind, id)` from its userData;
// clicking empty space (no intersection) dispatches `onClear()`.
//
// `meshMaps` is the live array of Maps the hook owns (wall, furniture,
// room mesh maps). We snapshot values at click time, not subscription time,
// so newly-added meshes become click targets immediately.
export function attachPicking(renderer, camera, meshMaps, { onSelect, onClear, onToggleDoor, onToggleWindow }) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pressX = 0
  let pressY = 0

  const onPointerDown = (e) => { pressX = e.clientX; pressY = e.clientY }

  const onClick = (e) => {
    if (Math.hypot(e.clientX - pressX, e.clientY - pressY) > CLICK_VS_DRAG_PX) return
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const targets = []
    for (const map of meshMaps) for (const obj of map.values()) targets.push(obj)
    // Recursive=true so the ray descends into furniture Groups (which may
    // hold either a Box mesh fallback or a loaded GLB scene). Walls and
    // rooms are still plain Meshes — recursive on them is a no-op.
    const hits = raycaster.intersectObjects(targets, true)
    if (hits.length === 0) { onClear(); return }
    // The hit object is the leaf Mesh. Walk up to find the ancestor that
    // carries kind+id (the Group for furniture, the Mesh itself for walls/rooms).
    let node = hits[0].object
    while (node && !node.userData?.kind) node = node.parent
    const kind = node?.userData?.kind
    const id = node?.userData?.id
    if (kind && id) {
      if (kind === 'door' && onToggleDoor) onToggleDoor(id)
      else if (kind === 'window' && node.userData.type === 'window-casement' && onToggleWindow) onToggleWindow(id)
      else onSelect(kind, id)
    }
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('click', onClick)
  return () => {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('click', onClick)
  }
}
