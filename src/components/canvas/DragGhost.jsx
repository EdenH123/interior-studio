import { Group, Rect, Line, Circle } from 'react-konva'
import { PIXELS_PER_METER } from './constants'
import { getFurnitureSpec } from './furnitureCatalog'
import { getOpeningSpec } from './openingsCatalog'
import useStore from '../../store/useStore'

// Translucent preview of an item's footprint while the sidebar tile is
// being dragged. Branches on `ghost.kind`:
//   • furniture — rect at the grid-snapped cursor position
//   • opening   — gap-and-pivot preview on the nearest wall, or a red X
//     near the cursor when no wall is within snap range
// `listening={false}` everywhere — never intercepts the drag.
export default function DragGhost({ ghost, scale }) {
  if (!ghost) return null
  if (ghost.kind === 'opening') return <OpeningGhost ghost={ghost} scale={scale} />
  return <FurnitureGhost ghost={ghost} scale={scale} />
}

function FurnitureGhost({ ghost, scale }) {
  const spec = getFurnitureSpec(ghost.type)
  if (!spec) return null
  const w = spec.width * PIXELS_PER_METER
  const d = spec.depth * PIXELS_PER_METER
  return (
    <Group x={ghost.x} y={ghost.y} listening={false}>
      <Rect
        x={-w / 2} y={-d / 2} width={w} height={d}
        fill={spec.color} opacity={0.45}
        stroke="#3b82f6" strokeWidth={1.5 / scale}
        dash={[8 / scale, 4 / scale]}
        cornerRadius={3 / scale}
      />
    </Group>
  )
}

function OpeningGhost({ ghost, scale }) {
  const spec = getOpeningSpec(ghost.type)
  if (!spec) return null
  const walls = useStore((s) => s.walls)

  // No wall in range — render a red X so the user knows the drop will fail.
  if (!ghost.wallId) {
    const r = 9 / scale
    const sw = 1.5 / scale
    return (
      <Group x={ghost.x} y={ghost.y} listening={false}>
        <Circle radius={r} stroke="#ef4444" strokeWidth={sw} fillEnabled={false} />
        <Line points={[-r * 0.6, -r * 0.6, r * 0.6, r * 0.6]} stroke="#ef4444" strokeWidth={sw} />
        <Line points={[-r * 0.6, r * 0.6, r * 0.6, -r * 0.6]} stroke="#ef4444" strokeWidth={sw} />
      </Group>
    )
  }

  const wall = walls.find((w) => w.id === ghost.wallId)
  if (!wall) return null
  const dx = wall.x2 - wall.x1
  const dy = wall.y2 - wall.y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  const widthPx = spec.width * PIXELS_PER_METER
  // Centre on the snapped point, extend ±halfWidth along the wall.
  const ax = ghost.x - ux * widthPx / 2
  const ay = ghost.y - uy * widthPx / 2
  const bx = ghost.x + ux * widthPx / 2
  const by = ghost.y + uy * widthPx / 2
  const sw = 2.5 / scale
  return (
    <Group listening={false}>
      <Line points={[ax, ay, bx, by]} stroke="#3b82f6" strokeWidth={sw} dash={[8 / scale, 4 / scale]} />
      <Circle x={ghost.x} y={ghost.y} radius={4 / scale} fill="#3b82f6" />
    </Group>
  )
}
