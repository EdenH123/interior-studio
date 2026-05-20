import useStore from '../store/useStore'
import { GRID_SIZE } from '../components/canvas/constants'
import { clientToWorld, snapToGrid } from './useViewport'
import { FURNITURE_DRAG_MIME } from '../components/Sidebar'

// Owns the HTML5 drag-and-drop handlers for the sidebar→canvas furniture
// flow. Returns an object spreadable onto the canvas container's <main>:
//
//   <main {...useFurnitureDrop(containerRef, view)}>
//
// Responsibilities:
//   • dragover  — snap the cursor to the grid in world coords and update
//                 the transient `dragGhost` position so the Konva ghost
//                 follows along.
//   • dragleave — only clear when the cursor actually leaves the
//                 container (child-boundary crossings also fire here).
//   • drop      — add the furniture at the snapped world position and
//                 clear the ghost.
export default function useFurnitureDrop(containerRef, view) {
  const addFurniture = useStore((s) => s.addFurniture)
  const setDragGhostPos = useStore((s) => s.setDragGhostPos)
  const clearDragGhost = useStore((s) => s.clearDragGhost)

  function snappedWorldAt(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect()
    const world = clientToWorld(clientX, clientY, rect, view)
    return snapToGrid(world, GRID_SIZE)
  }

  return {
    onDragOver(e) {
      if (!e.dataTransfer.types.includes(FURNITURE_DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      if (!containerRef.current) return
      const p = snappedWorldAt(e.clientX, e.clientY)
      setDragGhostPos(p.x, p.y)
    },
    onDragLeave(e) {
      if (!containerRef.current?.contains(e.relatedTarget)) clearDragGhost()
    },
    onDrop(e) {
      const type = e.dataTransfer.getData(FURNITURE_DRAG_MIME)
      if (!type) return
      e.preventDefault()
      const p = snappedWorldAt(e.clientX, e.clientY)
      addFurniture(type, p.x, p.y)
      clearDragGhost()
    },
  }
}
