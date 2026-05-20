// Module-level holder for the live Konva Stage so non-canvas components
// (Toolbar's "Export PNG" handler) can reach `stage.toDataURL(...)`
// without props-threading the ref through App.jsx, and without storing
// imperative handles in Zustand.
//
// CanvasArea registers via the Stage's `ref` callback (handles mount,
// unmount, and HMR remount automatically — Konva passes `null` on
// unmount). Read-side callers should null-check.

let stage = null

export function registerStage(s) { stage = s }
export function getStage() { return stage }
