import { Group, Rect, Line, Circle } from 'react-konva'
import { PIXELS_PER_METER, WALL_THICKNESS, WORLD_HALF } from './constants'

// Ghost preview + click catcher for cursor-positioned paste.
//
// Renders a faded outline of every clipboard item at its offset position
// (cursor − pendingPaste.anchor) so you can see exactly where everything will
// land. A top-most invisible Rect covers the world and captures the next
// left-click anywhere on the canvas — clicking commits the paste at that
// world point regardless of what's under the cursor (a normal wall/furniture
// click won't intercept and select instead). Right-click cancels.
const COLOR = '#3b82f6'

export default function PasteGhost({ pendingPaste, cursor, scale, onCommit, onCancel }) {
  if (!pendingPaste || !cursor) return null
  const dx = cursor.x - pendingPaste.anchor.x
  const dy = cursor.y - pendingPaste.anchor.y
  // Walls in the clipboard, indexed by their ORIGINAL id, so opening previews
  // can find their parent wall (positions are stored as 0–1 along the wall).
  const walls = {}
  for (const { kind, item } of pendingPaste.items) if (kind === 'wall') walls[item.id] = item

  return (
    <Group>
      <Rect
        x={-WORLD_HALF * 2} y={-WORLD_HALF * 2}
        width={WORLD_HALF * 4} height={WORLD_HALF * 4}
        fill="rgba(0,0,0,0.001)"
        onMouseDown={(e) => {
          if (e.evt.button === 0) {
            e.cancelBubble = true
            const stage = e.target.getStage()
            const p = stage?.getRelativePointerPosition()
            if (p) onCommit(p)
          } else if (e.evt.button === 2) {
            e.cancelBubble = true
            onCancel?.()
          }
        }}
        onContextMenu={(e) => { e.evt.preventDefault(); e.cancelBubble = true; onCancel?.() }}
      />
      <Group listening={false} opacity={0.6}>
        {pendingPaste.items.map(({ kind, item }, i) => {
          if (kind === 'wall') {
            return (
              <Line key={`w${i}`}
                points={[item.x1 + dx, item.y1 + dy, item.x2 + dx, item.y2 + dy]}
                stroke={COLOR} strokeWidth={WALL_THICKNESS} lineCap="square"
                listening={false} />
            )
          }
          if (kind === 'furniture') {
            const w = item.width * PIXELS_PER_METER
            const d = item.depth * PIXELS_PER_METER
            return (
              <Rect key={`f${i}`}
                x={item.x + dx} y={item.y + dy}
                width={w} height={d}
                offsetX={w / 2} offsetY={d / 2}
                rotation={item.rotation ?? 0}
                fill={item.color ?? '#94a3b8'} stroke={COLOR}
                strokeWidth={1.5 / scale} listening={false} />
            )
          }
          if (kind === 'opening') {
            const wall = walls[item.wallId]
            if (!wall) return null
            const wx = wall.x1 + (wall.x2 - wall.x1) * (item.position ?? 0.5)
            const wy = wall.y1 + (wall.y2 - wall.y1) * (item.position ?? 0.5)
            return (
              <Circle key={`o${i}`} x={wx + dx} y={wy + dy} radius={6 / scale}
                fill={COLOR} listening={false} />
            )
          }
          return null
        })}
      </Group>
    </Group>
  )
}
