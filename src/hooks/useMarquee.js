import { useRef, useState } from 'react'
import useStore from '../store/useStore'

// Items whose representative points fall inside { x1, y1, x2, y2 }.
// Walls: both endpoints must be inside. Furniture/openings: centroid/center.
function selectItemsInRect(rect, walls, furniture, openings) {
  const minX = Math.min(rect.x1, rect.x2)
  const maxX = Math.max(rect.x1, rect.x2)
  const minY = Math.min(rect.y1, rect.y2)
  const maxY = Math.max(rect.y1, rect.y2)
  const inside = (x, y) => x >= minX && x <= maxX && y >= minY && y <= maxY
  const items = []

  walls.forEach((w) => {
    if (inside(w.x1, w.y1) && inside(w.x2, w.y2))
      items.push({ kind: 'wall', id: w.id })
  })
  furniture.forEach((f) => {
    if (inside(f.x, f.y)) items.push({ kind: 'furniture', id: f.id })
  })
  openings.forEach((o) => {
    const wall = walls.find((w) => w.id === o.wallId)
    if (wall) {
      const cx = wall.x1 + (wall.x2 - wall.x1) * o.position
      const cy = wall.y1 + (wall.y2 - wall.y1) * o.position
      if (inside(cx, cy)) items.push({ kind: 'opening', id: o.id })
    }
  })
  return items
}

// Manages the marquee (drag-rectangle) selection on the Konva stage.
// Returns { marquee, onMouseDown, onMouseMove, onMouseUp } to wire into Stage.
//
// Marquee only activates on a background drag when not in draw mode
// (drawStart === null). On activation it calls setDrawStart(null) to cancel
// the accidental draw start that useDrawWalls already issued for the same
// mousedown event.
export default function useMarquee({ stageRef, setDrawStart }) {
  const anchor = useRef(null) // { wx, wy, sx, sy } world + screen coords at mousedown
  const active = useRef(false) // true once drag exceeds the 5-px threshold
  const [marquee, setMarquee] = useState(null) // { x1, y1, x2, y2 } in world coords

  const onMouseDown = (e) => {
    if (e.evt.button !== 0 || e.target !== stageRef.current) return
    // Only start a potential marquee when not already drawing walls
    if (useStore.getState().drawStart !== null) return
    const p = stageRef.current.getRelativePointerPosition()
    if (!p) return
    anchor.current = { wx: p.x, wy: p.y, sx: e.evt.clientX, sy: e.evt.clientY }
    active.current = false
  }

  const onMouseMove = (e) => {
    if (!anchor.current) return
    const p = stageRef.current?.getRelativePointerPosition()
    if (!p) return
    const dx = e.evt.clientX - anchor.current.sx
    const dy = e.evt.clientY - anchor.current.sy
    if (Math.hypot(dx, dy) > 5) {
      if (!active.current) {
        active.current = true
        // Cancel the draw start that useDrawWalls issued for this mousedown.
        setDrawStart(null)
      }
      setMarquee({ x1: anchor.current.wx, y1: anchor.current.wy, x2: p.x, y2: p.y })
    }
  }

  const onMouseUp = () => {
    if (active.current && marquee) {
      const { layers, walls, furniture, openings, setSelectionItems } = useStore.getState()
      const items = selectItemsInRect(
        marquee,
        layers.walls ? walls : [],
        layers.furniture ? furniture : [],
        layers.openings ? openings : [],
      )
      setSelectionItems(items)
    }
    anchor.current = null
    active.current = false
    setMarquee(null)
  }

  return { marquee, onMouseDown, onMouseMove, onMouseUp }
}
