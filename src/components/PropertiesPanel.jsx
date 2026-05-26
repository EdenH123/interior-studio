import { useMemo } from 'react'
import useStore from '../store/useStore'
import { getSingleItem, selectionItems, commonKind } from '../store/selectionHelpers'
import { detectRooms, polygonAreaM2 } from './canvas/roomDetection'
import { FLOOR_MATERIALS, resolveFloorMaterialId } from './canvas/floorMaterials'
import { CEILING_MATERIALS, resolveCeilingMaterialId } from './canvas/ceilingMaterials'
import UnderlayProps from './canvas/UnderlayProps'
import WallProps from './canvas/WallProps'
import FurnitureProps from './canvas/FurnitureProps'
import OpeningProps from './canvas/OpeningProps'
import MultiSelectProps from './canvas/MultiSelectProps'
import MaterialPicker from './canvas/MaterialPicker'
import LightingProps from './canvas/LightingProps'
import StairProps from './canvas/StairProps'

// Thin router: looks at `selection` and renders the matching per-kind
// editor. Each editor lives in its own file under `canvas/` (paired with
// the corresponding shape component). `RoomProps` is the lone holdout
// still inline — it's specific to detected polygons which only exist in
// this file's `detectRooms(walls)` derivation.
export default function PropertiesPanel() {
  const selection = useStore((s) => s.selection)
  const walls = useStore((s) => s.walls)
  const furniture = useStore((s) => s.furniture)
  const roomMeta = useStore((s) => s.roomMeta)
  const updateRoomMeta = useStore((s) => s.updateRoomMeta)
  const updateWall = useStore((s) => s.updateWall)
  const updateFurniture = useStore((s) => s.updateFurniture)
  const openings = useStore((s) => s.openings)
  const updateOpening = useStore((s) => s.updateOpening)
  const pushToast = useStore((s) => s.pushToast)
  const underlay = useStore((s) => s.underlay)
  const updateUnderlay = useStore((s) => s.updateUnderlay)
  const clearUnderlay = useStore((s) => s.clearUnderlay)
  const startCalibration = useStore((s) => s.startCalibration)
  const calibration = useStore((s) => s.calibration)

  const items = selectionItems(selection)
  const single = getSingleItem(selection)
  const rooms = useMemo(
    () => (single?.kind === 'room' ? detectRooms(walls) : []),
    [walls, single],
  )

  let body = <Empty />
  if (items.length > 1) {
    body = <MultiSelectProps
      items={items}
      kind={commonKind(selection)}
      furniture={furniture}
      updateFurniture={updateFurniture}
      roomMeta={roomMeta}
      updateRoomMeta={updateRoomMeta}
    />
  } else if (single?.kind === 'wall') {
    const w = walls.find((x) => x.id === single.id)
    if (w) body = <WallProps key={w.id} wall={w} onUpdate={updateWall} />
  } else if (single?.kind === 'furniture') {
    const f = furniture.find((x) => x.id === single.id)
    if (f) {
      body = f.type?.startsWith('lighting:')
        ? <LightingProps item={f} onUpdate={updateFurniture} />
        : f.stairStyle != null
          ? <StairProps item={f} onUpdate={updateFurniture} />
          : <FurnitureProps item={f} onUpdate={updateFurniture} />
    }
  } else if (single?.kind === 'room') {
    const r = rooms.find((x) => x.id === single.id)
    if (r) body = <RoomProps room={r} meta={roomMeta[r.id] ?? {}} onUpdate={updateRoomMeta} />
  } else if (single?.kind === 'opening') {
    const o = openings.find((x) => x.id === single.id)
    const wall = o ? walls.find((w) => w.id === o.wallId) : null
    if (o && wall) body = <OpeningProps opening={o} wall={wall} onUpdate={updateOpening} pushToast={pushToast} />
  } else if (single?.kind === 'underlay' && underlay) {
    body = <UnderlayProps underlay={underlay} updateUnderlay={updateUnderlay}
      clearUnderlay={clearUnderlay} startCalibration={startCalibration}
      calibrating={!!calibration} />
  }

  return (
    <aside data-tour="properties-panel" className="w-56 shrink-0 bg-gray-900 border-l border-gray-700 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-700">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Properties</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-sm">{body}</div>
    </aside>
  )
}

function Empty() {
  return <p className="text-gray-500 text-xs leading-relaxed">Nothing selected. Click a wall, opening, furniture item, room, or underlay (via the toolbar).</p>
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-500 text-[11px] uppercase tracking-wider">{label}</span>
      <span className="text-gray-200 font-mono text-[12px]">{value}</span>
    </div>
  )
}

function RoomProps({ room, meta, onUpdate }) {
  const area = polygonAreaM2(room.verts)
  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">Room</h3>
      <label className="block">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">Name</span>
        <input
          type="text"
          value={meta.name ?? ''}
          onChange={(e) => onUpdate(room.id, { name: e.target.value })}
          placeholder="Untitled"
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <div className="mt-3" data-tour="material-floor">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">Floor material</div>
        <MaterialPicker
          materials={FLOOR_MATERIALS}
          currentId={meta.floorMaterial}
          resolveId={resolveFloorMaterialId}
          onChange={(id) => onUpdate(room.id, { floorMaterial: id })}
        />
      </div>
      <div className="mt-3" data-tour="material-ceiling">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">Ceiling material</div>
        <MaterialPicker
          materials={CEILING_MATERIALS}
          currentId={meta.ceilingMaterial}
          resolveId={resolveCeilingMaterialId}
          onChange={(id) => onUpdate(room.id, { ceilingMaterial: id })}
        />
      </div>
      <div className="mt-3">
        <Row label="Area" value={`${area.toFixed(2)} m²`} />
        <Row label="Vertices" value={room.verts.length} />
      </div>
    </div>
  )
}
