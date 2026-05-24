import useStore from '../store/useStore'
import {
  SNAP_RADIUS_SCREEN, snapTo90, snapTo45, findNearestSnapPoint, snapParallelWallLength,
} from '../components/canvas/constants'

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
export default function useDrawWalls(stageRef, viewScale, spaceDown, shiftDown = false, altDown = false) {
  const walls = useStore((s) => s.walls)
  const calibration = useStore((s) => s.calibration)
  const drawStart = useStore((s) => s.drawStart)
  const setDrawStart = useStore((s) => s.setDrawStart)
  const addWall = useStore((s) => s.addWall)
  const clearSelection = useStore((s) => s.clearSelection)

  return function handleStageMouseDown(e) {
    const evt = e.evt
    if (evt.button === 1 || (evt.button === 0 && spaceDown)) return
    if (evt.button !== 0) return
    if (calibration) return
    // Allow shape clicks when a wall chain is in progress — the closing click
    // often lands on a wall shape near the snap endpoint.
    if (e.target !== stageRef.current && !drawStart) return
    clearSelection()
    const p = stageRef.current.getRelativePointerPosition()
    if (!p) return
    const threshold = SNAP_RADIUS_SCREEN / viewScale
    const snap = findNearestSnapPoint(p, walls, threshold)
    if (!drawStart) {
      setDrawStart(snap ?? p)
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
      end = (closeEndpoint?.kind === 'endpoint' ? closeEndpoint : null)
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
