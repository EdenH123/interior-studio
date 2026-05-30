import { Group, Line } from 'react-konva'
import { WALL_THICKNESS } from './constants'
import { wallColorFor } from './wallMaterials'

// A wall is drawn as one Konva Line by default, or as N+1 segments around
// any openings on it. The caller (CanvasArea) computes segments via
// `wallSegmentsForRendering` and passes them in — Wall.jsx stays unaware
// of openings beyond knowing how to draw a list of segments.
//
// Selection + delete handlers live on the Group so clicks on any segment
// of the wall behave identically.
export default function Wall({ wall, segments, onContextMenu, onClick, onShiftSelect, onTranslateDrag, selected, drawMode }) {
  const stroke = selected ? '#3b82f6' : wallColorFor(wall)
  const sw = WALL_THICKNESS
  const hit = Math.max(WALL_THICKNESS, 16)

  // Single-segment fast path keeps the simple-wall render unchanged from
  // the pre-openings build — same hit area, same stroke params.
  const segs = segments && segments.length > 0
    ? segments
    : [{ x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 }]

  // Press on a SELECTED wall and drag → translate the entire current
  // selection (walls + furniture + areas/pools/voids). Window listeners so
  // the drag survives the cursor leaving any one wall hit-region; mouseup
  // without movement falls through to the click handler (which selects).
  const onMouseDown = (e) => {
    if (e.evt.button !== 0) return
    if (!selected || drawMode) return
    if (e.evt.shiftKey || !onTranslateDrag) return
    e.cancelBubble = true
    const stage = e.target.getStage()
    let last = { x: e.evt.clientX, y: e.evt.clientY }
    const onMove = (ev) => {
      const scale = stage?.scaleX() || 1
      const dx = (ev.clientX - last.x) / scale
      const dy = (ev.clientY - last.y) / scale
      if (dx !== 0 || dy !== 0) {
        onTranslateDrag(dx, dy)
        last = { x: ev.clientX, y: ev.clientY }
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <Group
      onContextMenu={(e) => { e.evt.preventDefault(); onContextMenu?.(wall.id) }}
      onMouseDown={onMouseDown}
      onClick={(e) => {
        if (e.evt.button === 0) {
          // In draw mode (or with Alt held) a wall click starts a new draw
          // chain from the projected point on the wall, handled by the
          // stage's onMouseDown. Skip selection here so the click only draws.
          if (drawMode || e.evt.altKey) return
          if (e.evt.shiftKey) onShiftSelect?.(wall.id)
          else onClick?.(wall.id)
        }
      }}
    >
      {segs.map((s, i) => (
        <Line
          key={i}
          name="wall-body"
          points={[s.x1, s.y1, s.x2, s.y2]}
          stroke={stroke} strokeWidth={sw} lineCap="square"
          hitStrokeWidth={hit}
        />
      ))}
    </Group>
  )
}
