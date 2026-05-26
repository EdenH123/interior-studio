import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FURNITURE_MATERIALS, resolveFurnitureMaterialId } from './furnitureMaterials'
import { FLOOR_MATERIALS, resolveFloorMaterialId } from './floorMaterials'
import { CEILING_MATERIALS, resolveCeilingMaterialId } from './ceilingMaterials'
import MaterialPicker from './MaterialPicker'

export default function MultiSelectProps({ items, kind, furniture, updateFurniture, roomMeta, updateRoomMeta }) {
  const { t } = useTranslation()
  const count = items.length

  if (kind === 'furniture') {
    return <MultiFurnitureProps
      ids={items.map((i) => i.id)}
      furniture={furniture}
      updateFurniture={updateFurniture}
    />
  }

  if (kind === 'room') {
    return <MultiRoomProps
      ids={items.map((i) => i.id)}
      roomMeta={roomMeta ?? {}}
      updateRoomMeta={updateRoomMeta ?? (() => {})}
    />
  }

  const breakdown = items.reduce((acc, { kind: k }) => {
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <p className="text-gray-400 text-xs mb-3">{t('multiselect.items_selected', { count })}</p>
      <div className="space-y-1">
        {Object.entries(breakdown).map(([k, n]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-gray-500 capitalize">{k}s</span>
            <span className="text-gray-300 font-mono">{n}</span>
          </div>
        ))}
      </div>
      <p className="text-gray-600 text-[11px] mt-3">{t('multiselect.same_type_hint')}</p>
    </div>
  )
}

function MultiRoomProps({ ids, roomMeta, updateRoomMeta }) {
  const { t } = useTranslation()
  const floorMats = ids.map((id) => roomMeta[id]?.floorMaterial ?? null)
  const ceilMats  = ids.map((id) => roomMeta[id]?.ceilingMaterial ?? null)
  const commonFloor = floorMats.every((m) => m === floorMats[0]) ? floorMats[0] : undefined
  const commonCeil  = ceilMats.every((m)  => m === ceilMats[0])  ? ceilMats[0]  : undefined

  return (
    <div>
      <p className="text-gray-400 text-xs mb-3">{t('multiselect.rooms_count', { count: ids.length })}</p>
      <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">{t('multiselect.floor_material_all')}</div>
      <MaterialPicker
        materials={FLOOR_MATERIALS}
        currentId={commonFloor === undefined ? null : commonFloor}
        resolveId={resolveFloorMaterialId}
        onChange={(matId) => ids.forEach((roomId) => updateRoomMeta(roomId, { floorMaterial: matId }))}
      />
      <div className="mt-3">
        <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">{t('multiselect.ceiling_material_all')}</div>
        <MaterialPicker
          materials={CEILING_MATERIALS}
          currentId={commonCeil === undefined ? null : commonCeil}
          resolveId={resolveCeilingMaterialId}
          onChange={(matId) => ids.forEach((roomId) => updateRoomMeta(roomId, { ceilingMaterial: matId }))}
        />
      </div>
    </div>
  )
}

function MultiFurnitureProps({ ids, furniture, updateFurniture }) {
  const { t } = useTranslation()
  const furnitureItems = ids.map((id) => furniture.find((f) => f.id === id)).filter(Boolean)
  const rotations = [...new Set(furnitureItems.map((f) => f.rotation))]
  const [rotInput, setRotInput] = useState(rotations.length === 1 ? String(rotations[0]) : '')
  const materials = [...new Set(furnitureItems.map((f) => f.material ?? null))]
  const commonMaterial = materials.length === 1 ? materials[0] : undefined

  const applyRotation = (raw) => {
    const deg = parseInt(raw, 10)
    if (!isNaN(deg)) {
      const norm = ((deg % 360) + 360) % 360
      furnitureItems.forEach((f) => updateFurniture(f.id, { rotation: norm }))
      setRotInput(String(norm))
    }
  }

  const alignActions = [
    { labelKey: 'align_left',  titleEn: 'Align left edges',    fn: () => { const minX = Math.min(...furnitureItems.map(f => f.x)); furnitureItems.forEach(f => updateFurniture(f.id, { x: minX })) } },
    { labelKey: 'align_ctr_x', titleEn: 'Center horizontally', fn: () => { const avgX = furnitureItems.reduce((s, f) => s + f.x, 0) / furnitureItems.length; furnitureItems.forEach(f => updateFurniture(f.id, { x: avgX })) } },
    { labelKey: 'align_right', titleEn: 'Align right edges',   fn: () => { const maxX = Math.max(...furnitureItems.map(f => f.x)); furnitureItems.forEach(f => updateFurniture(f.id, { x: maxX })) } },
    { labelKey: 'align_top',   titleEn: 'Align top edges',     fn: () => { const minY = Math.min(...furnitureItems.map(f => f.y)); furnitureItems.forEach(f => updateFurniture(f.id, { y: minY })) } },
    { labelKey: 'align_ctr_y', titleEn: 'Center vertically',   fn: () => { const avgY = furnitureItems.reduce((s, f) => s + f.y, 0) / furnitureItems.length; furnitureItems.forEach(f => updateFurniture(f.id, { y: avgY })) } },
    { labelKey: 'align_bot',   titleEn: 'Align bottom edges',  fn: () => { const maxY = Math.max(...furnitureItems.map(f => f.y)); furnitureItems.forEach(f => updateFurniture(f.id, { y: maxY })) } },
  ]

  return (
    <div>
      <p className="text-gray-400 text-xs mb-3">{t('multiselect.furniture_count', { count: ids.length })}</p>
      {furnitureItems.length >= 2 && (
        <div className="mb-3">
          <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">{t('multiselect.align')}</div>
          <div className="grid grid-cols-3 gap-1">
            {alignActions.map(({ labelKey, titleEn, fn }) => (
              <button key={labelKey} title={titleEn} onClick={fn}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] py-1 px-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
              >
                {t(`multiselect.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="block mb-3">
        <span className="text-gray-500 text-[11px] uppercase tracking-wider">{t('multiselect.rotation_all')}</span>
        <input
          type="number"
          value={rotInput}
          onChange={(e) => setRotInput(e.target.value)}
          onBlur={(e) => applyRotation(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyRotation(e.target.value) }}
          placeholder={rotations.length > 1 ? t('multiselect.mixed') : '0'}
          dir="ltr"
          className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <div className="text-gray-500 text-[11px] uppercase tracking-wider mb-1">{t('multiselect.material_all')}</div>
      <MaterialPicker
        materials={FURNITURE_MATERIALS}
        currentId={commonMaterial === undefined ? null : commonMaterial}
        resolveId={resolveFurnitureMaterialId}
        onChange={(id) => furnitureItems.forEach((f) => updateFurniture(f.id, { material: id }))}
      />
    </div>
  )
}
