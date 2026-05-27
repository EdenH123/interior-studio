import { Group, Rect } from 'react-konva'
import { PIXELS_PER_METER } from './constants'
import { openingPlacement, projectOntoWall, wallLengthPx } from './openingGeometry'
import {
  DoorGlyph, DoubleDoorGlyph, SlidingDoorGlyph, PivotDoorGlyph,
  WindowGlyph, FixedWindowGlyph, CasementGlyph, ArchedWindowGlyph, OpenArchGlyph,
} from './OpeningGlyphs'

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
      {opening.type === 'door'           && <DoorGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} swingDir={opening.swingDir ?? 'left'} openSide={opening.openSide ?? 'front'} />}
      {opening.type === 'door-double'   && <DoubleDoorGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} openSide={opening.openSide ?? 'front'} />}
      {opening.type === 'door-sliding'  && <SlidingDoorGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} swingDir={opening.swingDir ?? 'left'} />}
      {opening.type === 'door-pivot'    && <PivotDoorGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} openSide={opening.openSide ?? 'front'} />}
      {opening.type === 'window'        && <WindowGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} />}
      {opening.type === 'window-fixed'  && <FixedWindowGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} />}
      {opening.type === 'window-casement' && <CasementGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} />}
      {opening.type === 'window-arched'  && <ArchedWindowGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} />}
      {(opening.type === 'opening' || opening.type === 'opening-wide') && <OpenArchGlyph widthPx={p.widthPx} scale={view.scale} selected={selected} />}
    </Group>
  )
}

