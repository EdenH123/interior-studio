import { Group, Rect } from 'react-konva'
import { PIXELS_PER_METER } from './constants'

const HANDLE_PX = 10  // screen-space size of each corner square
const MIN_M = 0.05    // minimum dimension in metres

// Four corner drag handles for the selected furniture item. Dragging any corner
// resizes width + depth symmetrically around the centroid. Hold Shift for
// proportional (locked-ratio) resize.
export default function ResizeHandle({ item, scale, shiftDown, onResize }) {
  const hw = (item.width  * PIXELS_PER_METER) / 2
  const hd = (item.depth  * PIXELS_PER_METER) / 2
  const hs = HANDLE_PX / scale
  const rad = (item.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  // Cursor alternates diagonal direction per corner.
  const corners = [
    [-1, -1, 'nwse-resize'],
    [ 1, -1, 'nesw-resize'],
    [ 1,  1, 'nwse-resize'],
    [-1,  1, 'nesw-resize'],
  ]

  return (
    <Group>
      {corners.map(([sx, sy, cursor], i) => {
        const lx = sx * hw
        const ly = sy * hd
        const wx = item.x + lx * cos - ly * sin
        const wy = item.y + lx * sin + ly * cos

        return (
          <Rect
            key={i}
            x={wx - hs / 2}
            y={wy - hs / 2}
            width={hs}
            height={hs}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={1.5 / scale}
            cornerRadius={2 / scale}
            draggable
            // Pin the handle visually; read actual pointer in onDragMove.
            dragBoundFunc={() => ({ x: wx - hs / 2, y: wy - hs / 2 })}
            onMouseEnter={(e) => {
              e.target.fill('#3b82f6')
              e.target.getLayer()?.batchDraw()
              e.target.getStage().container().style.cursor = cursor
            }}
            onMouseLeave={(e) => {
              e.target.fill('#ffffff')
              e.target.getLayer()?.batchDraw()
              e.target.getStage().container().style.cursor = 'default'
            }}
            onDragStart={(e) => {
              e.target.getStage().container().style.cursor = cursor
            }}
            onDragEnd={(e) => {
              e.target.fill('#ffffff')
              e.target.getLayer()?.batchDraw()
              e.target.getStage().container().style.cursor = 'default'
            }}
            onDragMove={(e) => {
              const p = e.target.getStage()?.getRelativePointerPosition()
              if (!p) return
              const dx = p.x - item.x
              const dy = p.y - item.y
              const invCos = Math.cos(-rad)
              const invSin = Math.sin(-rad)
              const lxP = dx * invCos - dy * invSin
              const lyP = dx * invSin + dy * invCos
              const newHW = Math.max(Math.abs(lxP), (MIN_M * PIXELS_PER_METER) / 2)
              const newHD = Math.max(Math.abs(lyP), (MIN_M * PIXELS_PER_METER) / 2)
              let newW = Math.round((newHW * 2 / PIXELS_PER_METER) * 100) / 100
              let newD = Math.round((newHD * 2 / PIXELS_PER_METER) * 100) / 100
              if (shiftDown) {
                const ratio = Math.max(newW / item.width, newD / item.depth)
                newW = Math.round(item.width  * ratio * 100) / 100
                newD = Math.round(item.depth  * ratio * 100) / 100
              }
              onResize({ width: newW, depth: newD })
            }}
          />
        )
      })}
    </Group>
  )
}


