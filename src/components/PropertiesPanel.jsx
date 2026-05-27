import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const selection = useStore((s) => s.selection)
  const walls = useStore((s) => s.walls)
  const activeLevel = useStore((s) => s.activeLevel)
  const furniture = useStore((s) => s.furniture)
  const areas = useStore((s) => s.areas)
  const updateArea = useStore((s) => s.updateArea)
  const removeArea = useStore((s) => s.removeArea)
  const pools = useStore((s) => s.pools)
  const updatePool = useStore((s) => s.updatePool)
  const removePool = useStore((s) => s.removePool)
  const voids = useStore((s) => s.voids)
  const updateVoid = useStore((s) => s.updateVoid)
  const removeVoid = useStore((s) => s.removeVoid)
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
  // Detect rooms from the ACTIVE level's walls only, exactly as CanvasArea
  // does. Running detectRooms over every level's walls at once produces
  // different polygon fingerprints (coincident edges from stacked floors),
  // so the clicked room's id wouldn't match and upper-level rooms couldn't
  // be inspected.
  const rooms = useMemo(
    () => (single?.kind === 'room'
      ? detectRooms(walls.filter((w) => !w.levelId || w.levelId === activeLevel))
      : []),
    [walls, activeLevel, single],
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
  } else if (single?.kind === 'area') {
    const a = areas.find((x) => x.id === single.id)
    if (a) body = <AreaProps area={a} onUpdate={updateArea} onRemove={removeArea} />
  } else if (single?.kind === 'pool') {
    const pool = pools.find((x) => x.id === single.id)
    if (pool) body = <PoolProps pool={pool} onUpdate={updatePool} onRemove={removePool} />
  } else if (single?.kind === 'void') {
    const vd = voids.find((x) => x.id === single.id)
    if (vd) body = <VoidProps vd={vd} onUpdate={updateVoid} onRemove={removeVoid} />
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
    <aside data-tour="properties-panel" className="w-56 shrink-0 bg-gray-900 border-s border-gray-700 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-700">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('properties.header')}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-sm">{body}</div>
    </aside>
  )
}

function Empty() {
  const { t } = useTranslation()
  return <p className="text-gray-500 text-xs leading-relaxed">{t('properties.nothing_selected')}</p>
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
  const { t } = useTranslation()
  const area = polygonAreaM2(room.verts)
  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{t('room.title')}</h3>
      <label className="block">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('room.name')}</span>
        <input
          type="text"
          value={meta.name ?? ''}
          onChange={(e) => onUpdate(room.id, { name: e.target.value })}
          placeholder={t('room.name_placeholder')}
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <div className="mt-3" data-tour="material-floor">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">{t('room.floor_material')}</div>
        <MaterialPicker
          materials={FLOOR_MATERIALS}
          currentId={meta.floorMaterial}
          resolveId={resolveFloorMaterialId}
          onChange={(id) => onUpdate(room.id, { floorMaterial: id })}
        />
      </div>
      <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!meta.noCeiling}
          onChange={(e) => onUpdate(room.id, { noCeiling: !e.target.checked })}
          className="accent-blue-500"
        />
        <span className="text-gray-300 text-xs">{t('room.has_ceiling')}</span>
      </label>
      {!meta.noCeiling && (
        <div className="mt-3" data-tour="material-ceiling">
          <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">{t('room.ceiling_material')}</div>
          <MaterialPicker
            materials={CEILING_MATERIALS}
            currentId={meta.ceilingMaterial}
            resolveId={resolveCeilingMaterialId}
            onChange={(id) => onUpdate(room.id, { ceilingMaterial: id })}
          />
        </div>
      )}
      <div className="mt-3">
        <Row label={t('room.area')} value={`${area.toFixed(2)} m²`} />
        <Row label={t('room.vertices')} value={room.verts.length} />
      </div>
    </div>
  )
}

function AreaProps({ area, onUpdate, onRemove }) {
  const { t } = useTranslation()
  const size = polygonAreaM2(area.verts)
  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{t('area.title')}</h3>
      <label className="block">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('area.name')}</span>
        <input
          type="text"
          value={area.name ?? ''}
          onChange={(e) => onUpdate(area.id, { name: e.target.value })}
          placeholder={t('area.name_placeholder')}
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <div className="mt-3">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">{t('area.floor_material')}</div>
        <MaterialPicker
          materials={FLOOR_MATERIALS}
          currentId={area.floorMaterial}
          resolveId={resolveFloorMaterialId}
          onChange={(id) => onUpdate(area.id, { floorMaterial: id })}
        />
      </div>
      <div className="mt-3">
        <Row label={t('area.size')} value={`${Math.abs(size).toFixed(2)} m²`} />
        <Row label={t('area.vertices')} value={area.verts.length} />
      </div>
      <button
        type="button"
        onClick={() => onRemove(area.id)}
        className="mt-3 w-full text-xs font-mono px-2 py-1.5 rounded border border-red-800 bg-red-950 text-red-200 hover:bg-red-900"
      >
        {t('area.delete')}
      </button>
    </div>
  )
}

function PoolProps({ pool, onUpdate, onRemove }) {
  const { t } = useTranslation()
  const size = polygonAreaM2(pool.verts)
  const depth = pool.depth ?? 1.5
  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{t('pool.title')}</h3>
      <label className="block">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('pool.name')}</span>
        <input
          type="text"
          value={pool.name ?? ''}
          onChange={(e) => onUpdate(pool.id, { name: e.target.value })}
          placeholder={t('pool.name_placeholder')}
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <label className="block mt-3">
        <div className="flex justify-between text-[11px] uppercase tracking-wider text-gray-500">
          <span>{t('pool.depth')}</span>
          <span className="font-mono text-gray-300">{depth.toFixed(2)} m</span>
        </div>
        <input
          type="range" min={0.3} max={3} step={0.1}
          value={depth}
          onChange={(e) => onUpdate(pool.id, { depth: parseFloat(e.target.value) })}
          className="mt-1 w-full accent-blue-500"
        />
      </label>
      <div className="mt-3">
        <Row label={t('pool.size')} value={`${Math.abs(size).toFixed(2)} m²`} />
        <Row label={t('pool.vertices')} value={pool.verts.length} />
      </div>
      <button
        type="button"
        onClick={() => onRemove(pool.id)}
        className="mt-3 w-full text-xs font-mono px-2 py-1.5 rounded border border-red-800 bg-red-950 text-red-200 hover:bg-red-900"
      >
        {t('pool.delete')}
      </button>
    </div>
  )
}

function VoidProps({ vd, onUpdate, onRemove }) {
  const { t } = useTranslation()
  const size = polygonAreaM2(vd.verts)
  return (
    <div>
      <h3 className="text-gray-200 text-xs uppercase tracking-widest mb-2">{t('void_region.title')}</h3>
      <label className="block">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('void_region.name')}</span>
        <input
          type="text"
          value={vd.name ?? ''}
          onChange={(e) => onUpdate(vd.id, { name: e.target.value })}
          placeholder={t('void_region.name_placeholder')}
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <div className="mt-3">
        <Row label={t('void_region.size')} value={`${Math.abs(size).toFixed(2)} m²`} />
        <Row label={t('void_region.vertices')} value={vd.verts.length} />
      </div>
      <p className="text-[10px] text-gray-500 mt-2 leading-snug">{t('void_region.hint')}</p>
      <button
        type="button"
        onClick={() => onRemove(vd.id)}
        className="mt-3 w-full text-xs font-mono px-2 py-1.5 rounded border border-red-800 bg-red-950 text-red-200 hover:bg-red-900"
      >
        {t('void_region.delete')}
      </button>
    </div>
  )
}
