import { Group, Circle, Line } from 'react-konva'
import { PIXELS_PER_METER } from './constants'

const COLOR = '#3b82f6'
const HANDLE_OFFSET_SCREEN_PX = 30 // distance from the furniture's edge

// Rotation handle for the selected furniture item — a small circle floating
// out past the "back" of the piece, connected by a short stick. Drag the
// circle around the item's centroid to set a new rotation.
//
// The handle sits in world coordinates derived from item.rotation, so as the
// user drags, the item rotates and the handle naturally moves with it. We
// pin the dragged shape in place via `dragBoundFunc` and read the pointer
// position out of `onDragMove` instead.
export default function RotationHandle({ item, scale, onRotate }) {
  const halfDepth = (item.depth * PIXELS_PER_METER) / 2
  const stickLen = HANDLE_OFFSET_SCREEN_PX / scale
  const totalRadius = halfDepth + stickLen
  const angleRad = (item.rotation * Math.PI) / 180

  // Handle sits at local (0, -halfDepth - stickLen), rotated by angleRad
  // (Konva CW = math-y-up rotation in screen coords). Net world:
  const hx = item.x + totalRadius * Math.sin(angleRad)
  const hy = item.y - totalRadius * Math.cos(angleRad)
  // Stick from the back edge of the furniture to the handle.
  const sx = item.x + halfDepth * Math.sin(angleRad)
  const sy = item.y - halfDepth * Math.cos(angleRad)

  const r = 7 / scale
  const sw = 1.5 / scale

  return (
    <Group>
      <Line points={[sx, sy, hx, hy]} stroke={COLOR} strokeWidth={sw} listening={false} />
      <Circle
        x={hx} y={hy} radius={r}
        fill="#0f172a" stroke={COLOR} strokeWidth={sw}
        draggable
        dragBoundFunc={() => ({ x: hx, y: hy })}
        onDragMove={(e) => {
          const stage = e.target.getStage()
          const p = stage?.getRelativePointerPosition()
          if (!p) return
          const dx = p.x - item.x
          const dy = p.y - item.y
          // Ignore drags that pass through (or very near) the centroid —
          // atan2(0, 0) would snap to 0 and make rotation jitter.
          if (Math.hypot(dx, dy) < 5) return
          const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
          onRotate(Math.round(deg))
        }}
      />
    </Group>
  )
}
