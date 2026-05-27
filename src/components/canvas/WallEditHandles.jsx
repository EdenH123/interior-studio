import { useRef } from 'react'
import { Group, Circle, Rect } from 'react-konva'
import { PIXELS_PER_METER } from './constants'

// Edit handles for the selected wall (select mode only):
//   • two CORNER circles at the endpoints — drag to move that vertex; every
//     wall sharing the corner follows (handled by the store), so the room
//     reshapes and stays closed.
//   • one EDGE square at the midpoint — drag to slide the whole wall
//     perpendicular; both endpoints move together so the adjoining walls
//     stretch to stay attached.
// Dragged geometry snaps to a 0.1 m grid.

const CORNER_PX = 11
const EDGE_PX = 12
const SNAP_STEP = 0.1 * PIXELS_PER_METER // 0.1 m → 5 px

const snap = (v) => Math.round(v / SNAP_STEP) * SNAP_STEP

export default function WallEditHandles({ wall, scale, onMove }) {
  return (
    <Group>
      <EdgeHandle wall={wall} scale={scale} onMove={onMove} />
      <CornerHandle corner={{ x: wall.x1, y: wall.y1 }} scale={scale} onMove={onMove} />
      <CornerHandle corner={{ x: wall.x2, y: wall.y2 }} scale={scale} onMove={onMove} />
    </Group>
  )
}

function CornerHandle({ corner, scale, onMove }) {
  const fromRef = useRef(null)
  const r = CORNER_PX / scale
  return (
    <Circle
      x={corner.x}
      y={corner.y}
      radius={r}
      fill="#ffffff"
      stroke="#3b82f6"
      strokeWidth={1.5 / scale}
      draggable
      onMouseEnter={(e) => { e.target.getStage().container().style.cursor = 'move' }}
      onMouseLeave={(e) => { e.target.getStage().container().style.cursor = 'default' }}
      onMouseDown={(e) => { e.cancelBubble = true }}
      onDragStart={(e) => { e.cancelBubble = true; fromRef.current = { x: corner.x, y: corner.y } }}
      onDragMove={(e) => {
        const node = e.target
        const to = { x: snap(node.x()), y: snap(node.y()) }
        node.position(to)
        if (fromRef.current) onMove([{ from: fromRef.current, to }])
        fromRef.current = to
      }}
      onDragEnd={(e) => { e.target.getStage().container().style.cursor = 'default' }}
    />
  )
}

function EdgeHandle({ wall, scale, onMove }) {
  const ref = useRef(null) // { e1, e2, mx, my, nx, ny, last1, last2 }
  const size = EDGE_PX / scale
  const mx = (wall.x1 + wall.x2) / 2
  const my = (wall.y1 + wall.y2) / 2
  return (
    <Rect
      x={mx - size / 2}
      y={my - size / 2}
      width={size}
      height={size}
      fill="#3b82f6"
      stroke="#ffffff"
      strokeWidth={1.5 / scale}
      cornerRadius={2 / scale}
      draggable
      onMouseEnter={(e) => { e.target.getStage().container().style.cursor = 'move' }}
      onMouseLeave={(e) => { e.target.getStage().container().style.cursor = 'default' }}
      onMouseDown={(e) => { e.cancelBubble = true }}
      onDragStart={(e) => {
        e.cancelBubble = true
        const dx = wall.x2 - wall.x1
        const dy = wall.y2 - wall.y1
        const len = Math.hypot(dx, dy) || 1
        const e1 = { x: wall.x1, y: wall.y1 }
        const e2 = { x: wall.x2, y: wall.y2 }
        ref.current = { e1, e2, mx, my, nx: -dy / len, ny: dx / len, last1: e1, last2: e2 }
      }}
      onDragMove={(e) => {
        const r = ref.current
        if (!r) return
        const node = e.target
        const cx = node.x() + size / 2
        const cy = node.y() + size / 2
        // Perpendicular offset of the dragged midpoint from the original one.
        const off = snap((cx - r.mx) * r.nx + (cy - r.my) * r.ny)
        const to1 = { x: r.e1.x + r.nx * off, y: r.e1.y + r.ny * off }
        const to2 = { x: r.e2.x + r.nx * off, y: r.e2.y + r.ny * off }
        onMove([{ from: r.last1, to: to1 }, { from: r.last2, to: to2 }])
        r.last1 = to1
        r.last2 = to2
        node.position({ x: (to1.x + to2.x) / 2 - size / 2, y: (to1.y + to2.y) / 2 - size / 2 })
      }}
      onDragEnd={(e) => { e.target.getStage().container().style.cursor = 'default' }}
    />
  )
}
