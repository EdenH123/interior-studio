import useStore from '../store/useStore'
import { SNAP_RADIUS_SCREEN, snapTo90, findNearestSnapPoint } from '../components/canvas/constants'

// Owns the click-to-draw-walls flow. Returns a handler for the Stage's
// onMouseDown that:
//   - bails when calibration is active (its capture rect already swallows
//     clicks; this is belt-and-braces for background clicks)
//   - bails when the click landed on a shape (shapes drive their own
//     selection; the stage handler only runs the wall flow for background
//     clicks)
//   - sets `drawStart` on the first click (snapping to an existing wall
//     endpoint/midpoint if cursor is within range)
//   - on the second click, commits a wall, then either advances the chain
//     (setting `drawStart` to the new endpoint) or ends it (on a
//     zero-length click — same point twice)
export default function useDrawWalls(stageRef, viewScale, spaceDown) {
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
    if (e.target !== stageRef.current) return
    clearSelection()
    const p = stageRef.current.getRelativePointerPosition()
    if (!p) return
    const snap = findNearestSnapPoint(p, walls, SNAP_RADIUS_SCREEN / viewScale)
    if (!drawStart) {
      setDrawStart(snap ?? p)
      return
    }
    const end = snap ?? snapTo90(drawStart, p)
    if (Math.hypot(end.x - drawStart.x, end.y - drawStart.y) > 1) {
      addWall(drawStart.x, drawStart.y, end.x, end.y)
      setDrawStart(end)
    } else {
      setDrawStart(null)
    }
  }
}
