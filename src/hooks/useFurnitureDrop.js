import useStore from '../store/useStore'
import { GRID_SIZE } from '../components/canvas/constants'
import { clientToWorld, snapToGrid } from './useViewport'
import { FURNITURE_DRAG_MIME } from '../components/Sidebar'
import { getFurnitureSpec } from '../components/canvas/furnitureCatalog'
import { nearestWallSnap, wallMountedPlacement } from '../components/canvas/openingGeometry'
import { findWallSnap, railingWallPlacement } from '../components/canvas/wallSnapGeometry'
import { findStackTarget } from '../components/canvas/stackGeometry'

// Wall-mounted catalog items (wallMounted: true) behave like openings on
// dragover: they snap to the nearest wall within WALL_SNAP_SCREEN_PX and
// orient perpendicular to it. The ghost carries `wallSnap: bool` so
// DragGhost can render a red-X when no wall is in range. Non-wall-mounted
// items snap flush to the nearest wall face when within WALL_SNAP_SCREEN_PX.
const WALL_SNAP_SCREEN_PX = 60

export default function useFurnitureDrop(containerRef, view) {
  const walls       = useStore((s) => s.walls)
  const furniture   = useStore((s) => s.furniture)
  const activeLevel = useStore((s) => s.activeLevel)
  const dragGhost   = useStore((s) => s.dragGhost)
  const addFurniture    = useStore((s) => s.addFurniture)
  const updateFurniture = useStore((s) => s.updateFurniture)
  const setDragGhostPos = useStore((s) => s.setDragGhostPos)
  const clearDragGhost  = useStore((s) => s.clearDragGhost)
  const pushToast       = useStore((s) => s.pushToast)

  // Only snap to walls on the active level.
  const levelWalls = walls.filter((w) => !w.levelId || w.levelId === activeLevel)
  // Stack candidates: same-level furniture (filtered inside findStackTarget too,
  // but pre-filtering avoids walking irrelevant items every dragover frame).
  const levelFurniture = furniture.filter((f) => !f.levelId || f.levelId === activeLevel)

  function worldAt(clientX, clientY) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return clientToWorld(clientX, clientY, rect, view)
  }

  function findWallMountSnap(world) {
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
      if (spec?.wallTop) {
        // Railings snap onto the wall centerline (aligned along it), or drop
        // free-standing on the floor when no wall is in range (no red X).
        const snap = findWallMountSnap(world)
        if (snap) {
          const place = railingWallPlacement(snap.wall, snap.position)
          setDragGhostPos(place.x, place.y, { wallSnap: undefined, rotation: place.rotation })
        } else {
          const p = snapToGrid(world, GRID_SIZE)
          setDragGhostPos(p.x, p.y, { wallSnap: undefined, rotation: 0 })
        }
      } else if (spec?.wallMounted) {
        const snap = findWallMountSnap(world)
        if (snap) {
          const p = wallMountedPlacement(snap, spec.depth, world)
          setDragGhostPos(p.x, p.y, { wallSnap: true, rotation: p.rotation })
        } else {
          setDragGhostPos(world.x, world.y, { wallSnap: false, rotation: 0 })
        }
      } else {
        // Stack-on-furniture wins over wall snap when the cursor is inside
        // another item's footprint. Show the stack indicator on the ghost.
        const stackTarget = findStackTarget(world, null, levelFurniture)
        if (stackTarget) {
          setDragGhostPos(world.x, world.y, { wallSnap: undefined, rotation: undefined, stackOn: stackTarget.id })
          return
        }
        const p = snapToGrid(world, GRID_SIZE)
        const floorSnap = spec
          ? findWallSnap({ x: p.x, y: p.y, width: spec.width, depth: spec.depth }, levelWalls, view.scale, WALL_SNAP_SCREEN_PX)
          : null
        if (floorSnap) {
          setDragGhostPos(floorSnap.x, floorSnap.y, { wallSnap: undefined, rotation: floorSnap.rotation, stackOn: undefined })
        } else {
          setDragGhostPos(p.x, p.y, { wallSnap: undefined, rotation: undefined, stackOn: undefined })
        }
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
      if (spec?.wallTop) {
        const snap = findWallMountSnap(world)
        if (snap) {
          const place = railingWallPlacement(snap.wall, snap.position)
          addFurniture(type, place.x, place.y,
            { rotation: place.rotation, mountWallId: snap.wallId, position: snap.position })
        } else {
          const p = snapToGrid(world, GRID_SIZE)
          addFurniture(type, p.x, p.y)
        }
      } else if (spec?.wallMounted) {
        const snap = findWallMountSnap(world)
        if (!snap) {
          pushToast('Drop wall-mounted items against a wall.', 'warn')
          return
        }
        const p = wallMountedPlacement(snap, spec.depth, world)
        addFurniture(type, p.x, p.y, { rotation: p.rotation })
      } else {
        // Drop on top of another furniture → stack on it.
        const stackTarget = findStackTarget(world, null, levelFurniture)
        if (stackTarget) {
          const id = addFurniture(type, world.x, world.y, { rotation: 0 })
          if (id) updateFurniture(id, { stackedOn: stackTarget.id, levelId: stackTarget.levelId })
          return
        }
        const p = snapToGrid(world, GRID_SIZE)
        const floorSnap = spec
          ? findWallSnap({ x: p.x, y: p.y, width: spec.width, depth: spec.depth }, levelWalls, view.scale, WALL_SNAP_SCREEN_PX)
          : null
        if (floorSnap) {
          addFurniture(type, floorSnap.x, floorSnap.y, { rotation: floorSnap.rotation })
        } else {
          addFurniture(type, p.x, p.y)
        }
      }
    },
  }
}
