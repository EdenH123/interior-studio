import { useState } from 'react'
import useStore from '../store/useStore'

// Collapsible levels panel shown in the sidebar.
// Lists floors sorted by order; click to activate, double-click name to rename,
// edit height inline, add/remove levels with + and × controls.
export default function LevelsPanel() {
  const [open, setOpen] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const levels = useStore((s) => s.levels)
  const activeLevel = useStore((s) => s.activeLevel)
  const setActiveLevel = useStore((s) => s.setActiveLevel)
  const addLevel = useStore((s) => s.addLevel)
  const removeLevel = useStore((s) => s.removeLevel)
  const renameLevel = useStore((s) => s.renameLevel)
  const setLevelHeight = useStore((s) => s.setLevelHeight)

  const sorted = [...levels].sort((a, b) => a.order - b.order)

  function startRename(lv) {
    setEditingId(lv.id)
    setEditingName(lv.name)
  }

  function commitRename() {
    if (editingId && editingName.trim()) renameLevel(editingId, editingName.trim())
    setEditingId(null)
  }

  function cancelRename() {
    setEditingId(null)
  }

  function handleNameKeyDown(e) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') cancelRename()
  }

  function handleHeightChange(id, raw) {
    const val = parseFloat(raw)
    if (!isNaN(val)) setLevelHeight(id, val)
  }

  return (
    <div className="border-b border-gray-700 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors"
        title="Switch between floors — click a level to make it active, double-click name to rename"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Levels</span>
        <span className="flex items-center gap-2">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); addLevel() }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); addLevel() } }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 leading-none"
          >
            +
          </span>
          <span className="text-gray-600 text-[10px]">{open ? '▾' : '▸'}</span>
        </span>
      </button>

      {open && (
        <div className="pb-2 max-h-36 overflow-y-auto">
          {sorted.length === 1 && (
            <p className="px-4 pt-1 pb-0 text-[10px] text-gray-600 font-mono leading-snug">
              Single floor · press + to add a level
            </p>
          )}
          {sorted.map((lv) => {
            const isActive = lv.id === activeLevel
            const isEditing = editingId === lv.id
            return (
              <div
                key={lv.id}
                onClick={() => setActiveLevel(lv.id)}
                className={`flex items-center gap-1 px-3 py-1 cursor-pointer transition-colors ${
                  isActive ? 'bg-blue-500/10' : 'hover:bg-gray-800'
                }`}
              >
                {/* Name — normal or rename input */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={handleNameKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-gray-800 border border-blue-500 rounded px-1 text-xs text-gray-200 focus:outline-none"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => { e.stopPropagation(); startRename(lv) }}
                      className={`text-xs truncate block ${
                        isActive ? 'text-blue-300' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {lv.name}
                    </span>
                  )}
                </div>

                {/* Height input */}
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={lv.height}
                  onChange={(e) => handleHeightChange(lv.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-12 bg-transparent border border-gray-700 rounded px-1 text-[10px] font-mono text-gray-400 focus:border-blue-500 focus:outline-none text-right"
                  title="Height (m)"
                />
                <span className="text-[9px] text-gray-600">m</span>

                {/* Remove button — hidden when only 1 level */}
                {levels.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeLevel(lv.id) }}
                    className="text-gray-600 hover:text-red-400 text-xs leading-none ml-0.5 shrink-0"
                    title="Remove level"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
