import { useRef } from 'react'
import { Group, Circle, Rect } from 'react-konva'
import { PIXELS_PER_METER } from './constants'

// Reshape handles for the selected outdoor area (select mode): a corner circle
// at each polygon vertex (drag to move it) and an edge square at each edge
// midpoint (drag to slide the whole side perpendicular). Dragged geometry
// snaps to a 0.1 m grid. `onMove(moves)` takes [{ index, x, y }] and is wired
// to the store's moveAreaVertices.
const CORNER_PX = 11
const EDGE_PX = 12
const SNAP_STEP = 0.1 * PIXELS_PER_METER
const snap = (v) => Math.round(v / SNAP_STEP) * SNAP_STEP

export default function AreaEditHandles({ area, scale, onMove }) {
  const v = area.verts
  if (!v || v.length < 2) return null
  return (
    <Group>
      {v.map((p, i) => {
        const j = (i + 1) % v.length
        return <EdgeHandle key={`e${i}`} i={i} j={j} a={p} b={v[j]} scale={scale} onMove={onMove} />
      })}
      {v.map((p, i) => (
        <CornerHandle key={`c${i}`} index={i} x={p.x} y={p.y} scale={scale} onMove={onMove} />
      ))}
    </Group>
  )
}

function CornerHandle({ index, x, y, scale, onMove }) {
  return (
    <Circle
      x={x} y={y} radius={CORNER_PX / scale}
      fill="#ffffff" stroke="#3b82f6" strokeWidth={1.5 / scale}
      draggable
      onMouseEnter={(e) => { e.target.getStage().container().style.cursor = 'move' }}
      onMouseLeave={(e) => { e.target.getStage().container().style.cursor = 'default' }}
      onMouseDown={(e) => { e.cancelBubble = true }}
      onDragStart={(e) => { e.cancelBubble = true }}
      onDragMove={(e) => {
        const node = e.target
        const to = { x: snap(node.x()), y: snap(node.y()) }
        node.position(to)
        onMove([{ index, x: to.x, y: to.y }])
      }}
      onDragEnd={(e) => { e.target.getStage().container().style.cursor = 'default' }}
    />
  )
}

function EdgeHandle({ i, j, a, b, scale, onMove }) {
  const ref = useRef(null)
  const size = EDGE_PX / scale
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return (
    <Rect
      x={mx - size / 2} y={my - size / 2} width={size} height={size}
      fill="#3b82f6" stroke="#ffffff" strokeWidth={1.5 / scale} cornerRadius={2 / scale}
      draggable
      onMouseEnter={(e) => { e.target.getStage().container().style.cursor = 'move' }}
      onMouseLeave={(e) => { e.target.getStage().container().style.cursor = 'default' }}
      onMouseDown={(e) => { e.cancelBubble = true }}
      onDragStart={(e) => {
        e.cancelBubble = true
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy) || 1
        ref.current = { a, b, mx, my, nx: -dy / len, ny: dx / len }
      }}
      onDragMove={(e) => {
        const r = ref.current
        if (!r) return
        const node = e.target
        const cx = node.x() + size / 2
        const cy = node.y() + size / 2
        const off = snap((cx - r.mx) * r.nx + (cy - r.my) * r.ny)
        const to1 = { x: r.a.x + r.nx * off, y: r.a.y + r.ny * off }
        const to2 = { x: r.b.x + r.nx * off, y: r.b.y + r.ny * off }
        onMove([{ index: i, x: to1.x, y: to1.y }, { index: j, x: to2.x, y: to2.y }])
        node.position({ x: (to1.x + to2.x) / 2 - size / 2, y: (to1.y + to2.y) / 2 - size / 2 })
      }}
      onDragEnd={(e) => { e.target.getStage().container().style.cursor = 'default' }}
    />
  )
}
