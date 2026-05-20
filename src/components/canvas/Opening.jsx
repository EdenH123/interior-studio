import { Group, Line, Path, Rect } from 'react-konva'
import { PIXELS_PER_METER } from './constants'
import { openingPlacement, projectOntoWall, wallLengthPx } from './openingGeometry'

// 2D rendering for a single opening on a wall. The Group is positioned at
// the opening's centre on the wall and rotated to match the wall's
// direction so a door's swing arc + jambs sit perpendicular to the wall.
//
// Drag-along-wall: dragBoundFunc projects the cursor onto the parent
// wall in world coords, clamps to wall length minus the opening's
// footprint, and returns the projected position in the absolute (post-
// stage-transform) frame Konva expects. On drag end we recompute the
// normalised `position` and dispatch through `onUpdate(id, patch)`. The
// store's `updateOpening` rejects overlaps — caller toasts on false.
export default function Opening({ opening, wall, view, selected, onSelect, onShiftSelect, onUpdate, onContextMenu, onUpdateRejected }) {
  const p = openingPlacement(opening, wall)
  const angleDeg = (p.angleRad * 180) / Math.PI

  const dragBound = (absPos) => {
    const worldX = (absPos.x - view.x) / view.scale
    const worldY = (absPos.y - view.y) / view.scale
    const proj = projectOntoWall({ x: worldX, y: worldY }, wall)
    const half = (opening.width * PIXELS_PER_METER) / 2 / wallLengthPx(wall)
    const clampedT = Math.max(half, Math.min(1 - half, proj.t))
    const clampedX = wall.x1 + (wall.x2 - wall.x1) * clampedT
    const clampedY = wall.y1 + (wall.y2 - wall.y1) * clampedT
    return { x: clampedX * view.scale + view.x, y: clampedY * view.scale + view.y }
  }

  const onDragEnd = (e) => {
    const worldX = (e.target.x() - view.x) / view.scale
    const worldY = (e.target.y() - view.y) / view.scale
    const proj = projectOntoWall({ x: worldX, y: worldY }, wall)
    const ok = onUpdate(opening.id, { position: proj.t })
    if (!ok) {
      onUpdateRejected?.()
      // Restore the visual position to the canonical one driven by store.
      e.target.position({ x: p.centerX, y: p.centerY })
    }
  }

  return (
    <Group
      x={p.centerX} y={p.centerY} rotation={angleDeg}
      draggable
      dragBoundFunc={dragBound}
      onDragEnd={onDragEnd}
      onMouseDown={(e) => {
        if (e.evt.button === 0) {
          e.cancelBubble = true
          if (e.evt.shiftKey) onShiftSelect?.(opening.id)
          else onSelect?.(opening.id)
        }
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault()
        e.cancelBubble = true
        onContextMenu?.(opening.id)
      }}
    >
      {/* Invisible hit target spanning the gap — gives the user a fat
          area to grab without obscuring the visual. */}
      <Rect
        x={-p.widthPx / 2} y={-12 / view.scale}
        width={p.widthPx} height={24 / view.scale}
        fill="rgba(0,0,0,0.001)"
      />
      {opening.type === 'door'
        ? <DoorGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} />
        : <WindowGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} />}
    </Group>
  )
}

function DoorGlyph({ widthPx, scale, selected }) {
  const half = widthPx / 2
  const stroke = selected ? '#3b82f6' : '#e5e7eb'
  const jamb = selected ? 2 / scale : 1.5 / scale
  // Hinge at -half on the wall, panel swings perpendicular (towards -y
  // in the rotated frame). Arc traces the free end from the open
  // position (-half, -widthPx) round to the closed position (half, 0).
  const arcData =
    `M ${half} 0 A ${widthPx} ${widthPx} 0 0 0 ${-half} ${-widthPx}`
  return (
    <Group listening={false}>
      {/* Jambs as small ticks marking the gap edges */}
      <Line points={[-half, -4 / scale, -half, 4 / scale]} stroke={stroke} strokeWidth={jamb} />
      <Line points={[half, -4 / scale, half, 4 / scale]} stroke={stroke} strokeWidth={jamb} />
      {/* Door panel — line from hinge perpendicular to wall */}
      <Line points={[-half, 0, -half, -widthPx]} stroke={stroke} strokeWidth={jamb} />
      {/* Swing arc */}
      <Path data={arcData} stroke={stroke} strokeWidth={1 / scale} opacity={0.6} fill="" />
    </Group>
  )
}

function WindowGlyph({ widthPx, scale, selected }) {
  const half = widthPx / 2
  const stroke = selected ? '#3b82f6' : '#a5b4fc'
  const sw = 1.5 / scale
  const offset = 4 / scale
  return (
    <Group listening={false}>
      {/* Jambs */}
      <Line points={[-half, -offset, -half, offset]} stroke={stroke} strokeWidth={sw} />
      <Line points={[half, -offset, half, offset]} stroke={stroke} strokeWidth={sw} />
      {/* Two parallel glass-pane lines along the wall direction */}
      <Line points={[-half, -offset / 2, half, -offset / 2]} stroke={stroke} strokeWidth={sw} />
      <Line points={[-half, offset / 2, half, offset / 2]} stroke={stroke} strokeWidth={sw} />
    </Group>
  )
}
