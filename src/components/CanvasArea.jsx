import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import useStore from '../store/useStore'
import useElementSize from '../hooks/useElementSize'
import useViewport from '../hooks/useViewport'
import useCanvasKeyboard from '../hooks/useCanvasKeyboard'
import useDrawWalls from '../hooks/useDrawWalls'
import useFurnitureDrop from '../hooks/useFurnitureDrop'
import useOpeningDrop from '../hooks/useOpeningDrop'
import Grid from './canvas/Grid'
import Wall from './canvas/Wall'
import Opening from './canvas/Opening'
import Furniture from './canvas/Furniture'
import { wallSegmentsForRendering } from './canvas/openingGeometry'
import DrawPreview from './canvas/DrawPreview'
import SnapIndicator from './canvas/SnapIndicator'
import RotationHandle from './canvas/RotationHandle'
import DragGhost from './canvas/DragGhost'
import DiffOverlay from './canvas/DiffOverlay'
import { registerStage } from './canvas/stageHandle'
import Room from './canvas/Room'
import Underlay from './canvas/Underlay'
import CalibrationOverlay from './canvas/CalibrationOverlay'
import CalibrationPrompt from './canvas/CalibrationPrompt'
import { detectRooms } from './canvas/roomDetection'
import { DEFAULT_ROOM_FILL, getFloorMaterial, materialOverlayFill } from './canvas/floorMaterials'
import { SNAP_RADIUS_SCREEN, WORLD_HALF, snapTo90, findNearestSnapPoint } from './canvas/constants'
import HudOverlay from './canvas/HudOverlay'
import { FURNITURE_DRAG_MIME } from './Sidebar'

const UNDERLAY_ID = 'underlay'

export default function CanvasArea() {
  const [containerRef, size] = useElementSize()
  const stageRef = useRef(null)

  const walls = useStore((s) => s.walls)
  const furniture = useStore((s) => s.furniture)
  const openings = useStore((s) => s.openings)
  const updateOpening = useStore((s) => s.updateOpening)
  const removeOpening = useStore((s) => s.removeOpening)
  const pushToast = useStore((s) => s.pushToast)
  const roomMeta = useStore((s) => s.roomMeta)
  const underlay = useStore((s) => s.underlay)
  const updateUnderlay = useStore((s) => s.updateUnderlay)
  const calibration = useStore((s) => s.calibration)
  const setCalibrationPoint = useStore((s) => s.setCalibrationPoint)
  const cancelCalibration = useStore((s) => s.cancelCalibration)
  const applyCalibration = useStore((s) => s.applyCalibration)
  const dragGhost = useStore((s) => s.dragGhost)
  const aiProposal = useStore((s) => s.aiProposal)
  const selection = useStore((s) => s.selection)
  const removeWall = useStore((s) => s.removeWall)
  const updateFurniture = useStore((s) => s.updateFurniture)
  const removeFurniture = useStore((s) => s.removeFurniture)
  const select = useStore((s) => s.select)
  const drawStart = useStore((s) => s.drawStart)
  const setDrawStart = useStore((s) => s.setDrawStart)

  const { view, recenterIfUnset, handleWheel, handleStageDragEnd } = useViewport()
  const spaceDown = useCanvasKeyboard()
  const handleStageMouseDown = useDrawWalls(stageRef, view.scale, spaceDown)
  // The sidebar fires two distinct MIME types; each hook's handlers
  // self-check the MIME so combining them is safe.
  const dragHandlers = combineDragHandlers(
    useFurnitureDrop(containerRef, view),
    useOpeningDrop(containerRef, view),
  )
  const [cursorWorld, setCursorWorld] = useState(null)

  useEffect(() => recenterIfUnset(size.width, size.height), [size.width, size.height, recenterIfUnset])

  const rooms = useMemo(() => detectRooms(walls), [walls])
  const selectedFurniture = selection?.kind === 'furniture'
    ? furniture.find((f) => f.id === selection.id) ?? null
    : null

  // Snap target: nearest existing wall endpoint or midpoint within a
  // zoom-aware radius. Overrides 90° snap on the second click and lets
  // first-clicks lock to existing endpoints (chained drawing without
  // chained-drawing-mode).
  const snapTarget = cursorWorld
    ? findNearestSnapPoint(cursorWorld, walls, SNAP_RADIUS_SCREEN / view.scale)
    : null
  const previewEnd = drawStart && cursorWorld
    ? snapTarget ?? snapTo90(drawStart, cursorWorld)
    : null

  return (
    <main
      ref={containerRef}
      {...dragHandlers}
      className="flex-1 bg-gray-950 overflow-hidden relative"
      style={{ cursor: spaceDown ? 'grab' : calibration || drawStart ? 'crosshair' : 'default' }}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={(node) => { stageRef.current = node; registerStage(node) }}
          width={size.width} height={size.height}
          scaleX={view.scale} scaleY={view.scale} x={view.x} y={view.y}
          draggable={spaceDown}
          onDragEnd={handleStageDragEnd}
          onWheel={handleWheel(stageRef)}
          onMouseDown={handleStageMouseDown}
          onMouseMove={() => setCursorWorld(stageRef.current.getRelativePointerPosition())}
          onContextMenu={(e) => { e.evt.preventDefault(); if (e.target === stageRef.current) setDrawStart(null) }}
        >
          <Layer>
            {/* Background paint — covers the visible world at any reasonable
                zoom so PNG export includes the dark backdrop instead of
                transparent pixels. Matches the container's CSS bg-gray-950. */}
            <Rect x={-WORLD_HALF * 2} y={-WORLD_HALF * 2}
              width={WORLD_HALF * 4} height={WORLD_HALF * 4}
              fill="#030712" listening={false} />
            <Underlay
              underlay={underlay}
              selected={selection?.kind === 'underlay'}
              onSelect={() => select('underlay', UNDERLAY_ID)}
              onMove={(pos) => updateUnderlay(pos)}
            />
          </Layer>
          <Layer listening={false}><Grid /></Layer>
          <Layer>
            {rooms.map((room) => {
              const meta = roomMeta[room.id]
              const material = meta?.floorMaterial ? getFloorMaterial(meta.floorMaterial) : null
              const fill = material ? materialOverlayFill(material.color) : DEFAULT_ROOM_FILL
              return (
                <Room key={room.id} room={room}
                  selected={selection?.kind === 'room' && selection.id === room.id}
                  fill={fill} listening={drawStart === null} scale={view.scale}
                  name={meta?.name ?? ''}
                  onSelect={(id) => select('room', id)} />
              )
            })}
            {walls.map((w) => (
              <Wall key={w.id} wall={w}
                segments={wallSegmentsForRendering(w, openings)}
                selected={selection?.kind === 'wall' && selection.id === w.id}
                onClick={(id) => select('wall', id)}
                onContextMenu={removeWall} />
            ))}
            {openings.map((o) => {
              const wall = walls.find((w) => w.id === o.wallId)
              if (!wall) return null
              return (
                <Opening key={o.id} opening={o} wall={wall} view={view}
                  selected={selection?.kind === 'opening' && selection.id === o.id}
                  onSelect={(id) => select('opening', id)}
                  onUpdate={updateOpening}
                  onUpdateRejected={() => pushToast('Opening can\'t go there — it would overlap or exceed the wall.', 'warn')}
                  onContextMenu={removeOpening} />
              )
            })}
            {furniture.map((f) => (
              <Furniture key={f.id} item={f} scale={view.scale}
                selected={selection?.kind === 'furniture' && selection.id === f.id}
                onSelect={(id) => select('furniture', id)}
                onDragEnd={(id, pos) => updateFurniture(id, pos)}
                onContextMenu={removeFurniture} />
            ))}
            {selectedFurniture && (
              <RotationHandle item={selectedFurniture} scale={view.scale}
                onRotate={(deg) => updateFurniture(selectedFurniture.id, { rotation: deg })} />
            )}
            <DragGhost ghost={dragGhost} scale={view.scale} />
            {aiProposal && <DiffOverlay diff={aiProposal.diff} scale={view.scale} />}
            {drawStart && previewEnd && <DrawPreview start={drawStart} end={previewEnd} scale={view.scale} />}
            {snapTarget && !calibration && <SnapIndicator point={snapTarget} scale={view.scale} />}
            <CalibrationOverlay calibration={calibration} scale={view.scale} onPlace={setCalibrationPoint} />
          </Layer>
        </Stage>
      )}
      <HudOverlay view={view} cursor={cursorWorld} drawing={!!drawStart} spaceDown={spaceDown} selection={selection} calibration={calibration} />
      {calibration?.p1 && calibration?.p2 && (
        <CalibrationPrompt p1={calibration.p1} p2={calibration.p2}
          onConfirm={applyCalibration} onCancel={cancelCalibration} />
      )}
    </main>
  )
}

// Two drop hooks each return an `{onDragOver, onDragLeave, onDrop}` bag.
// We need to wire BOTH to <main> because the sidebar fires two MIME types.
// Each hook's handlers self-check their MIME and bail when they're not the
// target, so calling both in sequence is safe.
function combineDragHandlers(...bags) {
  return ['onDragOver', 'onDragLeave', 'onDrop'].reduce((acc, key) => {
    acc[key] = (e) => { for (const b of bags) b[key]?.(e) }
    return acc
  }, {})
}

