import { nanoid } from 'nanoid/non-secure'

// Transient UI state — none of this is persisted. Three concerns share the
// slice because they're all "ephemeral feedback" surfaces:
//   • selection — what's currently focused (wall / furniture / room /
//     underlay), shared across canvas, properties panel, and 3D highlight
//   • dragGhost — the sidebar→canvas drag preview
//   • toast    — single-slot transient notification
export const createUiSlice = (set) => ({
  selection: null,
  select: (kind, id) => set({ selection: kind && id ? { kind, id } : null }),
  clearSelection: () => set({ selection: null }),

  // dragGhost is the transient sidebar→canvas drag preview. `kind` tells
  // the canvas which drop path to take (grid-snap for furniture, wall-snap
  // for openings). `type` is the catalog id within that kind.
  dragGhost: null,
  setDragGhostType: (type, kind = 'furniture') =>
    set({ dragGhost: { kind, type, x: 0, y: 0, wallId: null, position: null } }),
  setDragGhostPos: (x, y, extra = {}) =>
    set((s) => ({ dragGhost: s.dragGhost ? { ...s.dragGhost, x, y, ...extra } : null })),
  clearDragGhost: () => set({ dragGhost: null }),

  toast: null,
  pushToast: (message, kind = 'info') =>
    set({ toast: { id: nanoid(4), message, kind } }),
  dismissToast: () => set({ toast: null }),

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
