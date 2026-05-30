import { useRef } from 'react'
import { Group, Rect, Text, Line, Circle } from 'react-konva'
import { PIXELS_PER_METER } from './constants'
import { furnitureColorFor } from './furnitureMaterials'
import { findWallSnap } from './wallSnapGeometry'
import { findStackTarget } from './stackGeometry'
import useStore from '../../store/useStore'

const SELECTION_COLOR = '#3b82f6'

export default function Furniture({ item, selected, scale, onSelect, onShiftSelect, onDragStart, onDragEnd, onContextMenu }) {
  // Track drag offset in world coords so we can correctly compute the final
  // world position regardless of the Stage's current scale/pan. Without this,
  // Konva's built-in drag accumulates screen-space deltas without dividing by
  // scale, causing the item to "jump" when zoomed in beyond 1:1.
  const dragOffset = useRef(null)
  // Rotation to apply on dragEnd when a wall snap is active.
  const pendingRotation = useRef(null)
  // Stack target id captured during drag; applied on dragEnd. null when the
  // drag should explicitly clear any existing stack relationship.
  const pendingStackId = useRef(undefined)
  const w = item.width * PIXELS_PER_METER
  const d = item.depth * PIXELS_PER_METER
  const fill = furnitureColorFor(item)
  const stroke = selected ? SELECTION_COLOR : '#0f172a'
  const strokeWidth = selected ? 2 / scale : 1 / scale
  const fontSize = 11 / scale
  const isLight = item.type.startsWith('lighting:')

  return (
    <Group
      x={item.x}
      y={item.y}
      rotation={item.rotation}
      draggable={!item.mountWallId}
      onDragStart={(e) => {
        const p = e.target.getStage().getRelativePointerPosition()
        dragOffset.current = { dx: p.x - item.x, dy: p.y - item.y }
        // Stack-detect only when this item is the SOLE furniture in the
        // current selection — multi-drag is pure group-translate, so we
        // freeze any existing stackedOn relationships.
        const sel = useStore.getState().selection?.items ?? []
        const furnInSel = sel.filter((i) => i.kind === 'furniture')
        dragOffset.current.allowStack = furnInSel.length <= 1
        onDragStart?.(item.id, { x: item.x, y: item.y })
      }}
      onDragMove={(e) => {
        if (!dragOffset.current) return
        const p = e.target.getStage().getRelativePointerPosition()
        const worldX = p.x - dragOffset.current.dx
        const worldY = p.y - dragOffset.current.dy
        e.target.x(worldX)
        e.target.y(worldY)
        // Read state lazily at drag time so this component doesn't hold a
        // standing subscription that re-renders every instance on any edit.
        const state = useStore.getState()
        // Stack-on-furniture beats wall snap: when the cursor is INSIDE another
        // furniture's footprint, defer to stacking (don't pull to a wall edge).
        if (!item.wallMounted && dragOffset.current.allowStack) {
          const stackTarget = findStackTarget({ x: worldX, y: worldY }, item, state.furniture)
          if (stackTarget) {
            pendingStackId.current = stackTarget.id
            pendingRotation.current = null
            return
          }
          pendingStackId.current = null  // dragged off any stack target
          // Wall snap: override position if within threshold of a wall face.
          const wallSnap = findWallSnap(
            { x: worldX, y: worldY, width: item.width, depth: item.depth, rotation: item.rotation },
            state.walls,
            scale,
          )
          if (wallSnap) {
            e.target.x(wallSnap.x)
            e.target.y(wallSnap.y)
            pendingRotation.current = wallSnap.rotation
          } else {
            pendingRotation.current = null
          }
        }
      }}
      onDragEnd={(e) => {
        const node = e.target
        const finalX = node.x()
        const finalY = node.y()
        const finalRotation = pendingRotation.current
        const stackId = pendingStackId.current
        dragOffset.current = null
        pendingRotation.current = null
        pendingStackId.current = undefined
        const patch = { x: finalX, y: finalY }
        if (finalRotation != null) patch.rotation = finalRotation
        // Stacking: only single-furniture drags can stack (multi-drag is
        // pure translate). stackId === null means "drag explicitly cleared
        // any prior stack"; undefined means "no stacking activity this drag".
        if (stackId !== undefined) {
          patch.stackedOn = stackId
          if (stackId) {
            const parent = useStore.getState().furniture.find((f) => f.id === stackId)
            if (parent) patch.levelId = parent.levelId
            // Clear manual elevation so the stack chain owns Y unambiguously.
            patch.elevation = null
          }
        }
        onDragEnd?.(item.id, patch)
      }}
      onMouseDown={(e) => {
        if (e.evt.button === 0) {
          e.cancelBubble = true
          if (e.evt.shiftKey) onShiftSelect?.(item.id)
          else onSelect?.(item.id)
        }
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault()
        e.cancelBubble = true
        onContextMenu?.(item.id)
      }}
    >
      {isLight
        ? <LightGlyph w={w} d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} scale={scale} />
        : <FurnitureGlyph w={w} d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} scale={scale} />
      }
      <Text
        text={item.type.replace('lighting:', '')}
        fontSize={fontSize}
        fill="#f8fafc"
        x={-w / 2}
        y={isLight ? Math.min(w, d) / 2 + 2 / scale : -fontSize / 2}
        width={w}
        align="center"
        listening={false}
      />
    </Group>
  )
}

function FurnitureGlyph({ w, d, fill, stroke, strokeWidth, scale }) {
  return (
    <>
      <Rect
        x={-w / 2}
        y={-d / 2}
        width={w}
        height={d}
        fill={fill}
        opacity={0.85}
        stroke={stroke}
        strokeWidth={strokeWidth}
        cornerRadius={3 / scale}
      />
      {/* Front-edge tick so rotation is visible */}
      <Line
        points={[-w / 2 + 4 / scale, d / 2 - 4 / scale, w / 2 - 4 / scale, d / 2 - 4 / scale]}
        stroke="#f8fafc"
        strokeWidth={1.5 / scale}
        opacity={0.6}
        listening={false}
      />
    </>
  )
}

// Sun-like icon: filled circle + 8 radiating spokes.
function LightGlyph({ w, d, fill, stroke, strokeWidth, scale }) {
  const r = Math.min(w, d) * 0.28
  const spokeInner = r * 1.35
  const spokeOuter = r * 2.1
  const spokes = 8

  return (
    <>
      {/* Soft halo */}
      <Circle
        radius={Math.min(w, d) * 0.48}
        fill={fill}
        opacity={0.15}
        listening={false}
      />
      {/* Spokes */}
      {Array.from({ length: spokes }, (_, i) => {
        const angle = (i / spokes) * Math.PI * 2
        return (
          <Line
            key={i}
            points={[
              Math.cos(angle) * spokeInner, Math.sin(angle) * spokeInner,
              Math.cos(angle) * spokeOuter, Math.sin(angle) * spokeOuter,
            ]}
            stroke={fill}
            strokeWidth={1.5 / scale}
            opacity={0.75}
            listening={false}
          />
        )
      })}
      {/* Core */}
      <Circle
        radius={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={0.9}
      />
    </>
  )
}
