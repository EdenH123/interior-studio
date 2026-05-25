import { nanoid } from 'nanoid/non-secure'

// Transient UI state — none of this is persisted. Three concerns share the
// slice because they're all "ephemeral feedback" surfaces:
//   • selection — multi-item selection ({ items: [{kind, id}, ...] } | null)
//   • dragGhost — the sidebar→canvas drag preview
//   • toast    — single-slot transient notification
export const createUiSlice = (set) => ({
  // Multi-item selection. Shape: { items: [{ kind, id }, ...] } | null
  selection: null,

  // Replace entire selection with one item (normal click).
  // Passing null/falsy kind or id clears the selection.
  select: (kind, id) =>
    set({ selection: kind && id ? { items: [{ kind, id }] } : null }),

  clearSelection: () => set({ selection: null }),

  // Toggle one item in/out of the selection (Shift+click).
  addToSelection: (kind, id) =>
    set((s) => {
      const items = s.selection?.items ?? []
      const idx = items.findIndex((i) => i.kind === kind && i.id === id)
      if (idx >= 0) {
        const next = items.filter((_, i) => i !== idx)
        return { selection: next.length ? { items: next } : null }
      }
      return { selection: { items: [...items, { kind, id }] } }
    }),

  // Replace selection with an arbitrary list (marquee, select-all).
  setSelectionItems: (items) =>
    set({ selection: items.length ? { items } : null }),

  // dragGhost is the transient sidebar→canvas drag preview. `kind` tells
  // the canvas which drop path to take (grid-snap for furniture, wall-snap
  // for openings). `type` is the catalog id within that kind.
  dragGhost: null,
  setDragGhostType: (type, kind = 'furniture') =>
    set({ dragGhost: { kind, type, x: 0, y: 0, wallId: null, position: null } }),
  // Used for custom imported models whose dims aren't in the catalog.
  setDragGhostCustom: ({ width, depth, height, color }) =>
    set({ dragGhost: { kind: 'furniture', type: 'custom', width, depth, height, color, x: 0, y: 0 } }),
  setDragGhostPos: (x, y, extra = {}) =>
    set((s) => ({ dragGhost: s.dragGhost ? { ...s.dragGhost, x, y, ...extra } : null })),
  clearDragGhost: () => set({ dragGhost: null }),

  toast: null,
  pushToast: (message, kind = 'info') =>
    set({ toast: { id: nanoid(4), message, kind } }),
  dismissToast: () => set({ toast: null }),

  // pendingPlacement is set when the user clicks "Place on canvas" in the
  // IKEA search UI. It holds the spec for the item to drop. The canvas shows
  // a footprint ghost following the cursor; clicking places the item.
  pendingPlacement: null,
  setPendingPlacement: (spec) => set({ pendingPlacement: spec }),
  clearPendingPlacement: () => set({ pendingPlacement: null }),

  // Clipboard for copy/paste. Session-only — not persisted across reloads.
  // Shape: [{ kind: 'furniture' | 'wall' | 'opening', item: {...} }] | null
  clipboard: null,
  setClipboard: (items) => set({ clipboard: items }),
  clearClipboard: () => set({ clipboard: null }),

  // Whether the W/D/H dimension inputs + corner-drag resize handle should
  // maintain the item's aspect ratio. Defaults to true. Not persisted.
  lockAspectRatio: true,
  setLockAspectRatio: (val) => set({ lockAspectRatio: val }),

  // Keyboard shortcuts cheat-sheet overlay.
  showShortcuts: false,
  toggleShortcuts: () => set((s) => ({ showShortcuts: !s.showShortcuts })),
  closeShortcuts: () => set({ showShortcuts: false }),

  // AI panel takes over the right-hand slot when open (replaces
  // PropertiesPanel). Not persisted — opening on each fresh session is fine.
  aiPanelOpen: false,
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  closeAiPanel: () => set({ aiPanelOpen: false }),

  // Active AI proposal awaiting apply/discard. Shape:
  //   { proposed: { walls, furniture, roomMeta }, diff: { walls, furniture, roomMeta } }
  // Lives in the store so CanvasArea's DiffOverlay can read it without
  // prop-threading. Transient — not persisted, not tracked by undo (the
  // *apply* is what counts as a history step, not the preview itself).
  aiProposal: null,
  setAiProposal: (proposal) => set({ aiProposal: proposal }),
  discardAiProposal: () => set({ aiProposal: null }),
})
