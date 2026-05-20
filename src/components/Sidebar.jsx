import { CATEGORIES, FURNITURE } from './canvas/furnitureCatalog'
import { OPENINGS, OPENING_DRAG_MIME } from './canvas/openingsCatalog'
import useStore from '../store/useStore'
import LayersPanel from './LayersPanel'
import LevelsPanel from './LevelsPanel'

export const FURNITURE_DRAG_MIME = 'application/x-interior-studio-furniture'

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-700">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Elements</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <OpeningsGroup />
        {CATEGORIES.map((cat) => (
          <CategoryGroup
            key={cat}
            name={cat}
            items={FURNITURE.filter((f) => f.category === cat)}
          />
        ))}
      </div>
      <LevelsPanel />
      <LayersPanel />
      <div className="px-3 py-2 border-t border-gray-700 text-[11px] text-gray-500 font-mono leading-snug">
        drag a tile onto the canvas to place
      </div>
    </aside>
  )
}

function CategoryGroup({ name, items }) {
  return (
    <div>
      <div className="px-1 pb-1 text-[10px] uppercase tracking-widest text-gray-500">{name}</div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <CatalogTile key={item.type} item={item} />
        ))}
      </div>
    </div>
  )
}

function OpeningsGroup() {
  return (
    <div>
      <div className="px-1 pb-1 text-[10px] uppercase tracking-widest text-gray-500">Openings</div>
      <div className="grid grid-cols-2 gap-2">
        {OPENINGS.map((o) => <OpeningTile key={o.type} item={o} />)}
      </div>
      <div className="px-1 pt-1 text-[10px] text-gray-500 font-mono leading-snug">
        drop on a wall — snaps automatically
      </div>
    </div>
  )
}

function CatalogTile({ item }) {
  const setDragGhostType = useStore((s) => s.setDragGhostType)
  const clearDragGhost = useStore((s) => s.clearDragGhost)

  const handleDragStart = (e) => {
    e.dataTransfer.setData(FURNITURE_DRAG_MIME, item.type)
    e.dataTransfer.effectAllowed = 'copy'
    setDragGhostType(item.type, 'furniture')
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={clearDragGhost}
      className="bg-gray-800 border border-gray-700 rounded p-2 cursor-grab active:cursor-grabbing hover:border-gray-500 transition-colors select-none"
      title={`${item.label} — ${item.width.toFixed(2)} × ${item.depth.toFixed(2)} m`}
    >
      <TileGlyph item={item} />
      <div className="mt-1 text-[11px] text-gray-300 truncate">{item.label}</div>
      <div className="text-[10px] text-gray-500 font-mono">
        {item.width.toFixed(2)}×{item.depth.toFixed(2)}m
      </div>
    </div>
  )
}

function OpeningTile({ item }) {
  const setDragGhostType = useStore((s) => s.setDragGhostType)
  const clearDragGhost = useStore((s) => s.clearDragGhost)

  const handleDragStart = (e) => {
    e.dataTransfer.setData(OPENING_DRAG_MIME, item.type)
    e.dataTransfer.effectAllowed = 'copy'
    setDragGhostType(item.type, 'opening')
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={clearDragGhost}
      className="bg-gray-800 border border-gray-700 rounded p-2 cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors select-none"
      title={`${item.label} — ${item.width.toFixed(2)} × ${item.height.toFixed(2)} m`}
    >
      <OpeningGlyph type={item.type} />
      <div className="mt-1 text-[11px] text-gray-300 truncate">{item.label}</div>
      <div className="text-[10px] text-gray-500 font-mono">
        {item.width.toFixed(2)}×{item.height.toFixed(2)}m
      </div>
    </div>
  )
}

function TileGlyph({ item }) {
  if (item.type.startsWith('lighting:')) return <LightTileGlyph color={item.color} />
  const aspect = item.width / item.depth
  const boxW = aspect >= 1 ? 36 : 36 * aspect
  const boxH = aspect >= 1 ? 36 / aspect : 36
  return (
    <div className="h-10 flex items-center justify-center">
      <div style={{ width: boxW, height: boxH, background: item.color }}
        className="rounded-sm border border-black/30" />
    </div>
  )
}

function LightTileGlyph({ color }) {
  const spokes = 8
  return (
    <div className="h-10 flex items-center justify-center">
      <svg width="36" height="36" viewBox="-18 -18 36 36">
        {Array.from({ length: spokes }, (_, i) => {
          const a = (i / spokes) * Math.PI * 2
          return (
            <line key={i}
              x1={Math.cos(a) * 8} y1={Math.sin(a) * 8}
              x2={Math.cos(a) * 13} y2={Math.sin(a) * 13}
              stroke={color} strokeWidth="1.5" opacity="0.8"
            />
          )
        })}
        <circle r="6" fill={color} opacity="0.9" />
      </svg>
    </div>
  )
}

function OpeningGlyph({ type }) {
  // Tiny iconographic preview — door = inset gap + arc, window = double line.
  return (
    <div className="h-10 flex items-center justify-center">
      <svg width="44" height="28" viewBox="0 0 44 28" className="text-gray-300">
        {/* wall stubs */}
        <line x1="0" y1="14" x2="8" y2="14" stroke="currentColor" strokeWidth="3" />
        <line x1="36" y1="14" x2="44" y2="14" stroke="currentColor" strokeWidth="3" />
        {type === 'door' ? (
          <>
            <line x1="8" y1="14" x2="8" y2="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 8 14 A 28 28 0 0 1 36 14" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          </>
        ) : (
          <>
            <line x1="8" y1="11" x2="36" y2="11" stroke="currentColor" strokeWidth="1" />
            <line x1="8" y1="17" x2="36" y2="17" stroke="currentColor" strokeWidth="1" />
          </>
        )}
      </svg>
    </div>
  )
}
