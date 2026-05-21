import useStore from '../store/useStore'
import { GRID_SIZE } from '../components/canvas/constants'
import { clientToWorld, snapToGrid } from './useViewport'
import { FURNITURE_DRAG_MIME } from '../components/Sidebar'
import { getFurnitureSpec } from '../components/canvas/furnitureCatalog'
import { nearestWallSnap, wallMountedPlacement } from '../components/canvas/openingGeometry'

// Wall-mounted catalog items (wallMounted: true) behave like openings on
// dragover: they snap to the nearest wall within WALL_SNAP_SCREEN_PX and
// orient perpendicular to it. The ghost carries `wallSnap: bool` so
// DragGhost can render a red-X when no wall is in range. Non-wall-mounted
// items continue to snap to the grid as before.
const WALL_SNAP_SCREEN_PX = 60

export default function useFurnitureDrop(containerRef, view) {
  const walls       = useStore((s) => s.walls)
  const activeLevel = useStore((s) => s.activeLevel)
  const dragGhost   = useStore((s) => s.dragGhost)
  const addFurniture    = useStore((s) => s.addFurniture)
  const setDragGhostPos = useStore((s) => s.setDragGhostPos)
  const clearDragGhost  = useStore((s) => s.clearDragGhost)
  const pushToast       = useStore((s) => s.pushToast)

  // Only snap to walls on the active level.
  const levelWalls = walls.filter((w) => !w.levelId || w.levelId === activeLevel)

  function worldAt(clientX, clientY) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return clientToWorld(clientX, clientY, rect, view)
  }

  function findWallSnap(world) {
    return nearestWallSnap(world, levelWalls, WALL_SNAP_SCREEN_PX / view.scale)
  }

  return {
    onDragOver(e) {
      if (!e.dataTransfer.types.includes(FURNITURE_DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      if (!containerRef.current) return

      const world = worldAt(e.clientX, e.clientY)
      // dragGhost.type is set by setDragGhostType in the Sidebar's onDragStart,
      // so it's available here even though dataTransfer.getData is blocked.
      const spec = dragGhost ? getFurnitureSpec(dragGhost.type) : null
      if (spec?.wallMounted) {
        const snap = findWallSnap(world)
        if (snap) {
          const p = wallMountedPlacement(snap, spec.depth, world)
          setDragGhostPos(p.x, p.y, { wallSnap: true, rotation: p.rotation })
        } else {
          setDragGhostPos(world.x, world.y, { wallSnap: false, rotation: 0 })
        }
      } else {
        const p = snapToGrid(world, GRID_SIZE)
        setDragGhostPos(p.x, p.y, { wallSnap: undefined, rotation: undefined })
      }
    },

    onDragLeave(e) {
      if (!containerRef.current?.contains(e.relatedTarget)) clearDragGhost()
    },

    onDrop(e) {
      const type = e.dataTransfer.getData(FURNITURE_DRAG_MIME)
      if (!type) return
      e.preventDefault()

      const world = worldAt(e.clientX, e.clientY)
      clearDragGhost()
      const spec = getFurnitureSpec(type)
      if (spec?.wallMounted) {
        const snap = findWallSnap(world)
        if (!snap) {
          pushToast('Drop wall-mounted items against a wall.', 'warn')
          return
        }
        const p = wallMountedPlacement(snap, spec.depth, world)
        addFurniture(type, p.x, p.y, { rotation: p.rotation })
      } else {
        const p = snapToGrid(world, GRID_SIZE)
        addFurniture(type, p.x, p.y)
      }
    },
  }
}
