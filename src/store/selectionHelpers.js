// Helpers for the multi-item selection model.
// Selection shape: { items: [{ kind, id }, ...] } | null
//
// Use these instead of reading selection.kind / selection.id directly —
// they handle the multi-item shape and return sane defaults.

export function selectionItems(selection) {
  return selection?.items ?? []
}

// True if the given { kind, id } pair is anywhere in the selection.
export function isSelected(selection, kind, id) {
  return selectionItems(selection).some((i) => i.kind === kind && i.id === id)
}

// Returns the sole selected item when exactly one is selected, else null.
// Use for single-select code paths (Properties routing, rotation handle, etc.)
export function getSingleItem(selection) {
  const items = selectionItems(selection)
  return items.length === 1 ? items[0] : null
}

// Returns the kind string when ALL selected items share the same kind, else null.
export function commonKind(selection) {
  const items = selectionItems(selection)
  if (!items.length) return null
  const kinds = new Set(items.map((i) => i.kind))
  return kinds.size === 1 ? [...kinds][0] : null
}
