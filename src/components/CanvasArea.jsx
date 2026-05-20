import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import useStore from '../store/useStore'
import useElementSize from '../hooks/useElementSize'
import useViewport from '../hooks/useViewport'
import useCanvasKeyboard from '../hooks/useCanvasKeyboard'
import useDrawWalls from '../hooks/useDrawWalls'
import useFurnitureDrop from '../hooks/useFurnitureDrop'
import useOpeningDrop from '../hooks/useOpeningDrop'
import useMarquee from '../hooks/useMarquee'
import useFurnitureMultiDrag from '../hooks/useFurnitureMultiDrag'
import { isSelected, getSingleItem } from '../store/selectionHelpers'
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

const UNDERLAY_ID = 'underlay'

export default function CanvasArea() {
  const [containerRef, size] = useElementSize()
  const stageRef = useRef(null)

  const allWalls = useStore((s) => s.walls)
  const allFurniture = useStore((s) => s.furniture)
  const allOpenings = useStore((s) => s.openings)
  const activeLevel = useStore((s) => s.activeLevel)
  const layers = useStore((s) => s.layers)
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
  const addToSelection = useStore((s) => s.addToSelection)
  const drawStart = useStore((s) => s.drawStart)
  const setDrawStart = useStore((s) => s.setDrawStart)

  // 2D canvas only shows items on the active level.
  const onLevel = (item) => !item.levelId || item.levelId === activeLevel
  const walls = allWalls.filter(onLevel)
  const furniture = allFurniture.filter(onLevel)
  const openings = allOpenings.filter(onLevel)

  const { view, recenterIfUnset, handleWheel, handleStageDragEnd } = useViewport()
  const spaceDown = useCanvasKeyboard()
  const handleStageMouseDown = useDrawWalls(stageRef, view.scale, spaceDown)
  const dragHandlers = combineDragHandlers(
    useFurnitureDrop(containerRef, view),
    useOpeningDrop(containerRef, view),
  )
  const { onDragStart: onFurnDragStart, onDragEnd: onFurnDragEnd } = useFurnitureMultiDrag()
  const { marquee, onMouseDown: onMarqueeDown, onMouseMove: onMarqueeMove, onMouseUp: onMarqueeUp }
    = useMarquee({ stageRef, spaceDown, setDrawStart })
  const [cursorWorld, setCursorWorld] = useState(null)

  useEffect(() => recenterIfUnset(size.width, size.height), [size.width, size.height, recenterIfUnset])

  const rooms = useMemo(() => detectRooms(walls), [walls])
  // Rotation handle only for a single selected furniture item.
  const singleSel = getSingleItem(selection)
  const selectedFurniture = layers.furniture && singleSel?.kind === 'furniture'
    ? furniture.find((f) => f.id === singleSel.id) ?? null
    : null

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
          onMouseDown={(e) => { handleStageMouseDown(e); onMarqueeDown(e) }}
          onMouseMove={(e) => { setCursorWorld(stageRef.current?.getRelativePointerPosition()); onMarqueeMove(e) }}
          onMouseUp={onMarqueeUp}
          onContextMenu={(e) => { e.evt.preventDefault(); if (e.target === stageRef.current) setDrawStart(null) }}
        >
          <Layer>
            <Rect x={-WORLD_HALF * 2} y={-WORLD_HALF * 2}
              width={WORLD_HALF * 4} height={WORLD_HALF * 4}
              fill="#030712" listening={false} />
            {layers.underlay && <Underlay
              underlay={underlay}
              selected={isSelected(selection, 'underlay', UNDERLAY_ID)}
              onSelect={() => select('underlay', UNDERLAY_ID)}
              onMove={(pos) => updateUnderlay(pos)}
            />}
          </Layer>
          <Layer listening={false}>{layers.grid && <Grid />}</Layer>
          <Layer>
            {layers.rooms && rooms.map((room) => {
              const meta = roomMeta[room.id]
              const material = meta?.floorMaterial ? getFloorMaterial(meta.floorMaterial) : null
              const fill = material ? materialOverlayFill(material.color) : DEFAULT_ROOM_FILL
              return (
                <Room key={room.id} room={room}
                  selected={isSelected(selection, 'room', room.id)}
                  fill={fill} listening={drawStart === null} scale={view.scale}
                  name={meta?.name ?? ''}
                  onSelect={(id) => select('room', id)}
                  onShiftSelect={(id) => addToSelection('room', id)} />
              )
            })}
            {layers.walls && walls.map((w) => (
              <Wall key={w.id} wall={w}
                segments={wallSegmentsForRendering(w, layers.openings ? openings : [])}
                selected={isSelected(selection, 'wall', w.id)}
                onClick={(id) => select('wall', id)}
                onShiftSelect={(id) => addToSelection('wall', id)}
                onContextMenu={removeWall} />
            ))}
            {layers.openings && openings.map((o) => {
              const wall = walls.find((w) => w.id === o.wallId)
              if (!wall) return null
              return (
                <Opening key={o.id} opening={o} wall={wall} view={view}
                  selected={isSelected(selection, 'opening', o.id)}
                  onSelect={(id) => select('opening', id)}
                  onShiftSelect={(id) => addToSelection('opening', id)}
                  onUpdate={updateOpening}
                  onUpdateRejected={() => pushToast("Opening can't go there — it would overlap or exceed the wall.", 'warn')}
                  onContextMenu={removeOpening} />
              )
            })}
            {layers.furniture && furniture.map((f) => (
              <Furniture key={f.id} item={f} scale={view.scale}
                selected={isSelected(selection, 'furniture', f.id)}
                onSelect={(id) => select('furniture', id)}
                onShiftSelect={(id) => addToSelection('furniture', id)}
                onDragStart={onFurnDragStart}
                onDragEnd={onFurnDragEnd}
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
            {marquee && (
              <Rect
                x={Math.min(marquee.x1, marquee.x2)} y={Math.min(marquee.y1, marquee.y2)}
                width={Math.abs(marquee.x2 - marquee.x1)} height={Math.abs(marquee.y2 - marquee.y1)}
                stroke="#3b82f6" strokeWidth={1 / view.scale}
                fill="rgba(59,130,246,0.07)"
                dash={[4 / view.scale, 4 / view.scale]}
                listening={false}
              />
            )}
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
