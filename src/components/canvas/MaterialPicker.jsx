import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Swatch from './Swatch'

// Categorised material picker shared by Wall / Room / Furniture editors.
//
// Renders a "Default" swatch first, then one labelled grid per category
// (Benjamin Moore / Sherwin-Williams / Wood Finish / Fabric / Other).
// When at least one category has more than 10 entries, a search box
// appears at the top filtering by material name OR paint code.
//
// Props:
//   materials   Array<{ id, label, color, category?, code? }>
//   currentId   The currently-selected material id, or null/undefined for "default"
//   resolveId   Optional function to normalise legacy ids before comparison
//               (so a stored legacy id still highlights its new equivalent)
//   defaultLabel  Label for the "no material" swatch (e.g. 'Default')
//   onChange    (id | null) => void
const SEARCH_THRESHOLD = 10

export default function MaterialPicker({
  materials,
  currentId,
  resolveId,
  defaultLabel,
  onChange,
}) {
  const { t } = useTranslation()
  const groups = useMemo(() => groupByCategory(materials), [materials])
  const resolvedDefaultLabel = defaultLabel ?? t('material_picker.default')
  const showSearch = useMemo(
    () => Object.values(groups).some((g) => g.length > SEARCH_THRESHOLD),
    [groups],
  )

  const [query, setQuery] = useState('')

  const resolved = resolveId ? resolveId(currentId) : currentId

  const filtered = useMemo(() => {
    if (!query.trim()) return groups
    const q = query.trim().toLowerCase()
    return Object.fromEntries(
      Object.entries(groups).map(([cat, items]) => [
        cat,
        items.filter(
          (m) =>
            m.label.toLowerCase().includes(q) ||
            (m.code ? m.code.toLowerCase().includes(q) : false),
        ),
      ]),
    )
  }, [groups, query])

  return (
    <div>
      {showSearch && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('material_picker.search_placeholder')}
          className="w-full mb-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-[12px] focus:border-blue-500 focus:outline-none"
        />
      )}
      <div className="grid grid-cols-3 gap-1.5">
        <Swatch
          label={resolvedDefaultLabel}
          color={null}
          active={!resolved}
          onClick={() => onChange(null)}
        />
      </div>
      <div className="max-h-72 overflow-y-auto pr-1 mt-2">
        {Object.entries(filtered).map(([category, items]) =>
          items.length === 0 ? null : (
            <div key={category} className="mt-3 first:mt-0">
              <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
                {category}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {items.map((m) => (
                  <Swatch
                    key={m.id}
                    label={m.label}
                    color={m.color}
                    active={resolved === m.id}
                    title={m.code ? `${m.label} · ${m.code}` : m.label}
                    onClick={() => onChange(m.id)}
                  />
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function groupByCategory(materials) {
  const groups = {}
  for (const m of materials) {
    const cat = m.category ?? 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(m)
  }
  return groups
}
