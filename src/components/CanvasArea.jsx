import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stage, Layer, Line, Rect } from 'react-konva'
import useStore from '../store/useStore'
import useElementSize from '../hooks/useElementSize'
import useViewport from '../hooks/useViewport'
import useDrawWalls from '../hooks/useDrawWalls'
import useFurnitureDrop from '../hooks/useFurnitureDrop'
import useOpeningDrop from '../hooks/useOpeningDrop'
import useCustomModelDrop from '../hooks/useCustomModelDrop'
import useMarquee from '../hooks/useMarquee'
import useFurnitureMultiDrag from '../hooks/useFurnitureMultiDrag'
import useModifierKeys from '../hooks/useModifierKeys'
import { isSelected, getSingleItem } from '../store/selectionHelpers'
import Grid from './canvas/Grid'
import Wall from './canvas/Wall'
import WallLengthLabel from './canvas/WallLengthLabel'
import Opening from './canvas/Opening'
import Furniture from './canvas/Furniture'
import { wallSegmentsForRendering } from './canvas/openingGeometry'
import { resolveRailingMount } from './canvas/wallSnapGeometry'
import DrawPreview from './canvas/DrawPreview'
import AreaDraftPreview from './canvas/AreaDraftPreview'
import AreaEditHandles from './canvas/AreaEditHandles'
import AreaDimensions from './canvas/AreaDimensions'
import SnapIndicator from './canvas/SnapIndicator'
import RotationHandle from './canvas/RotationHandle'
import ResizeHandle from './canvas/ResizeHandle'
import WallEditHandles from './canvas/WallEditHandles'
import DragGhost from './canvas/DragGhost'
import DiffOverlay from './canvas/DiffOverlay'
import { registerStage } from './canvas/stageHandle'
import Room from './canvas/Room'
import Underlay from './canvas/Underlay'
import CalibrationOverlay from './canvas/CalibrationOverlay'
import CalibrationPrompt from './canvas/CalibrationPrompt'
import { detectRooms } from './canvas/roomDetection'
import { DEFAULT_ROOM_FILL, getFloorMaterial, materialOverlayFill } from './canvas/floorMaterials'
import { getFurnitureSpec } from './canvas/furnitureCatalog'
import { SNAP_RADIUS_SCREEN, WORLD_HALF, GRID_SIZE, PIXELS_PER_METER, snapTo90, snapTo45, findNearestSnapPoint } from './canvas/constants'
import { snapToGrid } from '../hooks/useViewport'
import HudOverlay from './canvas/HudOverlay'

const UNDERLAY_ID = 'underlay'
const AREA_SNAP = PIXELS_PER_METER * 0.1 // snap area polygon points to 0.1 m
const AREA_CLOSE_PX = 12                 // screen px within which a click "closes" the loop
const AREA_DEFAULT_FILL = 'rgba(132, 204, 22, 0.14)' // outdoor-ish lime tint
const POOL_FILL = 'rgba(42, 143, 201, 0.30)'         // pool-water blue
const POOL_DRAFT = { fill: 'rgba(42,143,201,0.18)', stroke: '#2a8fc9', dotStroke: '#1d6fa5' }
const snapArea = (v) => Math.round(v / AREA_SNAP) * AREA_SNAP
const areaCentroid = (verts) => {
  const n = verts.length || 1
  return { x: verts.reduce((s, v) => s + v.x, 0) / n, y: verts.reduce((s, v) => s + v.y, 0) / n }
}

export default function CanvasArea() {
  const { t } = useTranslation()
  const [containerRef, size] = useElementSize()
  const stageRef = useRef(null)

  const allWalls = useStore((s) => s.walls)
  const allFurniture = useStore((s) => s.furniture)
  const allOpenings = useStore((s) => s.openings)
  const allAreas = useStore((s) => s.areas)
  const areaDraft = useStore((s) => s.areaDraft)
  const addAreaPoint = useStore((s) => s.addAreaPoint)
  const finishAreaDraft = useStore((s) => s.finishAreaDraft)
  const allPools = useStore((s) => s.pools)
  const poolDraft = useStore((s) => s.poolDraft)
  const addPoolPoint = useStore((s) => s.addPoolPoint)
  const finishPoolDraft = useStore((s) => s.finishPoolDraft)
  const movePoolVertices = useStore((s) => s.movePoolVertices)
  const activeLevel = useStore((s) => s.activeLevel)
  const levels = useStore((s) => s.levels)
  const layers = useStore((s) => s.layers)
  const activeTool = useStore((s) => s.activeTool)
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
  const pendingPlacement = useStore((s) => s.pendingPlacement)
  const clearPendingPlacement = useStore((s) => s.clearPendingPlacement)
  const addFurniture         = useStore((s) => s.addFurniture)
  const addFurnitureWithSpec = useStore((s) => s.addFurnitureWithSpec)
  const aiProposal = useStore((s) => s.aiProposal)
  const selection = useStore((s) => s.selection)
  const removeWall = useStore((s) => s.removeWall)
  const moveWallVertices = useStore((s) => s.moveWallVertices)
  const moveAreaVertices = useStore((s) => s.moveAreaVertices)
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
  const areas = allAreas.filter(onLevel)
  const pools = allPools.filter(onLevel)

  const lockAspectRatio = useStore((s) => s.lockAspectRatio)
  const { view, recenterIfUnset, handleWheel, handleStageDragEnd, setPanPosition } = useViewport()
  // Global keyboard shortcuts are mounted once in App so they work in 2D + 3D.
  const { shiftDown, altDown } = useModifierKeys()
  const handleStageMouseDown = useDrawWalls(stageRef, view.scale, shiftDown, altDown)
  const dragHandlers = combineDragHandlers(
    useFurnitureDrop(containerRef, view),
    useOpeningDrop(containerRef, view),
    useCustomModelDrop(containerRef, view),
  )
  const { onDragStart: onFurnDragStart, onDragEnd: onFurnDragEnd } = useFurnitureMultiDrag()
  const { marquee, onMouseDown: onMarqueeDown, onMouseMove: onMarqueeMove, onMouseUp: onMarqueeUp }
    = useMarquee({ stageRef, setDrawStart })
  const [cursorWorld, setCursorWorld] = useState(null)

  // Manual pan for select mode: track pointer globally so panning works even
  // if the cursor leaves the canvas, and keep Stage non-draggable so child-
  // shape click events are never swallowed by Konva's drag machinery.
  const panRef = useRef(null)
  useEffect(() => {
    const onMove = (e) => {
      if (!panRef.current || !stageRef.current) return
      stageRef.current.position({
        x: panRef.current.sx + (e.clientX - panRef.current.cx),
        y: panRef.current.sy + (e.clientY - panRef.current.cy),
      })
    }
    const onUp = (e) => {
      if (!panRef.current || !stageRef.current) return
      setPanPosition(
        panRef.current.sx + (e.clientX - panRef.current.cx),
        panRef.current.sy + (e.clientY - panRef.current.cy),
      )
      panRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [setPanPosition])

  useEffect(() => recenterIfUnset(size.width, size.height), [size.width, size.height, recenterIfUnset])

  const rooms = useMemo(() => detectRooms(walls), [walls])

  // Ghost rooms: the room shapes from the level directly below the active one.
  // Shown as faint dashed outlines so you know where the floor below sits
  // while placing walls on the current level.
  const belowLevelRooms = useMemo(() => {
    const sorted = [...levels].sort((a, b) => a.order - b.order)
    const activeIdx = sorted.findIndex((l) => l.id === activeLevel)
    if (activeIdx <= 0) return [] // ground floor has nothing below
    const belowId = sorted[activeIdx - 1].id
    const belowWalls = allWalls.filter((w) => w.levelId === belowId)
    return detectRooms(belowWalls)
  }, [levels, activeLevel, allWalls])
  // Rotation handle only for a single selected furniture item.
  const singleSel = getSingleItem(selection)
  const selectedFurniture = layers.furniture && singleSel?.kind === 'furniture'
    ? (() => {
        const f = furniture.find((x) => x.id === singleSel.id)
        return f ? resolveRailingMount(f, walls) : null
      })()
    : null
  // Wall reshape handles: only in select mode, for a single selected wall.
  const selectedWall = activeTool === 'select' && layers.walls && singleSel?.kind === 'wall'
    ? walls.find((x) => x.id === singleSel.id) ?? null
    : null
  // Area reshape handles: only in select mode, for a single selected area.
  const selectedArea = activeTool === 'select' && layers.rooms && singleSel?.kind === 'area'
    ? areas.find((x) => x.id === singleSel.id) ?? null
    : null
  const selectedPool = activeTool === 'select' && layers.rooms && singleSel?.kind === 'pool'
    ? pools.find((x) => x.id === singleSel.id) ?? null
    : null

  const snapTarget = cursorWorld
    ? findNearestSnapPoint(cursorWorld, walls, SNAP_RADIUS_SCREEN / view.scale)
    : null
  const snapFn = altDown ? ((_s, e) => e) : shiftDown ? snapTo90 : snapTo45
  const previewEnd = drawStart && cursorWorld
    ? snapTarget ?? snapFn(drawStart, cursorWorld)
    : null

  return (
    <main
      ref={containerRef}
      data-tour="canvas"
      {...dragHandlers}
      className="flex-1 bg-gray-950 overflow-hidden relative"
      style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={(node) => { stageRef.current = node; registerStage(node) }}
          width={size.width} height={size.height}
          scaleX={view.scale} scaleY={view.scale} x={view.x} y={view.y}
          onDragEnd={handleStageDragEnd}
          onWheel={handleWheel(stageRef)}
          onMouseDown={(e) => {
            if (pendingPlacement && e.evt.button === 0) {
              const pos = stageRef.current?.getRelativePointerPosition()
              if (pos) {
                const snapped = snapToGrid(pos, GRID_SIZE)
                // If the type is a known catalog entry, use addFurniture (same
                // path as the sidebar drag) so the pre-built GLB always loads.
                if (getFurnitureSpec(pendingPlacement.type)) {
                  addFurniture(pendingPlacement.type, snapped.x, snapped.y)
                } else {
                  addFurnitureWithSpec(pendingPlacement, snapped.x, snapped.y)
                }
                clearPendingPlacement()
                return
              }
            }
            // Area tool: each background click drops a polygon vertex; clicking
            // back on the first point (or pressing Enter) closes it.
            if (activeTool === 'area' && e.evt.button === 0 && e.target === stageRef.current) {
              const pos = stageRef.current?.getRelativePointerPosition()
              if (pos) {
                const p = { x: snapArea(pos.x), y: snapArea(pos.y) }
                if (areaDraft && areaDraft.length >= 3) {
                  const first = areaDraft[0]
                  if (Math.hypot(p.x - first.x, p.y - first.y) < AREA_CLOSE_PX / view.scale) {
                    finishAreaDraft()
                    return
                  }
                }
                addAreaPoint(p)
              }
              return
            }
            // Pool tool: same polygon flow as Area, for a water basin.
            if (activeTool === 'pool' && e.evt.button === 0 && e.target === stageRef.current) {
              const pos = stageRef.current?.getRelativePointerPosition()
              if (pos) {
                const p = { x: snapArea(pos.x), y: snapArea(pos.y) }
                if (poolDraft && poolDraft.length >= 3) {
                  const first = poolDraft[0]
                  if (Math.hypot(p.x - first.x, p.y - first.y) < AREA_CLOSE_PX / view.scale) {
                    finishPoolDraft()
                    return
                  }
                }
                addPoolPoint(p)
              }
              return
            }
            // Manual pan: in select mode, dragging the stage background pans
            // the canvas. We track this ourselves (instead of Konva draggable)
            // so child-shape click events are never swallowed by Konva's drag.
            if (activeTool === 'select' && e.evt.button === 0 && e.target === stageRef.current) {
              panRef.current = { cx: e.evt.clientX, cy: e.evt.clientY, sx: stageRef.current.x(), sy: stageRef.current.y() }
            }
            handleStageMouseDown(e)
            onMarqueeDown(e)
          }}
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
            {belowLevelRooms.map((room) => (
              <Line
                key={`ghost-${room.id}`}
                points={room.verts.flatMap((v) => [v.x, v.y])}
                closed
                fill="rgba(148,163,184,0.06)"
                stroke="#6b7280"
                strokeWidth={1.5 / view.scale}
                dash={[8 / view.scale, 5 / view.scale]}
                dashEnabled
                listening={false}
              />
            ))}
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
            {layers.rooms && areas.map((a) => {
              const material = a.floorMaterial ? getFloorMaterial(a.floorMaterial) : null
              const fill = material ? materialOverlayFill(material.color) : AREA_DEFAULT_FILL
              return (
                <Room key={`area-${a.id}`}
                  room={{ id: a.id, verts: a.verts, centroid: areaCentroid(a.verts) }}
                  selected={isSelected(selection, 'area', a.id)}
                  fill={fill} listening={activeTool === 'select'} scale={view.scale}
                  name={a.name ?? ''}
                  onSelect={(id) => select('area', id)}
                  onShiftSelect={(id) => addToSelection('area', id)} />
              )
            })}
            {layers.rooms && pools.map((pool) => (
              <Room key={`pool-${pool.id}`}
                room={{ id: pool.id, verts: pool.verts, centroid: areaCentroid(pool.verts) }}
                selected={isSelected(selection, 'pool', pool.id)}
                fill={POOL_FILL} listening={activeTool === 'select'} scale={view.scale}
                name={pool.name ?? ''}
                onSelect={(id) => select('pool', id)}
                onShiftSelect={(id) => addToSelection('pool', id)} />
            ))}
            {layers.walls && walls.map((w) => (
              <Wall key={w.id} wall={w}
                segments={wallSegmentsForRendering(w, layers.openings ? openings : [])}
                selected={isSelected(selection, 'wall', w.id)}
                drawMode={activeTool !== 'select'}
                onClick={(id) => select('wall', id)}
                onShiftSelect={(id) => addToSelection('wall', id)}
                onContextMenu={removeWall} />
            ))}
            {layers.walls && walls.map((w) => (
              <WallLengthLabel key={`len-${w.id}`} wall={w} scale={view.scale} />
            ))}
            {layers.rooms && areas.map((a) => (
              <AreaDimensions key={`dim-${a.id}`} area={a} scale={view.scale} />
            ))}
            {layers.rooms && pools.map((pool) => (
              <AreaDimensions key={`pdim-${pool.id}`} area={pool} scale={view.scale} />
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
            {layers.furniture && furniture.map((raw) => resolveRailingMount(raw, walls)).map((f) => (
              <Furniture key={f.id} item={f} scale={view.scale}
                selected={isSelected(selection, 'furniture', f.id)}
                onSelect={(id) => select('furniture', id)}
                onShiftSelect={(id) => addToSelection('furniture', id)}
                onDragStart={onFurnDragStart}
                onDragEnd={onFurnDragEnd}
                onContextMenu={removeFurniture} />
            ))}
            {selectedFurniture && (
              <ResizeHandle item={selectedFurniture} scale={view.scale}
                lockRatio={lockAspectRatio || shiftDown}
                onResize={(dims) => updateFurniture(selectedFurniture.id, dims)} />
            )}
            {selectedFurniture && (
              <RotationHandle item={selectedFurniture} scale={view.scale}
                onRotate={(deg) => updateFurniture(selectedFurniture.id, { rotation: deg })} />
            )}
            {selectedWall && (
              <WallEditHandles wall={selectedWall} scale={view.scale} onMove={moveWallVertices} />
            )}
            {selectedArea && (
              <AreaEditHandles area={selectedArea} scale={view.scale}
                onMove={(moves) => moveAreaVertices(selectedArea.id, moves)} />
            )}
            {selectedPool && (
              <AreaEditHandles area={selectedPool} scale={view.scale}
                onMove={(moves) => movePoolVertices(selectedPool.id, moves)} />
            )}
            <DragGhost
              ghost={dragGhost ?? (pendingPlacement && cursorWorld ? {
                kind: 'furniture',
                type: pendingPlacement.type,
                x: cursorWorld.x,
                y: cursorWorld.y,
                width: pendingPlacement.width,
                depth: pendingPlacement.depth,
                color: pendingPlacement.color,
              } : null)}
              scale={view.scale}
            />
            {aiProposal && <DiffOverlay diff={aiProposal.diff} scale={view.scale} />}
            {drawStart && previewEnd && <DrawPreview start={drawStart} end={previewEnd} scale={view.scale} />}
            {activeTool === 'area' && <AreaDraftPreview draft={areaDraft} cursor={cursorWorld} scale={view.scale} />}
            {activeTool === 'pool' && <AreaDraftPreview draft={poolDraft} cursor={cursorWorld} scale={view.scale} {...POOL_DRAFT} />}
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
      <HudOverlay view={view} cursor={cursorWorld} drawing={!!drawStart} selection={selection} calibration={calibration} shiftDown={shiftDown} altDown={altDown} />
      {allWalls.length === 0 && allFurniture.length === 0 && allAreas.length === 0 && allPools.length === 0 && !drawStart && !areaDraft && !poolDraft && !underlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-gray-900/70 border border-gray-700 rounded-lg px-6 py-5 max-w-xs text-center backdrop-blur-sm">
            <div className="text-gray-100 text-sm font-semibold mb-3">{t('hud.empty_title')}</div>
            <ol className="text-gray-400 text-xs leading-relaxed space-y-1.5 text-start">
              <li>1 · {t('hud.empty_step1')}</li>
              <li>2 · {t('hud.empty_step2')}</li>
              <li>3 · {t('hud.empty_step3')}</li>
            </ol>
          </div>
        </div>
      )}
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
