import useStore from '../store/useStore'
import { clientToWorld } from './useViewport'
import { OPENING_DRAG_MIME } from '../components/canvas/openingsCatalog'
import { nearestWallSnap } from '../components/canvas/openingGeometry'

// Same shape as `useFurnitureDrop` (returns `{ onDragOver, onDragLeave,
// onDrop }`) but the dragover projects the cursor onto the nearest wall
// rather than snapping to the grid. The wall-snap state is carried in the
// dragGhost's optional `wallId` + `position` fields so DragGhost can
// render the preview oriented along the parent wall.
//
// Drop is gated on snap success — drops far from any wall are ignored.
// addOpening's structured `{ ok, reason }` return surfaces overlap +
// wall-too-short cases as a toast instead of silently failing.
const SNAP_SCREEN_PX = 28 // pointer must be within ~28 screen px of a wall

export default function useOpeningDrop(containerRef, view) {
  const walls = useStore((s) => s.walls)
  const addOpening = useStore((s) => s.addOpening)
  const setDragGhostPos = useStore((s) => s.setDragGhostPos)
  const clearDragGhost = useStore((s) => s.clearDragGhost)
  const pushToast = useStore((s) => s.pushToast)

  function findSnap(clientX, clientY) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    const world = clientToWorld(clientX, clientY, rect, view)
    const snap = nearestWallSnap(world, walls, SNAP_SCREEN_PX / view.scale)
    return { world, snap }
  }

  return {
    onDragOver(e) {
      if (!e.dataTransfer.types.includes(OPENING_DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      const f = findSnap(e.clientX, e.clientY)
      if (!f) return
      if (f.snap) {
        setDragGhostPos(f.snap.point.x, f.snap.point.y, {
          wallId: f.snap.wallId,
          position: f.snap.position,
        })
      } else {
        // Show ghost at cursor with no wallId — DragGhost renders "invalid".
        setDragGhostPos(f.world.x, f.world.y, { wallId: null, position: null })
      }
    },
    onDragLeave(e) {
      if (!containerRef.current?.contains(e.relatedTarget)) clearDragGhost()
    },
    onDrop(e) {
      const type = e.dataTransfer.getData(OPENING_DRAG_MIME)
      if (!type) return
      e.preventDefault()
      const f = findSnap(e.clientX, e.clientY)
      clearDragGhost()
      if (!f?.snap) {
        pushToast('Drop a door or window directly on a wall.', 'warn')
        return
      }
      const result = addOpening(type, f.snap.wallId, f.snap.position)
      if (!result.ok) pushToast(result.reason, 'warn')
    },
  }
}
