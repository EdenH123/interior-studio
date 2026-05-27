import useStore from '../store/useStore'
import {
  SNAP_RADIUS_SCREEN, snapTo90, snapTo45, findNearestSnapPoint, snapParallelWallLength,
} from '../components/canvas/constants'
import { nearestWallSnap } from '../components/canvas/openingGeometry'

// Owns the click-to-draw-walls flow. Returns a handler for the Stage's
// onMouseDown that:
//   - bails when calibration is active
//   - bails when the click landed on a shape AND no wall chain is active
//     (when drawing IS active, shape clicks are allowed so a closing click
//     on a wall endpoint shape is not silently dropped — Issue 2 fix)
//   - sets `drawStart` on the first click (snapping to an existing wall
//     endpoint/midpoint if cursor is within range)
//   - on the second click, commits a wall using a three-tier snap:
//       1. raw cursor endpoint/midpoint snap (existing behaviour)
//       2. endpoint snap on the direction-locked position — catches
//          "close rectangle" clicks where the cursor isn't precisely on
//          the endpoint but the snapped direction points right at it (Issue 1)
//       3. parallel-wall length snap — snaps the length to match a parallel
//          existing wall of similar length (Issue 1)
//     then either advances the chain or ends it on a zero-length commit
export default function useDrawWalls(stageRef, viewScale, shiftDown = false, altDown = false) {
  const walls = useStore((s) => s.walls)
  const calibration = useStore((s) => s.calibration)
  const activeTool = useStore((s) => s.activeTool)
  const drawStart = useStore((s) => s.drawStart)
  const setDrawStart = useStore((s) => s.setDrawStart)
  const addWall = useStore((s) => s.addWall)
  const clearSelection = useStore((s) => s.clearSelection)

  return function handleStageMouseDown(e) {
    const evt = e.evt
    if (evt.button === 1) return
    if (evt.button !== 0) return
    if (calibration) return
    if (activeTool === 'select') return
    // Allow shape clicks when a wall chain is in progress, when the click
    // landed on a room polygon (enables starting interior partition walls
    // by clicking inside an existing room), when it landed on an existing
    // wall body (in draw mode a wall click starts a new chain from that
    // point instead of selecting the wall), or when the user is holding Alt.
    // In all these cases the start point projects onto the wall, so
    // T-junctions are one click.
    const targetIsRoom = e.target?.getAttr?.('name') === 'room-fill'
    const targetIsWall = e.target?.getAttr?.('name') === 'wall-body'
    if (e.target !== stageRef.current && !drawStart && !targetIsRoom && !targetIsWall && !altDown) return
    clearSelection()
    const p = stageRef.current.getRelativePointerPosition()
    if (!p) return
    const threshold = SNAP_RADIUS_SCREEN / viewScale
    const snap = findNearestSnapPoint(p, walls, threshold)
    if (!drawStart) {
      // Endpoint/midpoint snap wins. Otherwise, if the click landed on a
      // wall body (or Alt is held), project the cursor onto that wall so the
      // chain starts exactly on the wall.
      let start = snap ?? p
      if (!snap && (altDown || targetIsWall) && e.target !== stageRef.current) {
        const wallProj = nearestWallSnap(p, walls, Infinity)
        if (wallProj) start = { x: wallProj.point.x, y: wallProj.point.y }
      }
      setDrawStart(start)
      return
    }
    let end
    if (snap) {
      end = snap
    } else {
      const snapFn = altDown ? ((_s, e) => e) : shiftDown ? snapTo90 : snapTo45
      const dirSnapped = snapFn(drawStart, p)
      // Try endpoint snap from the direction-locked position — catches
      // near-miss rectangle closes where the raw cursor misses the threshold.
      const closeEndpoint = findNearestSnapPoint(dirSnapped, walls, threshold)
      // T-junction body snap: if cursor is near a wall line (but no endpoint
      // was matched), project exactly onto that wall. This lets a divider wall
      // terminate precisely on an outer wall so room detection sees two faces.
      // Exclude walls whose endpoint coincides with drawStart to avoid snapping
      // back onto the originating wall.
      let bodySnapPt = null
      if (!closeEndpoint) {
        const startWallIds = new Set(
          walls
            .filter((w) =>
              Math.hypot(w.x1 - drawStart.x, w.y1 - drawStart.y) < threshold ||
              Math.hypot(w.x2 - drawStart.x, w.y2 - drawStart.y) < threshold,
            )
            .map((w) => w.id),
        )
        const wallsForBody = walls.filter((w) => !startWallIds.has(w.id))
        const bodySnap = nearestWallSnap(p, wallsForBody, threshold)
        if (bodySnap) bodySnapPt = bodySnap.point
      }
      end = (closeEndpoint?.kind === 'endpoint' ? closeEndpoint : null)
            ?? bodySnapPt
            ?? snapParallelWallLength(drawStart, dirSnapped, walls, threshold)
    }
    if (Math.hypot(end.x - drawStart.x, end.y - drawStart.y) > 1) {
      addWall(drawStart.x, drawStart.y, end.x, end.y)
      setDrawStart(end)
    } else {
      setDrawStart(null)
    }
  }
}
